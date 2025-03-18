/**
 * Utilitaires pour la création et la gestion des bundles
 * src/script/utils/BundleUtils.js
 */
import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';
import { ensureDirectoryExists } from './FileUtils.js';

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
  // Implémentation existante...
  const dirName = path.basename(dirPath);
  // Construire le chemin de base pour le bundle (sans extension)
  const bundleBasePath = path.join(outputDir, `${dirName}-bundle`);
  // Chemin standard du bundle
  const standardBundlePath = `${bundleBasePath}.json`;
  // Chemin du bundle "full" qui est créé par le splitter
  const fullBundlePath = `${bundleBasePath}-full.json`;
  
  console.log(`Traitement du répertoire ${dirPath}...`);
  
  // Initialiser le bundle
  let bundle = {};
  let previousBundle = null;
  let bundlePath = null; // Le chemin qui sera utilisé pour l'écriture
  
  // S'assurer que le répertoire de sortie existe
  ensureDirectoryExists(outputDir);
  
  // En mode update, chercher et charger le bundle existant
  if (options.update) {
    // Vérifier d'abord le bundle "full" (prioritaire car contient toutes les données)
    if (fs.existsSync(fullBundlePath)) {
      bundlePath = fullBundlePath;
    } 
    // Ensuite vérifier le bundle standard
    else if (fs.existsSync(standardBundlePath)) {
      bundlePath = standardBundlePath;
    } 
    // Sinon chercher des parties de bundle
    else {
      // Chercher des fichiers potentiels de type "part"
      const files = fs.readdirSync(outputDir);
      const partBundles = files.filter(file => 
        file.startsWith(`${dirName}-bundle-part`) && file.endsWith('.json')
      );
      
      if (partBundles.length > 0) {
        // Trier les parties pour prendre la partie 1 (qui contient généralement les infos de base)
        partBundles.sort();
        bundlePath = path.join(outputDir, partBundles[0]);
      }
    }
    
    // Si un bundle a été trouvé, le charger
    if (bundlePath) {
      try {
        const existingContent = await fsPromises.readFile(bundlePath, 'utf8');
        previousBundle = JSON.parse(existingContent);
        console.log(`Bundle existant chargé: ${bundlePath} (${Object.keys(previousBundle).length} entrées)`);
      } catch (error) {
        console.warn(`Impossible de charger le bundle existant : ${error.message}`);
        console.warn("Un nouveau bundle sera créé.");
        previousBundle = null;
      }
    } else {
      console.log(`Aucun bundle existant trouvé pour ${dirName}`);
    }
  }
  
  // Si aucun chemin n'a été défini, utiliser le chemin standard pour l'écriture
  if (!bundlePath) {
    bundlePath = standardBundlePath;
  }
  
  let stats = {
    processed: 0,
    unchanged: 0,
    error: 0,
    modified: false, // Indique si le bundle a été modifié
    total: 0 // Total des fichiers à traiter
  };
  
  // Fonction pour compter le nombre total de fichiers .tex
  async function countTexFiles(currentPath) {
    let count = 0;
    const entries = await fsPromises.readdir(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        count += await countTexFiles(fullPath);
      } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.tex') {
        count++;
      }
    }
    
    return count;
  }
  
  // Compter d'abord le nombre total de fichiers
  stats.total = await countTexFiles(dirPath);
  console.log(`${stats.total} fichiers .tex à traiter...`);
  
  // Pour afficher la progression
  let processedCounter = 0;
  const progressStep = Math.max(1, Math.floor(stats.total / 10)); // Afficher la progression toutes les ~10%
  
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
        
        processedCounter++;
        
        // Afficher la progression à intervalles réguliers
        if (processedCounter % progressStep === 0 || processedCounter === stats.total) {
          const percentage = Math.floor((processedCounter / stats.total) * 100);
          process.stdout.write(`\rProgression: ${processedCounter}/${stats.total} (${percentage}%)` + 
                               ` | Inchangés: ${stats.unchanged}, Convertis: ${stats.processed}, Erreurs: ${stats.error}`);
        }
        
        if (result) {
          stats[result.status]++;
          if (result.status === 'converted') {
            stats.modified = true; // Marquer le bundle comme modifié
            console.log(`\nConversion réussie : ${path.basename(fullPath)}`);
          }
        } else {
          stats.error++;
        }
      }
    }
  }
  
  // Traiter tous les fichiers .tex du répertoire et de ses sous-répertoires
  await findAndProcessTexFiles(dirPath);
  
  // Assurer que la dernière ligne de progression reste visible
  console.log(''); // Ligne vide pour s'assurer que la prochaine sortie commence sur une nouvelle ligne
  
  // Résumé final
  console.log(`\nRésumé: ${stats.unchanged} inchangés, ${stats.processed} convertis, ${stats.error} erreurs`);
  
  // S'il y a des fichiers à traiter
  if (stats.processed > 0 || stats.unchanged > 0) {
    try {
      // Décider si nous devons écrire le bundle
      // Écrire seulement si des fichiers ont été modifiés ou si nous ne sommes pas en mode update
      if (stats.modified || !options.update) {
        // Uniquement en mode update et avec des modifications OU en mode création
        await fsPromises.writeFile(bundlePath, JSON.stringify(bundle, null, 2), 'utf8');
        console.log(`Bundle ${options.update ? 'mis à jour' : 'créé'} : ${bundlePath} (${Object.keys(bundle).length} éléments)`);
        
        // Diviser le bundle si nécessaire et si l'option est activée
        // UNIQUEMENT si nous avons effectivement modifié ou créé le bundle
        if (options.splitBundles && Object.keys(bundle).length > options.maxEntriesPerBundle) {
          // Vérifier si le fichier est déjà une partie (contient "part" dans son nom)
          const isAlreadyPart = bundlePath.includes('-part');
          
          if (!isAlreadyPart) {
            console.log(`Le bundle contient plus de ${options.maxEntriesPerBundle} entrées, division en cours...`);
            const splitResult = await splitBundle(bundlePath, options.maxEntriesPerBundle);
            
            if (splitResult.success) {
              console.log(`Bundle divisé avec succès en ${splitResult.count} sous-bundles.`);
            } else {
              console.error(`Erreur lors de la division du bundle: ${splitResult.error}`);
            }
          } else {
            console.log(`Le bundle est déjà une partie, pas de division supplémentaire: ${bundlePath}`);
          }
        }
        
        // Si nous avons réellement écrit quelque chose, incrémenter le compteur
        return { 
          processed: stats.processed,
          unchanged: stats.unchanged,
          error: stats.error,
          bundleCount: 1  // Un bundle a été créé/mis à jour
        };
      } else {
        console.log(`Aucune modification détectée, le bundle reste inchangé: ${bundlePath}`);
        // Si aucune modification n'a été apportée, ne pas incrémenter le compteur
        return { 
          processed: stats.processed,
          unchanged: stats.unchanged,
          error: stats.error,
          bundleCount: 0  // Aucun bundle n'a été modifié
        };
      }
    } catch (error) {
      console.error(`Erreur lors de l'écriture du bundle ${bundlePath} :`, error.message);
    }
  }
  
  // Aucun bundle n'a été créé/modifié
  return { 
    processed: stats.processed,
    unchanged: stats.unchanged,
    error: stats.error,
    bundleCount: 0
  };
}

