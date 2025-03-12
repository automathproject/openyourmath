#!/usr/bin/env node
/**
 * Script pour convertir les fichiers LaTeX en bundles JSON par sous-répertoire
 * Usage: node convertTex2JsonV5.js <répertoire_racine> [répertoire_de_sortie] [--update]
 * 
 * Exemple de structure:
 * src/
 *   ├── amscc/            <- Génère un bundle
 *   └── exo7/
 *       ├── 1-L1/         <- Génère un bundle
 *       ├── 10-L3/        <- Génère un bundle
 *       └── ...
 */
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
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

import { generatePreview } from './PreviewUtils.js';

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
 * @param {string} latex - Contenu LaTeX
 * @param {Array} commands - Liste des commandes à extraire
 * @param {string} [fileName="fichier inconnu"] - Nom complet du fichier LaTeX (pour la gestion des erreurs)
 */
async function extractLaTeXCommands(latex, commands, fileName = "fichier inconnu") {
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
      let htmlContent = "";
      // Encapsulation de l'appel à Pandoc pour capter d'éventuelles erreurs
      try {
        htmlContent = await convertLaTeXToHTML(finalContent);
      } catch (error) {
        console.error(`Erreur lors de la conversion LaTeX -> HTML avec pandoc pour le fichier ${fileName} : ${error.message}`);
        // Vous pouvez choisir de renvoyer un contenu d'erreur ou de laisser une chaîne vide
        htmlContent = `<div class="error">Erreur de conversion pour le fichier ${fileName} : ${error.message}</div>`;
      }

      // Restaurer les SVGs dans le HTML si nécessaire
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

  // Générer UUID s'il n'existe pas
  if (!extracted.uuid) {
    extracted.uuid = generateUniqueId();
  }

  // Générer la preview
  extracted.preview = generatePreview(extracted);

  return extracted;
}

/**
 * Fonction pour traiter un fichier .tex et ajouter les données au bundle
 * @param {string} inputFilePath - Chemin du fichier .tex
 * @param {Object} bundle - L'objet bundle à mettre à jour
 * @param {Array} commandsToExtract - Liste des commandes à extraire
 * @param {Object} options - Options supplémentaires
 * @returns {Promise<string|null>} - Retourne l'UUID du document extrait ou null si ignoré
 */
async function processFile(inputFilePath, bundle, commandsToExtract, options = { update: false }) {
  try {
    const fileName = path.basename(inputFilePath, path.extname(inputFilePath));
    
    // En mode update, vérifier si le fichier a été modifié
    if (options.update && options.previousBundle) {
      // Trouver l'entrée correspondante dans le bundle précédent
      const existingEntry = Object.values(options.previousBundle).find(
        item => item.metadata && 
               ((item.metadata.sourceFile && item.metadata.sourceFile === inputFilePath) ||
                (item.metadata.fileName && item.metadata.fileName === fileName))
      );

      if (existingEntry) {
        const inputStats = fs.statSync(inputFilePath);
        const lastModified = new Date(existingEntry.metadata.updatedAt);
        
        if (lastModified >= inputStats.mtime) {
          // Le fichier source n'a pas été modifié, réutiliser les données existantes
          bundle[existingEntry.uuid] = existingEntry;
          console.log(`Fichier non modifié (ignoré) : ${inputFilePath}`);
          return existingEntry.uuid;
        }
      }
    }

    const latexContentRaw = await fsPromises.readFile(inputFilePath, 'utf8');
    const extractedData = await extractLaTeXCommands(latexContentRaw, commandsToExtract, inputFilePath);
    
    // Ajouter des métadonnées sur le fichier source
    extractedData.metadata.sourceFile = inputFilePath;
    extractedData.metadata.fileName = fileName;
    
    // Ajouter au bundle
    bundle[extractedData.uuid] = extractedData;
    console.log(`Conversion réussie : ${inputFilePath}`);
    
    return extractedData.uuid;
  } catch (error) {
    console.error(`Erreur lors du traitement du fichier ${inputFilePath} :`, error.message);
    return null;
  }
}

/**
 * Crée un bundle pour un répertoire spécifique en incluant tous ses fichiers .tex,
 * y compris ceux dans les sous-répertoires
 * @param {string} dirPath - Chemin du répertoire à traiter
 * @param {string} outputDir - Répertoire de sortie pour les bundles
 * @param {Array} commandsToExtract - Liste des commandes à extraire
 * @param {Object} options - Options supplémentaires
 * @returns {Promise<Object>} - Statistiques sur le nombre de fichiers traités
 */
