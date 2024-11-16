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

const fsPromises = fs.promises;
const execPromise = util.promisify(exec);

function generateUniqueId() {
    return crypto.randomUUID();
}



/**
 * Fonction générique pour extraire le contenu des commandes LaTeX.
 * Cette version parcourt le contenu LaTeX séquentiellement pour préserver l'ordre des commandes de contenu.
 * @param {string} latex - Contenu complet du fichier LaTeX.
 * @param {Array} commands - Liste des commandes à extraire avec leurs propriétés.
 * @returns {Object} - Objet contenant les champs extraits.
 */
async function extractLaTeXCommands(latex, commands) {
    /**
     * @typedef {Object} ContenuItem
     * @property {string} id
     * @property {string} type
     * @property {Object} value
     * @property {string} value.latex
     * @property {string} value.html
     */

    /**
     * @type {{
     *   uuid: string,
     *   titre: string,
     *   theme: string[],
     *   niveau: string,
     *   metadata: Object,
     *   contenu: ContenuItem[]
     * }}
     */
    const extracted = {
      uuid: "",
      titre: "",
      theme: [],
      niveau: "",
      metadata: {},
      contenu: []
    };
  
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
    while ((match = regex.exec(latex)) !== null) {
      const commandName = match[1];
      const commandObj = commands.find(cmd => cmd.name === commandName);
      if (!commandObj) continue; // Commande non reconnue
  
      const matchStart = match.index;
      const lineStart = latex.lastIndexOf('\n', matchStart) + 1;
      const lineEnd = latex.indexOf('\n', matchStart);
      const line = latex.substring(lineStart, lineEnd === -1 ? latex.length : lineEnd);
      const commandPosInLine = match.index - lineStart;
  
      // Vérifier si la commande est commentée
      if (isCommandCommented(line, commandPosInLine)) {
        continue; // Ignorer cette commande car elle est commentée
      }
  
      // Extraction du contenu entre les accolades
      let startIndex = match.index + match[0].length;
      let index = startIndex;
      let braceCount = 1;
      let content = '';
  
      while (braceCount > 0 && index < latex.length) {
        const char = latex[index];
  
        if (char === '\\') {
          // Gérer les caractères échappés
          content += char;
          index++;
          if (index < latex.length) {
            content += latex[index];
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
  
      // Appliquer ou non stripComments en fonction de isVerbatim
      let finalContent = commandObj.isVerbatim ? content.trim() : stripComments(content.trim());
  
      // Ajouter les doubles $$ autour des blocs align*
      if (commandObj.isContent) {
        finalContent = wrapAlignWithDollar(finalContent);
      }
  
      if (commandObj.isContent) {
        // Convertir le contenu LaTeX en HTML
        const htmlContent = await convertLaTeXToHTML(finalContent);
  
        // Générer un identifiant unique pour chaque élément de contenu
        const id = generateUniqueId();
  
        // Ajouter au tableau 'contenu'
        extracted.contenu.push({
          id: id,
          type: commandName === 'texte' ? 'description' : commandName,
          value: {
            latex: finalContent,
            html: htmlContent
          }
        });
      } else {
        // Commande unique: assigner la valeur
        const keys = commandObj.jsonKey.split('.');
        let obj = extracted;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!(keys[i] in obj)) {
            obj[keys[i]] = {};
          }
          obj = obj[keys[i]];
        }
        const lastKey = keys[keys.length - 1];
  
        // Si le champ est 'theme' qui est un tableau, diviser par des virgules
        if (lastKey === 'theme') {
          obj[lastKey] = finalContent.split(',').map(s => s.trim());
        } else {
          obj[lastKey] = preprocessLatex(finalContent);
        }
      }
    }
  
    // Ajouter les timestamps dans metadata si non présents
    const now = new Date().toISOString();
    if (!extracted.metadata.createdAt) {
      extracted.metadata.createdAt = now;
    }
    extracted.metadata.updatedAt = now;
  
    return extracted;
  }
  

/**
 * Fonction pour traiter un fichier .tex et générer un fichier .json.
 * @param {string} inputFilePath - Chemin complet du fichier .tex.
 * @param {string} outputDir - Répertoire de sortie pour le fichier .json.
 * @param {Array} commandsToExtract - Liste des commandes à extraire.
 * @param {Object} options - Options de traitement
 * @param {boolean} options.update - Si true, ne convertit que si nécessaire
 */
async function processFile(inputFilePath, outputDir, commandsToExtract, options = { update: false }) {
  try {
      const outputFileName = path.basename(inputFilePath, path.extname(inputFilePath)) + '.json';
      const outputFilePath = path.join(outputDir, outputFileName);

      // Si l'option update est activée, vérifier les dates de modification
      if (options.update && fs.existsSync(outputFilePath)) {
          const inputStats = fs.statSync(inputFilePath);
          const outputStats = fs.statSync(outputFilePath);

          // Si le fichier de sortie est plus récent, on skip la conversion
          if (outputStats.mtime >= inputStats.mtime) {
              return true;
          }
      }

      const latexContentRaw = fs.readFileSync(inputFilePath, 'utf8');
      const extractedData = await extractLaTeXCommands(latexContentRaw, commandsToExtract);

      // Générer un UUID si non présent
      if (!extractedData.uuid) {
          extractedData.uuid = generateUniqueId();
      }

      fs.writeFileSync(outputFilePath, JSON.stringify(extractedData, null, 2), 'utf8');
      console.log(`Conversion réussie : ${inputFilePath} -> ${outputFilePath}`);
  } catch (error) {
      console.error(`Erreur lors du traitement du fichier ${inputFilePath} :`, error.message);
  }
}

/**
 * Fonction principale pour gérer les arguments et traiter les fichiers.
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

  // Traiter les arguments
  for (let i = 1; i < args.length; i++) {
      if (args[i] === '--update') {
          updateMode = true;
      } else {
          outputPath = path.resolve(args[i]);
      }
  }

  // Définir les commandes à extraire avec l'indicateur isVerbatim
  const commandsToExtract = [
      // Champs uniques de l'exercice
      { name: 'uuid', jsonKey: 'uuid', isContent: false, isVerbatim: false },
      { name: 'titre', jsonKey: 'titre', isContent: false, isVerbatim: false },
      { name: 'theme', jsonKey: 'theme', isContent: false, isVerbatim: false },
      { name: 'niveau', jsonKey: 'niveau', isContent: false, isVerbatim: false },
      // Metadata
      { name: 'auteur', jsonKey: 'metadata.auteur', isContent: false, isVerbatim: false },
      { name: 'date', jsonKey: 'metadata.createdAt', isContent: false, isVerbatim: false },
      { name: 'organisation', jsonKey: 'metadata.organisation', isContent: false, isVerbatim: false },
      // Champs de contenu
      { name: 'texte', jsonKey: 'contenu', isContent: true, isVerbatim: false },
      { name: 'question', jsonKey: 'contenu', isContent: true, isVerbatim: false },
      { name: 'reponse', jsonKey: 'contenu', isContent: true, isVerbatim: false },
      { name: 'code', jsonKey: 'contenu', isContent: true, isVerbatim: true },
  ];

  // Vérifier si le chemin d'entrée existe
  if (!fs.existsSync(inputPath)) {
      console.error(`Le chemin spécifié n'existe pas : ${inputPath}`);
      process.exit(1);
  }

  // Déterminer si l'entrée est un fichier ou un répertoire
  const stats = fs.statSync(inputPath);
  let ignoredCount = 0;

  if (stats.isFile()) {
      if (path.extname(inputPath).toLowerCase() !== '.tex') {
          console.error(`Le fichier spécifié n'est pas un fichier .tex : ${inputPath}`);
          process.exit(1);
      }

      // Déterminer le répertoire de sortie
      const outputDir = outputPath ? outputPath : path.dirname(inputPath);

      // Vérifier si le répertoire de sortie existe, sinon le créer
      if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
          console.log(`Répertoire de sortie créé : ${outputDir}`);
      }

      // Traiter le fichier
      await processFile(inputPath, outputDir, commandsToExtract, { update: updateMode });

  } else if (stats.isDirectory()) {
      // Si l'entrée est un répertoire, traiter tous les fichiers .tex à l'intérieur
      const dirPath = inputPath;
      const outputDir = outputPath ? outputPath : dirPath;

      // Vérifier si le répertoire de sortie existe, sinon le créer
      if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
          console.log(`Répertoire de sortie créé : ${outputDir}`);
      }

      // Lire tous les fichiers du répertoire
      try {
          const files = await fsPromises.readdir(dirPath);

          const texFiles = files.filter(file => path.extname(file).toLowerCase() === '.tex');

          if (texFiles.length === 0) {
              console.log(`Aucun fichier .tex trouvé dans le répertoire : ${dirPath}`);
              return;
          }

            // Traiter chaque fichier .tex et compter les fichiers ignorés
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

      // Afficher le résumé des fichiers ignorés si on est en mode update
      if (updateMode && ignoredCount > 0) {
        console.log(`\n${ignoredCount} fichier${ignoredCount > 1 ? 's' : ''} ignoré${ignoredCount > 1 ? 's' : ''} car déjà à jour.`);
    }
}
  
  // Appel de la fonction principale
  main().catch(error => {
    console.error("Une erreur inattendue s'est produite :", error);
    process.exit(1);
  });