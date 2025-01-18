import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import os from 'os';

const fsPromises = fs.promises;
const execPromise = util.promisify(exec);

/**
 * @typedef {Object} SVGOptions
 * @property {number} scale - Facteur d'échelle pour le SVG
 * @property {boolean} optimization - Active l'optimisation du SVG
 * @property {string} [className] - Classe CSS optionnelle à ajouter
 */

/**
 * @typedef {Object} TikzConfig
 * @property {string} preamble - Préambule LaTeX personnalisé
 * @property {string} packages - Packages LaTeX supplémentaires
 * @property {SVGOptions} svgOptions - Options pour la conversion SVG
 */

/** @type {TikzConfig} */
const defaultConfig = {
  preamble: `
    \\usetikzlibrary{arrows,shapes,backgrounds,patterns}
    \\usetikzlibrary{positioning}
    \\usetikzlibrary{calc}
    \\usetikzlibrary{arrows.meta}
    \\usetikzlibrary{patterns}
    \\usetikzlibrary{fit}
    \\usetikzlibrary{shapes.geometric}
  `,
  packages: `
    \\usepackage{pgfplots}
    \\usepackage{tikz-cd}
    \\usepackage{circuitikz}
    \\pgfplotsset{compat=1.18}
  `,
  svgOptions: {
    scale: 1,
    optimization: true
  }
};

/**
 * @typedef {Object} DependencyCheckResult
 * @property {boolean} success
 * @property {string} [converter]
 * @property {string} [error]
 */

/**
 * Vérifie les dépendances système
 * @returns {Promise<DependencyCheckResult>}
 */
async function checkDependencies() {
  try {
    await execPromise('pdflatex --version');
    try {
      await execPromise('pdf2svg --version');
      return { success: true, converter: 'pdf2svg' };
    } catch {
      try {
        await execPromise('dvisvgm --version');
        return { success: true, converter: 'dvisvgm' };
      } catch {
        return { 
          success: false, 
          error: 'Aucun convertisseur SVG trouvé. Installez pdf2svg ou dvisvgm.'
        };
      }
    }
  } catch {
    return { 
      success: false, 
      error: 'pdflatex non trouvé. Veuillez installer une distribution TeX.'
    };
  }
}

/**
 * Crée un document LaTeX complet
 * @param {string} tikzContent 
 * @param {TikzConfig} config 
 * @returns {string}
 */
function createTexDocument(tikzContent, config) {
  return `\\documentclass[crop,tikz]{standalone}
${config.packages}
\\usepackage{tikz}
${config.preamble}
\\begin{document}
\\begin{tikzpicture}
${tikzContent}
\\end{tikzpicture}
\\end{document}`;
}

/**
 * Optimise le SVG généré
 * @param {string} svgContent 
 * @param {SVGOptions} options 
 * @returns {string}
 */
function optimizeSvg(svgContent, options) {
  const scale = options.scale ?? 1;
  let optimized = svgContent
    .replace(/<\?xml.*?\?>\s*/s, '')
    .replace(/<!--.*?-->\s*/sg, '')
    .replace(/<!DOCTYPE.*?>\s*/s, '')
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><');

  if (scale !== 1) {
    optimized = optimized.replace(
      /<svg([^>]*)>/,
      `<svg$1 style="transform: scale(${scale});">`
    );
  }

  if (options.className) {
    optimized = optimized.replace(
      /<svg([^>]*)>/,
      `<svg$1 class="${options.className}">`
    );
  }

  return optimized;
}

/**
 * Extrait les erreurs du log LaTeX
 * @param {string} logPath 
 * @returns {Promise<string>}
 */
