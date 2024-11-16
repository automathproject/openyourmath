import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import os from 'os';

const execPromise = util.promisify(exec);
const fsPromises = fs.promises;

/**
 * Classe pour gérer la conversion des diagrammes TikZ en SVG
 */
class TikzSvgConverter {
  constructor(options = {}) {
    this.options = {
      maxWidth: options.maxWidth || '500px',
      debug: options.debug || false,
      // Commandes LaTeX supplémentaires à inclure dans le préambule
      additionalPackages: options.additionalPackages || [],
    };
  }

  /**
   * Active ou désactive le mode debug
   * @param {boolean} enabled Status du mode debug
   */
  setDebug(enabled) {
    this.options.debug = enabled;
  }

  /**
   * Log conditionnels pour le debug
   * @param {...any} args Arguments à logger
   */
  log(...args) {
    if (this.options.debug) {
      console.log(...args);
    }
  }

  /**
   * Crée un document LaTeX complet autour du code TikZ
   * @param {string} tikzCode Code TikZ à compiler
   * @returns {string} Document LaTeX complet
   */
  createTikzDocument(tikzCode) {
    const additionalPackages = this.options.additionalPackages
      .map(pkg => `\\usepackage{${pkg}}`)
      .join('\n');

    return `\\documentclass[crop,tikz]{standalone}
\\usepackage{pgfplots}
\\usepackage{amsmath}
\\usepackage{amssymb}
${additionalPackages}
\\pgfplotsset{compat=newest}
\\begin{document}
${tikzCode}
\\end{document}`;
  }


/**
 * Nettoie et optimise le contenu SVG
 * @param {string} svgContent Contenu SVG brut
 * @returns {string} SVG optimisé
 */
cleanupSvg(svgContent) {
    try {
      // Expression régulière plus robuste pour extraire le SVG complet
      const svgMatch = /<svg[\s\S]*?<\/svg>/i.exec(svgContent);
      
      if (!svgMatch) {
        throw new Error('Structure SVG invalide');
      }
  
      const fullSvg = svgMatch[0];
      
      // Extraire le viewBox de manière plus sûre
      const viewBoxMatch = fullSvg.match(/viewBox=["']([^"']+)["']/);
      const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 100 100';
  
      // Créer un nouvel élément SVG avec les attributs essentiels
      const processedSvg = fullSvg
        .replace(/^<svg[^>]*>/, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"`)
        .replace(/style="[^"]*"/, `style="width: 100%; max-width: ${this.options.maxWidth}; height: auto;"`);
  
      // Encoder les caractères spéciaux HTML
      const encodedSvg = processedSvg
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
  
      // Retourner le SVG encodé dans un conteneur
      return `
        <div class="tikz-figure" style="display: inline-block; margin: 1em auto; text-align: center;">
          ${encodedSvg}
        </div>
      `;
    } catch (error) {
      this.log('Erreur lors du nettoyage du SVG:', error);
      throw new Error(`Erreur de traitement SVG: ${error.message}`);
    }
  }
  
  /**
   * Convertit le code TikZ en PDF puis le convertit en SVG
   * @param {string} tikzCode Code TikZ à convertir
   * @returns {Promise<string>} Contenu SVG
   */
  async convertTikzToSvg(tikzCode) {
    const tempDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'tikz-'));
    this.log('Dossier temporaire créé:', tempDir);
  
    try {
      // Création des chemins de fichiers
      const texFile = path.join(tempDir, 'tikz.tex');
      const pdfFile = path.join(tempDir, 'tikz.pdf');
      const svgFile = path.join(tempDir, 'tikz.svg');
      const logFile = path.join(tempDir, 'tikz.log');
  
      // Création du document LaTeX
      const texContent = this.createTikzDocument(tikzCode);
      await fsPromises.writeFile(texFile, texContent, 'utf8');
      this.log('Fichier TeX créé:', texContent);
  
      // Compilation LaTeX avec paramètres supplémentaires pour la qualité
      try {
        await execPromise(
          `cd "${tempDir}" && pdflatex -halt-on-error -interaction=nonstopmode tikz.tex`
        );
        
        if (!fs.existsSync(pdfFile)) {
          const logContent = await fsPromises.readFile(logFile, 'utf8');
          throw new Error(this.extractLatexErrors(logContent));
        }
      } catch (error) {
        if (fs.existsSync(logFile)) {
          const logContent = await fsPromises.readFile(logFile, 'utf8');
          throw new Error(this.extractLatexErrors(logContent));
        }
        throw error;
      }
  
      // Conversion PDF vers SVG avec paramètres de qualité
      try {
        await execPromise(`pdf2svg "${pdfFile}" "${svgFile}" 1`);
        if (!fs.existsSync(svgFile)) {
          throw new Error('Échec de la conversion PDF vers SVG');
        }
      } catch (error) {
        throw new Error(`Erreur lors de la conversion PDF vers SVG: ${error.message}`);
      }
  
      // Lecture du SVG avec encoding spécifié
      const svgContent = await fsPromises.readFile(svgFile, { encoding: 'utf8' });
      return this.cleanupSvg(svgContent);
  
    } finally {
      // Nettoyage des fichiers temporaires
      if (!this.options.debug) {
        await fsPromises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      } else {
        this.log('Fichiers temporaires conservés pour debug dans:', tempDir);
      }
    }
  }

  /**
   * Extrait les messages d'erreur pertinents du log LaTeX
   * @param {string} logContent Contenu du fichier log
   * @returns {string} Messages d'erreur formatés
   */
  extractLatexErrors(logContent) {
    const errorLines = [];
    const lines = logContent.split('\n');
    let isErrorContext = false;

    for (const line of lines) {
      if (line.startsWith('!')) {
        isErrorContext = true;
        errorLines.push(line.trim());
      } else if (isErrorContext && line.trim().startsWith('l.')) {
        errorLines.push(line.trim());
        isErrorContext = false;
      }
    }

    return errorLines.length > 0 ? errorLines.join('\n') : 'Aucune erreur spécifique trouvée dans le log';
  }