/**
 * Traite les sous-répertoires d'un répertoire donné en créant un bundle pour chacun
 * @param {string} directoryPath - Répertoire parent contenant les sous-répertoires à traiter
 * @param {string} outputDir - Répertoire de sortie pour les bundles
 * @param {Array} commandsToExtract - Liste des commandes à extraire
 * @param {Object} options - Options supplémentaires
 * @returns {Promise<Object>} - Statistiques sur le nombre de fichiers traités
 */
async function processSubDirectories(directoryPath, outputDir, commandsToExtract, options = {}) {
  const entries = await fsPromises.readdir(directoryPath, { withFileTypes: true });
  const subDirectories = entries.filter(entry => entry.isDirectory());
  
  let totalStats = {
    processed: 0,
    unchanged: 0,
    error: 0,
    bundleCount: 0
  };
  
  // Parcourir tous les sous-répertoires
  for (const subDir of subDirectories) {
    const subDirPath = path.join(directoryPath, subDir.name);
    
    // Créer un bundle pour ce sous-répertoire
    const stats = await createBundleForDirectory(
      subDirPath,
      outputDir,
      commandsToExtract,
      options
    );
    
    // Mettre à jour les statistiques totales
    totalStats.processed += stats.processed || 0;
    totalStats.unchanged += stats.unchanged || 0;
    totalStats.error += stats.error || 0;
    totalStats.bundleCount += stats.bundleCount || 0;
  }
  
  return totalStats;
}

/**
 * Traite la structure de répertoires de manière générique 
 * (pour les structures complexes comme src/catégorie/sous-catégorie)
 * @param {string} directoryPath - Répertoire racine à traiter
 * @param {string} outputDir - Répertoire de sortie pour les bundles
 * @param {Array} commandsToExtract - Liste des commandes à extraire
 * @param {Object} options - Options supplémentaires
 * @returns {Promise<Object>} - Statistiques sur le nombre de fichiers traités
 */