async function createBundleForDirectory(dirPath, outputDir, commandsToExtract, options = { update: false }) {
  const dirName = path.basename(dirPath);
  const bundlePath = path.join(outputDir, `${dirName}-bundle.json`);
  
  // Initialiser le bundle
  let bundle = {};
  let previousBundle = null;
  
  // En mode update, charger le bundle existant s'il existe
  if (options.update && fs.existsSync(bundlePath)) {
    try {
      const existingContent = await fsPromises.readFile(bundlePath, 'utf8');
      previousBundle = JSON.parse(existingContent);
      console.log(`Bundle existant chargé depuis : ${bundlePath}`);
      // Faire une copie du bundle existant pour pouvoir comparer plus tard
      bundle = JSON.parse(existingContent);
    } catch (error) {
      console.warn(`Impossible de charger le bundle existant : ${error.message}`);
      console.warn("Un nouveau bundle sera créé.");
    }
  }
  
  let processedCount = 0;
  let ignoredCount = 0;
  
  // Fonction pour parcourir récursivement tous les fichiers .tex du répertoire
  async function findAndProcessTexFiles(currentPath) {
    const entries = await fsPromises.readdir(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        // Parcourir les sous-répertoires
        await findAndProcessTexFiles(fullPath);
      } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.tex') {
        // Traiter les fichiers .tex
        const uuid = await processFile(fullPath, bundle, commandsToExtract, 
          { update: options.update, previousBundle });
        
        if (uuid) processedCount++;
        else ignoredCount++;
      }
    }
  }
  
  // Traiter tous les fichiers .tex du répertoire et de ses sous-répertoires
  await findAndProcessTexFiles(dirPath);
  
  // S'il y a des fichiers à convertir ou un bundle existant, écrire le bundle
  if (processedCount > 0 || (options.update && Object.keys(bundle).length > 0)) {
    try {
      // Créer le répertoire de sortie s'il n'existe pas
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      await fsPromises.writeFile(bundlePath, JSON.stringify(bundle, null, 2), 'utf8');
      console.log(`Bundle créé : ${bundlePath} (${Object.keys(bundle).length} éléments)`);
      
      return { 
        processed: processedCount, 
        ignored: ignoredCount,
        bundleCount: 1
      };
    } catch (error) {
      console.error(`Erreur lors de l'écriture du bundle ${bundlePath} :`, error.message);
    }
  }
  
  return { 
    processed: processedCount, 
    ignored: ignoredCount,
    bundleCount: 0
  };
}

/**
 * Traite uniquement les sous-répertoires immédiats du répertoire d'entrée
 * et crée un bundle pour chaque sous-répertoire
 * @param {string} rootDir - Répertoire racine contenant les sous-répertoires à traiter
 * @param {string} outputDir - Répertoire de sortie pour les bundles
 * @param {Array} commandsToExtract - Liste des commandes à extraire
 * @param {Object} options - Options supplémentaires
 * @returns {Promise<Object>} - Statistiques sur le nombre de fichiers traités
 */
async function processSubDirectories(rootDir, outputDir, commandsToExtract, options = { update: false }) {
  // Lister les sous-répertoires immédiats
  const entries = await fsPromises.readdir(rootDir, { withFileTypes: true });
  const subDirs = entries.filter(entry => entry.isDirectory());
  
  let totalStats = {
    processed: 0,
    ignored: 0,
    bundleCount: 0
  };
  
  console.log(`Traitement des ${subDirs.length} sous-répertoires de ${rootDir}...`);
  
  // Traiter chaque sous-répertoire
  for (const dir of subDirs) {
    const subDirPath = path.join(rootDir, dir.name);
    
    // Créer un bundle pour ce sous-répertoire
    const result = await createBundleForDirectory(subDirPath, outputDir, commandsToExtract, options);
    
    totalStats.processed += result.processed;
    totalStats.ignored += result.ignored;
    totalStats.bundleCount += result.bundleCount;
  }
  
  return totalStats;
}

/**
 * Traite un cas particulier pour la structure exo7 : crée un bundle pour chaque 
 * sous-répertoire de exo7 et un bundle pour amscc
 * @param {string} rootDir - Répertoire racine de la structure (src/)
 * @param {string} outputDir - Répertoire de sortie pour les bundles
 * @param {Array} commandsToExtract - Liste des commandes à extraire
 * @param {Object} options - Options supplémentaires
 * @returns {Promise<Object>} - Statistiques sur le nombre de fichiers traités
 */
async function processSpecialStructure(rootDir, outputDir, commandsToExtract, options = { update: false }) {
  // Lister les sous-répertoires immédiats
  const entries = await fsPromises.readdir(rootDir, { withFileTypes: true });
  const subDirs = entries.filter(entry => entry.isDirectory());
  
  let totalStats = {
    processed: 0,
    ignored: 0,
    bundleCount: 0
  };
  
  console.log(`Traitement de la structure spéciale dans ${rootDir}...`);
  
  // Traiter chaque sous-répertoire de premier niveau (amscc, exo7)
  for (const dir of subDirs) {
    const subDirPath = path.join(rootDir, dir.name);
    const subDirName = dir.name.toLowerCase();
    
    if (subDirName === 'amscc') {
      // Pour amscc, créer un bundle directement
      console.log(`Traitement du répertoire amscc...`);
      const result = await createBundleForDirectory(subDirPath, outputDir, commandsToExtract, options);
      
      totalStats.processed += result.processed;
      totalStats.ignored += result.ignored;
      totalStats.bundleCount += result.bundleCount;
    } else if (subDirName === 'exo7') {
      // Pour exo7, traiter chaque sous-répertoire
      console.log(`Traitement des sous-répertoires de exo7...`);
      const exo7Entries = await fsPromises.readdir(subDirPath, { withFileTypes: true });
      const exo7SubDirs = exo7Entries.filter(entry => entry.isDirectory());
      
      for (const exo7Dir of exo7SubDirs) {
        const exo7SubDirPath = path.join(subDirPath, exo7Dir.name);
        console.log(`Traitement du sous-répertoire exo7/${exo7Dir.name}...`);
        
        const result = await createBundleForDirectory(exo7SubDirPath, outputDir, commandsToExtract, options);
        
        totalStats.processed += result.processed;
        totalStats.ignored += result.ignored;
        totalStats.bundleCount += result.bundleCount;
      }
    } else {
      // Pour tout autre répertoire, création d'un bundle
      console.log(`Traitement du répertoire ${subDirName}...`);
      const result = await createBundleForDirectory(subDirPath, outputDir, commandsToExtract, options);
      
      totalStats.processed += result.processed;
      totalStats.ignored += result.ignored;
      totalStats.bundleCount += result.bundleCount;
    }
  }
  
  return totalStats;
}

