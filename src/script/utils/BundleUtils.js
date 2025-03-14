/**
 * Utilitaires pour la gestion des bundles et le traitement de répertoires
 * Avec système de hachage pour la détection des modifications
 */
import fs from 'fs';
import path from 'path';
import { 
  fsPromises, 
  generateUniqueId, 
  ensureDirectoryExists,
  calculateFileHash,
  hasFileChanged 
} from './FileUtils.js';
import { extractLaTeXCommands } from './CommandUtils.js';
import { splitBundle } from './BundleSplitter.js';

/**
 * Fonction pour traiter un fichier .tex et ajouter les données au bundle
 * Utilise un système de hachage pour détecter les modifications
 * @param {string} inputFilePath - Chemin du fichier .tex
 * @param {Object} bundle - L'objet bundle à mettre à jour
 * @param {Array} commandsToExtract - Liste des commandes à extraire
 * @param {Object} options - Options supplémentaires
 * @returns {Promise<string|null>} - Retourne l'UUID du document extrait ou null si ignoré
 */
async function processFile(inputFilePath, bundle, commandsToExtract, options = { update: false }) {
  try {
    const fileName = path.basename(inputFilePath, path.extname(inputFilePath));
    
    // En mode update, vérifier si le fichier a été modifié en utilisant le hash
    if (options.update && options.previousBundle) {
      // Trouver l'entrée correspondante dans le bundle précédent
      const existingEntry = Object.values(options.previousBundle).find(
        item => item.metadata && 
               ((item.metadata.sourceFile && item.metadata.sourceFile === inputFilePath) ||
                (item.metadata.fileName && item.metadata.fileName === fileName))
      );

      if (existingEntry && existingEntry.metadata.fileHash) {
        // Comparer le hash actuel avec le hash stocké
        const hashResult = await hasFileChanged(inputFilePath, existingEntry.metadata.fileHash);
        
        if (!hashResult.changed) {
          // Le fichier source n'a pas été modifié, réutiliser les données existantes
          bundle[existingEntry.uuid] = existingEntry;
          // Ne pas afficher de log pour les fichiers non modifiés
          return {
            uuid: existingEntry.uuid,
            status: 'unchanged'
          };
        }
      }
    }

    // Calculer le hash du fichier
    const fileHash = await calculateFileHash(inputFilePath);
    
    // Lire et traiter le contenu du fichier
    const latexContentRaw = await fsPromises.readFile(inputFilePath, 'utf8');
    const extractedData = await extractLaTeXCommands(latexContentRaw, commandsToExtract, inputFilePath);
    
    // Ajouter des métadonnées sur le fichier source
    extractedData.metadata.sourceFile = inputFilePath;
    extractedData.metadata.fileName = fileName;
    extractedData.metadata.fileHash = fileHash;  // Stocker le hash pour les comparaisons futures
    
    // Ajouter au bundle
    bundle[extractedData.uuid] = extractedData;
    console.log(`Conversion réussie : ${inputFilePath}`);
    
    return {
      uuid: extractedData.uuid,
      status: 'converted'
    };
  } catch (error) {
    console.error(`Erreur lors du traitement du fichier ${inputFilePath} :`, error.message);
    return {
      uuid: null,
      status: 'error'
    };
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
async function createBundleForDirectory(dirPath, outputDir, commandsToExtract, options = { update: false, maxEntriesPerBundle: 400, splitBundles: true }) {
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
      // Faire une copie du bundle existant pour pouvoir comparer plus tard
      bundle = JSON.parse(existingContent);
    } catch (error) {
      console.warn(`Impossible de charger le bundle existant : ${error.message}`);
      console.warn("Un nouveau bundle sera créé.");
    }
  }
  
  let stats = {
    processed: 0,
    unchanged: 0,
    error: 0
  };
  
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
        const result = await processFile(fullPath, bundle, commandsToExtract, 
          { update: options.update, previousBundle });
        
        if (result) {
          stats[result.status]++;
        } else {
          stats.error++;
        }
      }
    }
  }
  
  // Traiter tous les fichiers .tex du répertoire et de ses sous-répertoires
  await findAndProcessTexFiles(dirPath);
  
  // S'il y a des fichiers à convertir ou un bundle existant, écrire le bundle
  if (stats.processed > 0 || (options.update && Object.keys(bundle).length > 0)) {
    try {
      // Créer le répertoire de sortie s'il n'existe pas
      ensureDirectoryExists(outputDir);
      
      await fsPromises.writeFile(bundlePath, JSON.stringify(bundle, null, 2), 'utf8');
      console.log(`Bundle créé : ${bundlePath} (${Object.keys(bundle).length} éléments)`);
      
      // Diviser le bundle si nécessaire et si l'option est activée
      if (options.splitBundles && Object.keys(bundle).length > options.maxEntriesPerBundle) {
        console.log(`Le bundle contient plus de ${options.maxEntriesPerBundle} entrées, division en cours...`);
        const splitResult = await splitBundle(bundlePath, options.maxEntriesPerBundle);
        
        if (splitResult.success) {
          console.log(`Bundle divisé avec succès en ${splitResult.count} sous-bundles.`);
        } else {
          console.error(`Erreur lors de la division du bundle: ${splitResult.error}`);
        }
      }
      
      return { 
        processed: stats.processed,
        unchanged: stats.unchanged,
        error: stats.error,
        bundleCount: 1
      };
    } catch (error) {
      console.error(`Erreur lors de l'écriture du bundle ${bundlePath} :`, error.message);
    }
  }
  
  return { 
    processed: stats.processed,
    unchanged: stats.unchanged,
    error: stats.error,
    bundleCount: 0
  };
}