async function processStructureGenerically(directoryPath, outputDir, commandsToExtract, options = {}) {
  console.log(`Traitement générique de la structure: ${directoryPath}`);
  
  const entries = await fsPromises.readdir(directoryPath, { withFileTypes: true });
  const subDirectories = entries.filter(entry => entry.isDirectory());
  
  let totalStats = {
    processed: 0,
    unchanged: 0,
    error: 0,
    bundleCount: 0
  };
  
  // Parcourir les catégories principales (premier niveau)
  for (const category of subDirectories) {
    const categoryPath = path.join(directoryPath, category.name);
    console.log(`Analyse de la catégorie: ${category.name}`);
    
    try {
      // Vérifier s'il y a des sous-répertoires dans cette catégorie
      const subEntries = await fsPromises.readdir(categoryPath, { withFileTypes: true });
      const subSubDirectories = subEntries.filter(entry => entry.isDirectory());
      
      if (subSubDirectories.length > 0) {
        // Si cette catégorie contient des sous-répertoires, les traiter
        console.log(`La catégorie ${category.name} contient ${subSubDirectories.length} sous-répertoires.`);
        
        for (const subCategory of subSubDirectories) {
          const subCategoryPath = path.join(categoryPath, subCategory.name);
          console.log(`Traitement du sous-répertoire: ${subCategory.name}`);
          
          // Créer un bundle pour ce sous-répertoire
          const stats = await createBundleForDirectory(
            subCategoryPath,
            outputDir,
            commandsToExtract,
            options
          );
          
          // Mettre à jour les statistiques totales
          totalStats.processed += stats.processed || 0;
          totalStats.unchanged += stats.unchanged || 0;
          totalStats.error += stats.error || 0;
          totalStats.bundleCount += stats.bundleCount || 0;
        }
      } else {
        // Si cette catégorie ne contient pas de sous-répertoires,
        // la traiter directement comme un répertoire à convertir
        console.log(`Traitement direct de la catégorie: ${category.name}`);
        
        const stats = await createBundleForDirectory(
          categoryPath,
          outputDir,
          commandsToExtract,
          options
        );
        
        // Mettre à jour les statistiques totales
        totalStats.processed += stats.processed || 0;
        totalStats.unchanged += stats.unchanged || 0;
        totalStats.error += stats.error || 0;
        totalStats.bundleCount += stats.bundleCount || 0;
      }
    } catch (error) {
      console.error(`Erreur lors du traitement de la catégorie ${category.name}:`, error);
      totalStats.error++;
    }
  }
  
  return totalStats;
}

/**
 * Divise un bundle volumineux en plusieurs parties plus petites
 * @param {string} bundlePath - Chemin du fichier de bundle à diviser
 * @param {number} maxEntriesPerBundle - Nombre maximum d'entrées par partie
 * @returns {Promise<Object>} - Résultat de la division
 */
