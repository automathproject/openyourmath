import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import os from 'os';
import crypto from 'crypto';

import {
  preprocessLatex,
  stripComments,
  wrapAlignWithDollar,
  isCommandCommented,
  convertLaTeXToHTML
} from './Tex2HtmlUtils.js';

import {
  extractAndConvertTikzBlocks,
  checkDependencies
} from './Tikz2SvgUtils.js';

const fsPromises = fs.promises;
const execPromise = util.promisify(exec);

function generateUniqueId() {
    return crypto.randomUUID();
}

/**
 * Fonction pour extraire et remplacer les blocs TikZ par des identifiants uniques
 * @param {string} latex - Contenu LaTeX
 * @returns {Promise<{modifiedLatex: string, tikzMap: Map<string, string>}>}
 */
async function preprocessTikzBlocks(latex) {
  try {
    const blocks = await extractAndConvertTikzBlocks(latex);
    let modifiedLatex = latex;
    const tikzMap = new Map();

    for (const block of blocks) {
      if (block && block.original) {
        const id = `__TIKZ_${generateUniqueId()}__`;
        tikzMap.set(id, block.svg);
        modifiedLatex = modifiedLatex.replace(block.original, id);
      }
    }

    return { modifiedLatex, tikzMap };
  } catch (error) {
    console.error('Erreur lors du prétraitement des blocs TikZ:', error);
    // En cas d'erreur, retourner le LaTeX original sans modification
    return { modifiedLatex: latex, tikzMap: new Map() };
  }
}

/**
 * Fonction pour restaurer les SVGs dans le HTML
 * @param {string} html - Contenu HTML
 * @param {Map<string, string>} tikzMap - Map des identifiants vers les SVGs
 * @returns {string}
 */
function restoreTikzSvg(html, tikzMap) {
  let result = html;
  for (const [id, svg] of tikzMap.entries()) {
    result = result.replace(id, svg);
  }
  return result;
}

/**
 * Fonction principale pour extraire les commandes LaTeX
 */
async function extractLaTeXCommands(latex, commands) {
    const extracted = {
      uuid: "",
      titre: "",
      theme: [],
      niveau: "",
      metadata: {},
      contenu: []
    };

    // Vérifier les dépendances TikZ
    const deps = await checkDependencies();
    if (!deps.success) {
      console.warn('Attention: Support TikZ désactivé -', deps.error);
    }

    // Prétraiter les blocs TikZ si les dépendances sont disponibles
    let modifiedLatex = latex;
    let tikzMap = new Map();
    
    if (deps.success) {
      const { modifiedLatex: processed, tikzMap: blocks } = await preprocessTikzBlocks(latex);
      modifiedLatex = processed;
      tikzMap = blocks;
    }

    // Initialiser les champs uniques
    commands.filter(cmd => !cmd.isContent).forEach(cmd => {
      const keys = cmd.jsonKey.split('.');
      let obj = extracted;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in obj)) {
          obj[keys[i]] = {};
        }
        obj = obj[keys[i]];
      }
      const lastKey = keys[keys.length - 1];
      obj[lastKey] = "";
    });

    // Créer une regex pour toutes les commandes à extraire
    const allCommandNames = commands.map(cmd => cmd.name).join('|');
    const regex = new RegExp(`(?<!\\\\)\\\\(${allCommandNames})\\s*\\{`, 'g');

    let match;
    while ((match = regex.exec(modifiedLatex)) !== null) {
      const commandName = match[1];
      const commandObj = commands.find(cmd => cmd.name === commandName);
      if (!commandObj) continue;

      const matchStart = match.index;
      const lineStart = modifiedLatex.lastIndexOf('\n', matchStart) + 1;
      const lineEnd = modifiedLatex.indexOf('\n', matchStart);
      const line = modifiedLatex.substring(lineStart, lineEnd === -1 ? modifiedLatex.length : lineEnd);
      const commandPosInLine = match.index - lineStart;

      if (isCommandCommented(line, commandPosInLine)) {
        continue;
      }

      let startIndex = match.index + match[0].length;
      let index = startIndex;
      let braceCount = 1;
      let content = '';

      while (braceCount > 0 && index < modifiedLatex.length) {
        const char = modifiedLatex[index];
        if (char === '\\') {
          content += char;
          index++;
          if (index < modifiedLatex.length) {
            content += modifiedLatex[index];
          }
        } else if (char === '{') {
          braceCount++;
          content += char;
        } else if (char === '}') {
          braceCount--;
          if (braceCount > 0) {
            content += char;
          }
        } else {
          content += char;
        }
        index++;
      }

      let finalContent = commandObj.isVerbatim ? content.trim() : stripComments(content.trim());
      if (commandObj.isContent) {
        finalContent = wrapAlignWithDollar(finalContent);
      }

      if (commandObj.isContent) {
        let htmlContent = await convertLaTeXToHTML(finalContent);
        
        // Restaurer les SVGs dans le HTML
        if (deps.success) {
          htmlContent = restoreTikzSvg(htmlContent, tikzMap);
        }

        const id = generateUniqueId();
        extracted.contenu.push({
          id: id,
          type: commandName === 'texte' ? 'description' : commandName,
          value: {
            latex: finalContent,
            html: htmlContent
          }
        });
      } else {
        const keys = commandObj.jsonKey.split('.');
        let obj = extracted;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!(keys[i] in obj)) {
            obj[keys[i]] = {};
          }
          obj = obj[keys[i]];
        }
        const lastKey = keys[keys.length - 1];

        if (lastKey === 'theme') {
          obj[lastKey] = finalContent.split(',').map(s => s.trim());
        } else {
          obj[lastKey] = preprocessLatex(finalContent);
        }
      }
    }

    // Ajouter les timestamps dans metadata
    const now = new Date().toISOString();
    if (!extracted.metadata.createdAt) {
      extracted.metadata.createdAt = now;
    }
    extracted.metadata.updatedAt = now;

    return extracted;
}