// Les fonctions processSubDirectories et processSpecialStructure restent inchangées
// car elles utilisent createBundleForDirectory qui intègre maintenant la logique de hachage

/**
 * Traite uniquement les sous-répertoires immédiats du répertoire d'entrée
 * et crée un bundle pour chaque sous-répertoire
 * @param {string} rootDir - Répertoire racine contenant les sous-répertoires à traiter
 * @param {string} outputDir - Répertoire de sortie pour les bundles
 * @param {Array} commandsToExtract - Liste des commandes à extraire
 * @param {Object} options - Options supplémentaires
 * @returns {Promise<Object>} - Statistiques sur le nombre de fichiers traités
 */
async function processSubDirectories(rootDir, outputDir, commandsToExtract, options = { update: false, maxEntriesPerBundle: 400, splitBundles: true }) {
  // Lister les sous-répertoires immédiats
  const entries = await fsPromises.readdir(rootDir, { withFileTypes: true });
  const subDirs = entries.filter(entry => entry.isDirectory());
  
  let totalStats = {
    processed: 0,
    unchanged: 0,
    error: 0,
    bundleCount: 0
  };
  
  console.log(`Traitement des ${subDirs.length} sous-répertoires de ${rootDir}...`);
  
  // Traiter chaque sous-répertoire
  for (const dir of subDirs) {
    const subDirPath = path.join(rootDir, dir.name);
    
    // Créer un bundle pour ce sous-répertoire
    const result = await createBundleForDirectory(subDirPath, outputDir, commandsToExtract, options);
    
    totalStats.processed += result.processed;
    totalStats.unchanged += result.unchanged;
    totalStats.error += result.error;
    totalStats.bundleCount += result.bundleCount;
  }
  
  return totalStats;
}

/**
 * Détermine si un répertoire doit être traité comme une collection de sous-répertoires
 * ou comme un répertoire à traiter directement
 * @param {string} dirName - Nom du répertoire à analyser
 * @returns {boolean} - true si le répertoire contient des sous-répertoires à traiter individuellement
 */
function isDeeplyNestedDirectory(dirName) {
  // Liste des répertoires qui contiennent des sous-répertoires à traiter individuellement
  // Cette liste peut être étendue facilement
  const deeplyNestedDirs = ['exo7'];
  return deeplyNestedDirs.includes(dirName.toLowerCase());
}

/**
 * Traite la structure en considérant chaque sous-répertoire de premier niveau,
 * et pour certains répertoires spéciaux, traite également leurs sous-répertoires.
 * @param {string} rootDir - Répertoire racine de la structure
 * @param {string} outputDir - Répertoire de sortie pour les bundles
 * @param {Array} commandsToExtract - Liste des commandes à extraire
 * @param {Object} options - Options supplémentaires
 * @returns {Promise<Object>} - Statistiques sur le nombre de fichiers traités
 */
async function processStructureGenerically(rootDir, outputDir, commandsToExtract, options = { update: false, maxEntriesPerBundle: 400, splitBundles: true }) {
  // Lister les sous-répertoires immédiats
  const entries = await fsPromises.readdir(rootDir, { withFileTypes: true });
  const subDirs = entries.filter(entry => entry.isDirectory());
  
  let totalStats = {
    processed: 0,
    unchanged: 0,
    error: 0,
    bundleCount: 0
  };
  
  console.log(`Traitement de la structure dans ${rootDir}...`);
  
  // Traiter chaque sous-répertoire de premier niveau
  for (const dir of subDirs) {
    const subDirPath = path.join(rootDir, dir.name);
    const subDirName = dir.name;
    
    if (isDeeplyNestedDirectory(subDirName)) {
      // Pour les répertoires qui nécessitent un traitement de leurs sous-répertoires
      console.log(`Traitement des sous-répertoires de ${subDirName}...`);
      const nestedEntries = await fsPromises.readdir(subDirPath, { withFileTypes: true });
      const nestedSubDirs = nestedEntries.filter(entry => entry.isDirectory());
      
      for (const nestedDir of nestedSubDirs) {
        const nestedDirPath = path.join(subDirPath, nestedDir.name);
        console.log(`Traitement du sous-répertoire ${subDirName}/${nestedDir.name}...`);
        
        const result = await createBundleForDirectory(nestedDirPath, outputDir, commandsToExtract, options);
        
        totalStats.processed += result.processed;
        totalStats.unchanged += result.unchanged;
        totalStats.error += result.error;
        totalStats.bundleCount += result.bundleCount;
      }
    } else {
      // Pour tout autre répertoire, création d'un bundle directement
      console.log(`Traitement du répertoire ${subDirName}...`);
      const result = await createBundleForDirectory(subDirPath, outputDir, commandsToExtract, options);
      
      totalStats.processed += result.processed;
      totalStats.unchanged += result.unchanged;
      totalStats.error += result.error;
      totalStats.bundleCount += result.bundleCount;
    }
  }
  
  return totalStats;
}

// Exporter les fonctions publiques
export {
  processFile,
  createBundleForDirectory,
  processSubDirectories,
  processStructureGenerically
};