async function extractTeXError(logPath) {
  try {
    const logContent = await fsPromises.readFile(logPath, 'utf8');
    
    // Recherche différents types d'erreurs
    const errors = [];
    
    // Erreurs critiques
    const criticalErrors = logContent.match(/^!(.*?)(?=[\r\n])/gm);
    if (criticalErrors) {
      errors.push(...criticalErrors);
    }

    // Erreurs de package
    const packageErrors = logContent.match(/^Package \w+ Error:(.*?)(?=[\r\n])/gm);
    if (packageErrors) {
      errors.push(...packageErrors);
    }

    // Undefined control sequences
    const undefinedControls = logContent.match(/Undefined control sequence\.(.*?)(?=[\r\n])/gm);
    if (undefinedControls) {
      errors.push(...undefinedControls);
    }

    if (errors.length === 0 && !logContent.includes('Output written on')) {
      const lastLines = logContent.split('\n').slice(-20).join('\n');
      errors.push('Erreur de compilation non spécifiée. Dernières lignes du log:', lastLines);
    }

    return errors.join('\n');
  } catch (error) {
    return `Impossible de lire le fichier log: ${error.message}`;
  }
}

/**
 * Convertit un bloc TikZ en SVG
 * @param {string} tikzContent 
 * @param {TikzConfig} config 
 * @param {string} [outputPath] 
 * @returns {Promise<string>}
 */
async function convertTikzToSVG(tikzContent, config = defaultConfig, outputPath = null) {
  let tmpDir = null;
  
  try {
    const deps = await checkDependencies();
    if (!deps.success) {
      throw new Error(deps.error);
    }

    tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'tikz-'));
    const texFile = path.join(tmpDir, 'figure.tex');
    const texContent = createTexDocument(tikzContent, config);

    await fsPromises.writeFile(texFile, texContent, 'utf8');
    console.log(`LaTeX file written to ${texFile}`);

    // Compilation LaTeX
    try {
      const { stdout, stderr } = await execPromise(
        `pdflatex -interaction=nonstopmode -file-line-error -output-directory=${tmpDir} ${texFile}`
      );
      if (stderr) console.error('LaTeX stderr:', stderr);
    } catch (texError) {
      const logPath = path.join(tmpDir, 'figure.log');
      const errorDetails = await extractTeXError(logPath);
      throw new Error(`LaTeX Error:\n${errorDetails}`);
    }

    const pdfFile = path.join(tmpDir, 'figure.pdf');
    if (!fs.existsSync(pdfFile)) {
      throw new Error('PDF file was not generated');
    }

    const svgFile = outputPath || path.join(tmpDir, 'figure.svg');
    
    // Conversion PDF vers SVG
    try {
      if (deps.converter === 'pdf2svg') {
        await execPromise(`pdf2svg ${pdfFile} ${svgFile}`);
      } else {
        await execPromise(`dvisvgm --pdf ${pdfFile} -o ${svgFile}`);
      }
    } catch (convError) {
      throw new Error(`SVG conversion error: ${convError.message}`);
    }

    const svgContent = await fsPromises.readFile(svgFile, 'utf8');
    return config.svgOptions.optimization 
      ? optimizeSvg(svgContent, config.svgOptions) 
      : svgContent;

  } catch (error) {
    throw error;
  } finally {
    if (tmpDir && !outputPath) {
      try {
        await fsPromises.rm(tmpDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
    }
  }
}

/**
 * @typedef {Object} TikzBlock
 * @property {string} original - Le bloc TikZ original
 * @property {string} svg - Le SVG généré
 */

/**
 * Extrait et convertit tous les blocs TikZ d'un document
 * @param {string} latex 
 * @param {TikzConfig} [config] 
 * @returns {Promise<TikzBlock[]>}
 */
async function extractAndConvertTikzBlocks(latex, config = defaultConfig) {
  const blocks = [];
  const regex = /\\begin{tikzpicture}([\s\S]*?)\\end{tikzpicture}/g;
  
  let match;
  while ((match = regex.exec(latex)) !== null) {
    try {
      const original = match[0];
      const tikzContent = match[1].trim();
      console.log('Processing TikZ block:', tikzContent.substring(0, 100) + '...');
      
      const svg = await convertTikzToSVG(tikzContent, config);
      blocks.push({ original, svg });
    } catch (error) {
      console.error('Error converting TikZ block:', error);
      blocks.push({
        original: match[0],
        svg: `<!-- Conversion error: ${error.message} -->\n<!-- Problematic TikZ content:\n${match[1].trim()}\n-->`
      });
    }
  }
  
  return blocks;
}

export {
  convertTikzToSVG,
  extractAndConvertTikzBlocks,
  checkDependencies,
  defaultConfig
};