async function splitBundle(bundlePath, maxEntriesPerBundle) {
  try {
    // Lire le contenu du bundle
    const bundleContent = await fsPromises.readFile(bundlePath, 'utf8');
    const bundleData = JSON.parse(bundleContent);
    
    // Obtenir les clés du bundle et compter le nombre d'entrées
    const keys = Object.keys(bundleData);
    const totalEntries = keys.length;
    
    // Calculer le nombre de parties nécessaires
    const numParts = Math.ceil(totalEntries / maxEntriesPerBundle);
    
    if (numParts <= 1) {
      return { success: false, error: 'Le bundle est trop petit pour être divisé' };
    }
    
    // Créer une copie du bundle original avec le suffixe "-full"
    const fullBundlePath = bundlePath.replace('.json', '-full.json');
    await fsPromises.writeFile(fullBundlePath, bundleContent, 'utf8');
    
    // Diviser le bundle en parties
    for (let part = 0; part < numParts; part++) {
      const startIdx = part * maxEntriesPerBundle;
      const endIdx = Math.min((part + 1) * maxEntriesPerBundle, totalEntries);
      
      // Créer un objet pour cette partie
      const partData = {};
      for (let i = startIdx; i < endIdx; i++) {
        const key = keys[i];
        partData[key] = bundleData[key];
      }
      
      // Construire le chemin de la partie
      const partPath = bundlePath.replace('.json', `-part${part + 1}.json`);
      
      // Écrire la partie
      await fsPromises.writeFile(partPath, JSON.stringify(partData, null, 2), 'utf8');
      console.log(`Partie ${part + 1}/${numParts} créée: ${partPath} (${Object.keys(partData).length} entrées)`);
    }
    
    return { success: true, count: numParts };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Fonction pour traiter un fichier .tex et l'ajouter au bundle
 * @param {string} filePath - Chemin du fichier à traiter
 * @param {Object} bundle - Bundle auquel ajouter l'entrée
 * @param {Array} commandsToExtract - Liste des commandes à extraire
 * @param {Object} options - Options supplémentaires
 * @returns {Object|null} - Résultat du traitement du fichier
 */
async function processFile(filePath, bundle, commandsToExtract, options = {}) {
  try {
    const fileContent = await fsPromises.readFile(filePath, 'utf8');
    
    // Extraire l'UUID ou le nom du fichier pour l'utiliser comme clé
    let key = extractUUID(fileContent) || path.basename(filePath, '.tex');
    
    // En mode update, vérifier si l'entrée existe déjà et si elle a été modifiée
    if (options.update && options.previousBundle && options.previousBundle[key]) {
      // Hacher le contenu du fichier pour détecter les modifications
      const contentHash = hashContent(fileContent);
      
      // Si l'entrée existe déjà et a le même hash, la sauter
      if (options.previousBundle[key]._hash === contentHash) {
        // Copier l'entrée existante dans le nouveau bundle
        bundle[key] = options.previousBundle[key];
        return { status: 'unchanged' };
      }
    }
    
    // Initialiser une nouvelle entrée dans le bundle
    bundle[key] = {
      _file: path.basename(filePath),
      _path: filePath.replace(/\\/g, '/'), // Normaliser les chemins pour Windows/Linux
      metadata: {}
    };
    
    // Extraire toutes les commandes requises
    for (const cmd of commandsToExtract) {
      extractCommandContent(fileContent, cmd, bundle[key]);
    }
    
    // Ajouter un hash du contenu pour détecter les modifications futures
    bundle[key]._hash = hashContent(fileContent);
    
    return { status: 'converted' };
  } catch (error) {
    console.error(`Erreur lors du traitement du fichier ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Extrait l'UUID d'un fichier LaTeX
 * @param {string} content - Contenu du fichier LaTeX
 * @returns {string|null} - UUID extrait ou null si non trouvé
 */
function extractUUID(content) {
  const match = content.match(/\\uuid{([^}]+)}/);
  return match ? match[1] : null;
}

/**
 * Calcule un hash simple du contenu d'un fichier
 * @param {string} content - Contenu du fichier
 * @returns {string} - Hash calculé
 */
function hashContent(content) {
  // Simplification : utiliser la longueur et des parties du contenu pour créer un "hash" rapide
  // Dans une implémentation réelle, utilisez une bibliothèque de hachage comme crypto
  const length = content.length;
  const start = content.slice(0, 100);
  const end = content.slice(-100);
  return `${length}_${start.length}_${end.length}`;
}

/**
 * Extrait le contenu d'une commande LaTeX et l'ajoute à l'objet cible
 * @param {string} content - Contenu du fichier LaTeX
 * @param {Object} commandInfo - Informations sur la commande à extraire
 * @param {Object} target - Objet cible où stocker le contenu extrait
 */
function extractCommandContent(content, commandInfo, target) {
  const { name, jsonKey, isContent, isVerbatim } = commandInfo;
  const regex = new RegExp(`\\\\${name}{([^}]+)}`, 'g');
  
  let match;
  while ((match = regex.exec(content)) !== null) {
    const extractedContent = match[1];
    
    // Déterminer l'objet cible en fonction de la clé JSON
    const keyParts = jsonKey.split('.');
    let currentTarget = target;
    
    // Naviguer dans l'objet pour atteindre la cible finale
    for (let i = 0; i < keyParts.length - 1; i++) {
      const part = keyParts[i];
      if (!currentTarget[part]) {
        currentTarget[part] = {};
      }
      currentTarget = currentTarget[part];
    }
    
    const finalKey = keyParts[keyParts.length - 1];
    
    if (isContent) {
      // Pour les commandes de contenu, ajouter à un tableau
      if (!currentTarget[finalKey]) {
        currentTarget[finalKey] = [];
      }
      
      currentTarget[finalKey].push({
        type: name,
        content: isVerbatim ? extractedContent : cleanLatexContent(extractedContent)
      });
    } else {
      // Pour les commandes de métadonnées, stocker directement
      currentTarget[finalKey] = isVerbatim ? extractedContent : cleanLatexContent(extractedContent);
    }
  }
}

/**
 * Nettoie le contenu LaTeX pour le stocker dans le JSON
 * @param {string} content - Contenu LaTeX à nettoyer
 * @returns {string} - Contenu nettoyé
 */
function cleanLatexContent(content) {
  // Exemple simple de nettoyage
  // Dans une implémentation réelle, vous voudrez peut-être traiter les commandes LaTeX spéciales
  return content.trim();
}

// Exporter les fonctions nécessaires
export {
  createBundleForDirectory,
  processSubDirectories,
  processStructureGenerically,
  splitBundle
};