/**
 * Fonction principale
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error("Usage : node convertTex2JsonV5.js <répertoire_racine> [répertoire_de_sortie] [--update]");
    process.exit(1);
  }

  const inputPath = path.resolve(args[0]);
  let outputDir = null;
  let updateMode = false;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--update') {
      updateMode = true;
    } else {
      outputDir = path.resolve(args[i]);
    }
  }

  // Si aucun répertoire de sortie n'est spécifié, utiliser un répertoire 'bundles' dans le répertoire parent
  if (!outputDir) {
    outputDir = path.resolve(path.dirname(inputPath), 'bundles');
  }

  const commandsToExtract = [
    // Métadonnées de base
    { name: 'uuid', jsonKey: 'uuid', isContent: false, isVerbatim: false },
    { name: 'exo7id', jsonKey: 'metadata.exo7id', isContent: false, isVerbatim: false },
    { name: 'auteur', jsonKey: 'metadata.auteur', isContent: false, isVerbatim: false },
    { name: 'datecreate', jsonKey: 'metadata.createdAt', isContent: false, isVerbatim: false },
    
    // Configuration de l'exercice
    { name: 'isIndication', jsonKey: 'metadata.hasIndication', isContent: false, isVerbatim: false },
    { name: 'isCorrection', jsonKey: 'metadata.hasCorrection', isContent: false, isVerbatim: false },
    { name: 'video', jsonKey: 'metadata.youtube', isContent: false, isVerbatim: false },
    
    // Structure et organisation
    { name: 'chapitre', jsonKey: 'metadata.chapitre', isContent: false, isVerbatim: false },
    { name: 'sousChapitre', jsonKey: 'metadata.sousChapitre', isContent: false, isVerbatim: false },
    { name: 'titre', jsonKey: 'titre', isContent: false, isVerbatim: false },
    { name: 'theme', jsonKey: 'theme', isContent: false, isVerbatim: false },
    { name: 'niveau', jsonKey: 'niveau', isContent: false, isVerbatim: false },
    { name: 'organisation', jsonKey: 'metadata.organisation', isContent: false, isVerbatim: false },
    
    // Contenu de l'exercice
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

  // Créer le répertoire de sortie si nécessaire
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Répertoire de sortie créé : ${outputDir}`);
  }

  const stats = fs.statSync(inputPath);
  let result = {
    processed: 0,
    ignored: 0,
    bundleCount: 0
  };

  if (stats.isFile()) {
    console.error(`Ce script est conçu pour traiter des répertoires, pas des fichiers individuels.`);
    console.error(`Veuillez spécifier un répertoire contenant des sous-répertoires.`);
    process.exit(1);
  } else if (stats.isDirectory()) {
    console.log(`Début de la conversion des fichiers LaTeX vers des bundles dans : ${outputDir}`);
    
    // Déterminer le mode de traitement en fonction de la structure
    const dirName = path.basename(inputPath);
    
    if (dirName === 'src') {
      // Si le répertoire est 'src', utiliser le traitement spécial pour la structure amscc/exo7
      result = await processSpecialStructure(
        inputPath,
        outputDir,
        commandsToExtract,
        { update: updateMode }
      );
    } else {
      // Sinon, traiter les sous-répertoires immédiats normalement
      result = await processSubDirectories(
        inputPath,
        outputDir,
        commandsToExtract,
        { update: updateMode }
      );
    }
  } else {
    console.error(`Le chemin spécifié n'est ni un fichier ni un répertoire : ${inputPath}`);
    process.exit(1);
  }

  // Afficher le résumé final
  console.log(`\nOpération terminée !`);
  console.log(`Bundles créés : ${result.bundleCount}`);
  console.log(`Fichiers traités : ${result.processed}`);
  
  if (updateMode && result.ignored > 0) {
    console.log(`Fichiers ignorés car non modifiés : ${result.ignored}`);
  }
}

main().catch(error => {
  console.error("Une erreur inattendue s'est produite :", error);
  process.exit(1);
});