/**
 * Traite tous les environnements tikzpicture dans un contenu LaTeX
 * @param {string} latex Contenu LaTeX à traiter
 * @returns {Promise<string>} Contenu avec les tikzpicture convertis en SVG
 */
async processTikzPictures(latex) {
    // Expressions régulières pour détecter les blocs TikZ
    const tikzRegex = /\\begin{tikzpicture}([\s\S]*?)\\end{tikzpicture}/g;
    const centerRegex = /\\begin{center}([\s\S]*?)\\end{center}/g;
    
    // Fonction helper pour créer un message d'erreur HTML
    const createErrorMessage = (error) => `
      <div class="tikz-error" style="color: red; border: 1px solid red; padding: 1em; margin: 1em 0; border-radius: 4px;">
        <strong>Erreur de conversion TikZ:</strong><br/>
        <pre style="margin: 0.5em 0; white-space: pre-wrap;">${error.message}</pre>
      </div>
    `;
  
    try {
      let result = latex;
      const processedBlocks = new Map(); // Pour éviter les doublons de traitement
  
      // 1. Trouver tous les blocs center
      const centerMatches = [...result.matchAll(centerRegex)];
      for (const centerMatch of centerMatches) {
        const centerContent = centerMatch[1];
        if (!centerContent.includes('\\begin{tikzpicture}')) {
          continue;
        }
  
        let processedContent = centerContent;
        const tikzMatches = [...centerContent.matchAll(tikzRegex)];
        
        // Traiter chaque tikzpicture dans le bloc center
        for (const tikzMatch of tikzMatches) {
          try {
            if (!processedBlocks.has(tikzMatch[0])) {
              const svg = await this.convertTikzToSvg(tikzMatch[0]);
              processedBlocks.set(tikzMatch[0], svg);
            }
            processedContent = processedContent.replace(
              tikzMatch[0], 
              processedBlocks.get(tikzMatch[0])
            );
          } catch (error) {
            this.log('Erreur de conversion TikZ dans center:', error);
            processedContent = processedContent.replace(
              tikzMatch[0],
              createErrorMessage(error)
            );
          }
        }
        
        // Remplacer le bloc center complet
        result = result.replace(centerMatch[0], processedContent);
      }
  
      // 2. Traiter les tikzpicture restants (hors des blocs center)
      const remainingTikzMatches = [...result.matchAll(tikzRegex)];
      for (const tikzMatch of remainingTikzMatches) {
        try {
          if (!processedBlocks.has(tikzMatch[0])) {
            const svg = await this.convertTikzToSvg(tikzMatch[0]);
            processedBlocks.set(tikzMatch[0], svg);
          }
          result = result.replace(tikzMatch[0], processedBlocks.get(tikzMatch[0]));
        } catch (error) {
          this.log('Erreur de conversion TikZ hors center:', error);
          result = result.replace(tikzMatch[0], createErrorMessage(error));
        }
      }
  
      return result;
  
    } catch (error) {
      this.log('Erreur générale dans processTikzPictures:', error);
      return latex.replace(
        tikzRegex,
        createErrorMessage(new Error('Erreur générale de traitement TikZ'))
      );
    }
  }
}

/**
 * Fonction utilitaire pour convertir un seul diagramme TikZ en SVG
 * @param {string} tikzCode Code TikZ à convertir
 * @param {Object} options Options de conversion
 * @returns {Promise<string>} Contenu SVG
 */
async function convertSingleTikz(tikzCode, options = {}) {
  const converter = new TikzSvgConverter(options);
  return converter.convertTikzToSvg(tikzCode);
}

export { TikzSvgConverter, convertSingleTikz };