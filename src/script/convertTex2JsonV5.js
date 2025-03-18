#!/usr/bin/env node
/**
 * Script pour convertir les fichiers LaTeX en bundles JSON par sous-répertoire
 * Usage: node convertTex2JsonV5.js <répertoire_racine> [répertoire_de_sortie] [--update] [--max-entries=<nombre>] [--no-split] [--cleanup]
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

import { getPathInfo, ensureDirectoryExists } from './utils/FileUtils.js';
import { processSubDirectories, processStructureGenerically } from './utils/BundleUtils.js';

/**
 * Nettoie les fichiers de bundle redondants dans le répertoire spécifié
 * @param {string} outputDir - Répertoire contenant les bundles à nettoyer
 */
async function cleanupRedundantBundles(outputDir) {
  console.log("Mode nettoyage : suppression des fichiers de bundle redondants...");
  
  // S'assurer que le répertoire existe
  if (!fs.existsSync(outputDir)) {
    console.error(`Le répertoire spécifié n'existe pas : ${outputDir}`);
    return;
  }
  
  // Parcourir le répertoire de sortie
  const files = fs.readdirSync(outputDir);
  
  // Rechercher les motifs de noms redondants
  const redundantFiles = files.filter(file => 
    file.endsWith('.json') && (
        file.includes('-full-part') || 
        file.includes('-full-full') ||
        file.includes('-part1-part') || 
        file.includes('-part2-part') ||
        // Compter le nombre de "-part" dans le nom de fichier
        (file.match(/-part/g) || []).length > 1
      )
  );
  
  if (redundantFiles.length > 0) {
    console.log(`${redundantFiles.length} fichiers redondants trouvés.`);
    
    for (const file of redundantFiles) {
      const filePath = path.join(outputDir, file);
      fs.unlinkSync(filePath);
      console.log(`Supprimé: ${file}`);
    }
    
    console.log("Nettoyage terminé.");
  } else {
    console.log("Aucun fichier redondant trouvé.");
  }
}

/**
 * Fonction principale
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error("Usage : node convertTex2JsonV5.js <répertoire_racine> [répertoire_de_sortie] [--update] [--max-entries=<nombre>] [--no-split] [--cleanup]");
    process.exit(1);
  }

  const inputPath = path.resolve(args[0]);
  let outputDir = null;
  let updateMode = false;
  let maxEntriesPerBundle = 400; // Valeur par défaut
  let splitBundles = true; // Par défaut, les bundles sont divisés
  let cleanupMode = false; // Mode nettoyage

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--update') {
      updateMode = true;
    } else if (args[i] === '--no-split') {
      splitBundles = false;
    } else if (args[i] === '--cleanup') {
      cleanupMode = true;
    } else if (args[i].startsWith('--max-entries=')) {
      const value = args[i].split('=')[1];
      maxEntriesPerBundle = parseInt(value, 10);
      if (isNaN(maxEntriesPerBundle) || maxEntriesPerBundle <= 0) {
        console.error("La valeur de --max-entries doit être un nombre positif");
        process.exit(1);
      }
    } else {
      outputDir = path.resolve(args[i]);
    }
  }

  // Si aucun répertoire de sortie n'est spécifié, utiliser un répertoire 'bundles' dans le répertoire parent
  if (!outputDir) {
    outputDir = path.resolve(path.dirname(inputPath), 'bundles');
  }

  // Exécuter le nettoyage si demandé, puis quitter
  if (cleanupMode) {
    await cleanupRedundantBundles(outputDir);
    process.exit(0);
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

  const pathInfo = getPathInfo(inputPath);
  
  if (!pathInfo.exists) {
    console.error(`Le chemin spécifié n'existe pas : ${inputPath}`);
    process.exit(1);
  }

  // Créer le répertoire de sortie si nécessaire
  ensureDirectoryExists(outputDir);
  console.log(`Répertoire de sortie : ${outputDir}`);

  let result = {
    processed: 0,
    ignored: 0,
    bundleCount: 0
  };

  if (pathInfo.isFile) {
    console.error(`Ce script est conçu pour traiter des répertoires, pas des fichiers individuels.`);
    console.error(`Veuillez spécifier un répertoire contenant des sous-répertoires.`);
    process.exit(1);
  } else if (pathInfo.isDirectory) {
    console.log(`Début de la conversion des fichiers LaTeX vers des bundles dans : ${outputDir}`);
    
    // Déterminer le mode de traitement en fonction de la structure
    if (pathInfo.basename === 'src') {
      // Si le répertoire est 'src', utiliser le traitement générique pour la structure
      result = await processStructureGenerically(
        inputPath,
        outputDir,
        commandsToExtract,
        { update: updateMode, maxEntriesPerBundle, splitBundles }
      );
    } else {
      // Sinon, traiter les sous-répertoires immédiats normalement
      result = await processSubDirectories(
        inputPath,
        outputDir,
        commandsToExtract,
        { update: updateMode, maxEntriesPerBundle, splitBundles }
      );
    }
  } else {
    console.error(`Le chemin spécifié n'est ni un fichier ni un répertoire : ${inputPath}`);
    process.exit(1);
  }

  // Afficher le résumé final
  console.log(`\nOpération terminée !`);
  console.log(`Bundles modifiés/créés : ${result.bundleCount}`);
  console.log(`Fichiers convertis : ${result.processed}`);
  
  if (updateMode) {
    console.log(`Fichiers inchangés : ${result.unchanged}`);
  }
  
  if (result.error > 0) {
    console.log(`Fichiers en erreur : ${result.error}`);
  }
}

main().catch(error => {
  console.error("Une erreur inattendue s'est produite :", error);
  process.exit(1);
});