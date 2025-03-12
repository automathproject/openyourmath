#!/usr/bin/env node
/**
 * Script de migration pour convertir les fichiers JSON individuels en bundles
 * Usage: node migrate-to-bundles.js <sourceDir> <outputBundlePath>
 * 
 * Par exemple:
 * node migrate-to-bundles.js static/content/json2/2-L1 static/content/json2/bundles/2-L1-bundle.json
 */

import fs from 'fs/promises';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';

/**
 * Migre les fichiers JSON individuels vers un fichier bundle
 * @param {string} sourceDir - Répertoire contenant les fichiers JSON individuels
 * @param {string} outputPath - Chemin du fichier bundle à créer
 */
async function migrateToBundle(sourceDir, outputPath) {
  // Vérifier si le répertoire source existe
  try {
    await fs.access(sourceDir);
  } catch (error) {
    console.error(`Le répertoire source '${sourceDir}' n'existe pas.`);
    process.exit(1);
  }

  // Créer le répertoire de destination si nécessaire
  const outputDir = path.dirname(outputPath);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
    console.log(`Répertoire de destination '${outputDir}' créé.`);
  }

  console.log(`Début de la migration des fichiers de '${sourceDir}' vers '${outputPath}'...`);

  // Objet qui contiendra tous les fichiers JSON
  const bundle = {};
  // Compteur pour les fichiers traités
  let processedCount = 0;
  // Liste des fichiers qui vont être supprimés après la migration
  const filesToDelete = [];
  
  // Fonction récursive pour parcourir les sous-répertoires
  async function processDirectory(dir) {
    // Lire tous les fichiers du répertoire
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Parcourir récursivement les sous-répertoires
        await processDirectory(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        // Ignorer les fichiers qui sont déjà des bundles
        if (entry.name.includes('bundle') || 
            entry.name.includes('exercices_multi') || 
            entry.name.includes('collection_exercices') ||
            entry.name.includes('amscc')) {
          console.log(`Ignoré (bundle existant): ${fullPath}`);
          continue;
        }
        
        try {
          // Lire le contenu du fichier
          const fileContent = await fs.readFile(fullPath, 'utf8');
          // Parser le contenu JSON
          const jsonData = JSON.parse(fileContent);
          
          // Déterminer la clé pour ce fichier dans le bundle
          let key;
          
          // Priorité 1: Utiliser l'UUID s'il existe
          if (jsonData.uuid) {
            key = jsonData.uuid;
          } 
          // Priorité 2: Utiliser le nom du fichier sans extension
          else {
            key = path.basename(entry.name, '.json');
            // Ajouter un UUID si manquant
            jsonData.uuid = key;
          }
          
          // Ajouter au bundle
          bundle[key] = jsonData;
          processedCount++;
          
          // Ajouter le fichier à la liste des fichiers à supprimer
          filesToDelete.push(fullPath);
          
          if (processedCount % 100 === 0) {
            console.log(`${processedCount} fichiers traités...`);
          }
        } catch (error) {
          console.error(`Erreur lors du traitement du fichier ${fullPath}:`, error.message);
        }
      }
    }
  }
  
  // Démarrer le traitement
  await processDirectory(sourceDir);
  
  // Si aucun fichier n'a été traité, annuler la migration
  if (processedCount === 0) {
    console.log("Aucun fichier JSON individuel trouvé à migrer.");
    process.exit(0);
  }
  
  // Écrire le bundle dans le fichier de sortie
  try {
    await fs.writeFile(outputPath, JSON.stringify(bundle, null, 2), 'utf8');
    console.log(`Bundle créé avec succès: ${outputPath}`);
    console.log(`Nombre total d'éléments dans le bundle: ${Object.keys(bundle).length}`);
    
    // Demander confirmation avant de supprimer les fichiers individuels
    console.log(`\nLes ${filesToDelete.length} fichiers JSON originaux peuvent maintenant être supprimés.`);
    console.log("Pour supprimer ces fichiers, exécutez la même commande avec l'option --delete");
    console.log("Par exemple:");
    console.log(`node migrate-to-bundles.js ${sourceDir} ${outputPath} --delete`);
    
    // Si l'option --delete est présente, supprimer les fichiers
    if (process.argv.includes('--delete')) {
      console.log("\nSuppression des fichiers originaux...");
      
      for (const file of filesToDelete) {
        try {
          await fs.unlink(file);
          if (filesToDelete.indexOf(file) % 100 === 0) {
            console.log(`${filesToDelete.indexOf(file) + 1}/${filesToDelete.length} fichiers supprimés...`);
          }
        } catch (error) {
          console.error(`Erreur lors de la suppression du fichier ${file}:`, error.message);
        }
      }
      
      console.log("Suppression terminée!");
    }
    
  } catch (error) {
    console.error(`Erreur lors de l'écriture du fichier de sortie:`, error.message);
  }
}

// Vérifier les arguments
if (process.argv.length < 4) {
  console.error("Usage: node migrate-to-bundles.js <sourceDir> <outputBundlePath> [--delete]");
  console.error("  --delete: Supprime les fichiers individuels après la migration");
  process.exit(1);
}

// Exécuter la fonction avec les arguments
const sourceDir = process.argv[2];
const outputPath = process.argv[3];
migrateToBundle(sourceDir, outputPath);