/**
 * Fonction pour traiter un fichier
 */
async function processFile(inputFilePath, outputDir, commandsToExtract, options = { update: false }) {
  try {
    const outputFileName = path.basename(inputFilePath, path.extname(inputFilePath)) + '.json';
    const outputFilePath = path.join(outputDir, outputFileName);

    if (options.update && fs.existsSync(outputFilePath)) {
      const inputStats = fs.statSync(inputFilePath);
      const outputStats = fs.statSync(outputFilePath);

      if (outputStats.mtime >= inputStats.mtime) {
        return true;
      }
    }

    const latexContentRaw = await fsPromises.readFile(inputFilePath, 'utf8');
    const extractedData = await extractLaTeXCommands(latexContentRaw, commandsToExtract);

    if (!extractedData.uuid) {
      extractedData.uuid = generateUniqueId();
    }

    await fsPromises.writeFile(outputFilePath, JSON.stringify(extractedData, null, 2), 'utf8');
    console.log(`Conversion réussie : ${inputFilePath} -> ${outputFilePath}`);
  } catch (error) {
    console.error(`Erreur lors du traitement du fichier ${inputFilePath} :`, error.message);
  }
}

/**
 * Fonction principale
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error("Usage : node convertLaTeXToJSON.js <chemin_du_fichier_ou_répertoire> [chemin_de_sortie] [--update]");
    process.exit(1);
  }

  const inputPath = path.resolve(args[0]);
  let outputPath = null;
  let updateMode = false;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--update') {
      updateMode = true;
    } else {
      outputPath = path.resolve(args[i]);
    }
  }

  const commandsToExtract = [
    { name: 'uuid', jsonKey: 'uuid', isContent: false, isVerbatim: false },
    { name: 'titre', jsonKey: 'titre', isContent: false, isVerbatim: false },
    { name: 'theme', jsonKey: 'theme', isContent: false, isVerbatim: false },
    { name: 'niveau', jsonKey: 'niveau', isContent: false, isVerbatim: false },
    { name: 'auteur', jsonKey: 'metadata.auteur', isContent: false, isVerbatim: false },
    { name: 'datecreate', jsonKey: 'metadata.createdAt', isContent: false, isVerbatim: false },
    { name: 'organisation', jsonKey: 'metadata.organisation', isContent: false, isVerbatim: false },
    { name: 'texte', jsonKey: 'contenu', isContent: true, isVerbatim: false },
    { name: 'question', jsonKey: 'contenu', isContent: true, isVerbatim: false },
    { name: 'reponse', jsonKey: 'contenu', isContent: true, isVerbatim: false },
    { name: 'indication', jsonKey: 'contenu', isContent: true, isVerbatim: false },
    { name: 'code', jsonKey: 'contenu', isContent: true, isVerbatim: true },
  ];

  if (!fs.existsSync(inputPath)) {
    console.error(`Le chemin spécifié n'existe pas : ${inputPath}`);
    process.exit(1);
  }

  const stats = fs.statSync(inputPath);
  let ignoredCount = 0;

  if (stats.isFile()) {
    if (path.extname(inputPath).toLowerCase() !== '.tex') {
      console.error(`Le fichier spécifié n'est pas un fichier .tex : ${inputPath}`);
      process.exit(1);
    }

    const outputDir = outputPath ? outputPath : path.dirname(inputPath);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`Répertoire de sortie créé : ${outputDir}`);
    }

    await processFile(inputPath, outputDir, commandsToExtract, { update: updateMode });

  } else if (stats.isDirectory()) {
    const dirPath = inputPath;
    const outputDir = outputPath ? outputPath : dirPath;

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`Répertoire de sortie créé : ${outputDir}`);
    }

    try {
      const files = await fsPromises.readdir(dirPath);
      const texFiles = files.filter(file => path.extname(file).toLowerCase() === '.tex');

      if (texFiles.length === 0) {
        console.log(`Aucun fichier .tex trouvé dans le répertoire : ${dirPath}`);
        return;
      }

      for (const file of texFiles) {
        const inputFilePath = path.join(dirPath, file);
        const wasIgnored = await processFile(inputFilePath, outputDir, commandsToExtract, { update: updateMode });
        if (wasIgnored) ignoredCount++;
      }
    } catch (err) {
      console.error(`Erreur lors de la lecture du répertoire : ${err.message}`);
      process.exit(1);
    }
  } else {
    console.error(`Le chemin spécifié n'est ni un fichier ni un répertoire : ${inputPath}`);
    process.exit(1);
  }

  if (updateMode && ignoredCount > 0) {
    console.log(`\n${ignoredCount} fichier${ignoredCount > 1 ? 's' : ''} ignoré${ignoredCount > 1 ? 's' : ''} car déjà à jour.`);
  }
}

main().catch(error => {
  console.error("Une erreur inattendue s'est produite :", error);
  process.exit(1);
});