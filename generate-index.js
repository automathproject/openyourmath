// generate-index.js
/**
 * Script pour générer un fichier d'index statique pour les exercices
 * Usage: node generate-index.js
 */
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

// Convertir les fonctions fs en promesses
const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const stat = promisify(fs.stat);

// Répertoires et fichiers
const CONTENT_DIR = path.resolve('static/content/json2');
const INDEX_DIR = path.resolve('static/cache');
const INDEX_FILE = path.join(INDEX_DIR, 'exercises-index.json');
const METADATA_FILE = path.join(INDEX_DIR, 'exercises-metadata.json');

// Détection de fichiers bundle
function isBundleFile(filename) {
  // Patterns pour les fichiers multi-exercices et bundles
  const BUNDLE_PATTERNS = [
    'exercices_multi.json', 
    'collection_exercices.json', 
    'amscc.json',
    'bundle.json',
    '-bundle.json',
    'bundle-part',
  ];
  
  return BUNDLE_PATTERNS.some(pattern => filename.includes(pattern));
}

// Indexe un fichier individuel
async function indexSingleFile(filePath) {
  const uuid = path.basename(filePath, '.json');
  
  // Stocker le chemin relatif au lieu du chemin absolu
  const relativePath = path.relative(process.cwd(), filePath);
  
  const location = {
    filePath: relativePath, // Chemin relatif
    isMulti: false
  };
  
  try {
    const content = await readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    const metadata = {
      uuid,
      titre: data.titre || data.preview || 'Sans titre',
      theme: data.theme || ['Sans thème'],
      metadata: {
        chapitre: data.metadata?.chapitre || 'Sans chapitre',
        sousChapitre: data.metadata?.sousChapitre || 'Sans sous-chapitre',
        auteur: data.metadata?.auteur,
        organisation: data.metadata?.organisation,
        createdAt: data.metadata?.createdAt,
        updatedAt: data.metadata?.updatedAt
      }
    };
    
    return [uuid, location, metadata];
  } catch (error) {
    console.error(`Erreur lors de l'indexation du fichier ${filePath}:`, error);
    return [uuid, location];
  }
}

// Indexe un fichier multi-exercices ou bundle
async function indexBundleFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    const results = [];
    
    // Convertir en chemin relatif
    const relativePath = path.relative(process.cwd(), filePath);
    
    // Format bundle avec UUIDs comme clés: { "Ab12": {...}, "Cd34": {...} }
    if (!Array.isArray(data) && typeof data === 'object') {
      const keys = Object.keys(data);
      
      // Vérifier si c'est un objet avec des exercices comme valeurs
      if (keys.length > 0 && typeof data[keys[0]] === 'object') {
        // Parcourir toutes les clés du bundle
        for (const key of keys) {
          const exercise = data[key];
          
          // Obtenir l'UUID - soit l'UUID défini dans l'exercice, soit la clé
          const uuid = exercise.uuid || key;
          
          const location = {
            filePath: relativePath,
            isMulti: true,
            key
          };
          
          const metadata = {
            uuid,
            titre: exercise.titre || exercise.preview || 'Sans titre',
            theme: Array.isArray(exercise.theme) ? exercise.theme : 
                  (exercise.theme ? [exercise.theme] : ['Sans thème']),
            metadata: {
              chapitre: exercise.metadata?.chapitre || 'Sans chapitre',
              sousChapitre: exercise.metadata?.sousChapitre || 'Sans sous-chapitre',
              auteur: exercise.metadata?.auteur,
              organisation: exercise.metadata?.organisation,
              createdAt: exercise.metadata?.createdAt,
              updatedAt: exercise.metadata?.updatedAt
            }
          };
          
          results.push([uuid, location, metadata]);
        }
        return results;
      }
    }
    
    // Format { exercices: [...] }
    if (data.exercices && Array.isArray(data.exercices)) {
      data.exercices.forEach((exercise, index) => {
        if (exercise.uuid) {
          const location = {
            filePath: relativePath,
            isMulti: true,
            index
          };
          
          const metadata = {
            uuid: exercise.uuid,
            titre: exercise.titre || exercise.preview || 'Sans titre',
            theme: Array.isArray(exercise.theme) ? exercise.theme : 
                  (exercise.theme ? [exercise.theme] : ['Sans thème']),
            metadata: {
              chapitre: exercise.metadata?.chapitre || 'Sans chapitre',
              sousChapitre: exercise.metadata?.sousChapitre || 'Sans sous-chapitre',
              auteur: exercise.metadata?.auteur,
              organisation: exercise.metadata?.organisation,
              createdAt: exercise.metadata?.createdAt,
              updatedAt: exercise.metadata?.updatedAt
            }
          };
          
          results.push([exercise.uuid, location, metadata]);
        }
      });
      return results;
    }
    
    // Format [...] (tableau direct)
    if (Array.isArray(data)) {
      data.forEach((exercise, index) => {
        if (exercise.uuid) {
          const location = {
            filePath: relativePath,
            isMulti: true,
            index
          };
          
          const metadata = {
            uuid: exercise.uuid,
            titre: exercise.titre || exercise.preview || 'Sans titre',
            theme: Array.isArray(exercise.theme) ? exercise.theme : 
                  (exercise.theme ? [exercise.theme] : ['Sans thème']),
            metadata: {
              chapitre: exercise.metadata?.chapitre || 'Sans chapitre',
              sousChapitre: exercise.metadata?.sousChapitre || 'Sans sous-chapitre',
              auteur: exercise.metadata?.auteur,
              organisation: exercise.metadata?.organisation,
              createdAt: exercise.metadata?.createdAt,
              updatedAt: exercise.metadata?.updatedAt
            }
          };
          
          results.push([exercise.uuid, location, metadata]);
        }
      });
      return results;
    }
    
    return [];
  } catch (error) {
    console.error(`Erreur lors de l'indexation du fichier bundle ${filePath}:`, error);
    return [];
  }
}

// Scanne récursivement un dossier pour trouver tous les fichiers JSON
async function scanDirectory(dir) {
  const files = [];
  
  try {
    const items = await readdir(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        const subFiles = await scanDirectory(fullPath);
        files.push(...subFiles);
      } else if (item.isFile() && item.name.endsWith('.json')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Erreur lors du scan du dossier ${dir}:`, error);
  }
  
  return files;
}

// Programme principal
async function main() {
  try {
    console.log('Génération de l\'index des exercices...');
    
    // Vérifier que le répertoire de contenu existe
    if (!fs.existsSync(CONTENT_DIR)) {
      console.error(`Le répertoire de contenu n'existe pas: ${CONTENT_DIR}`);
      process.exit(1);
    }
    
    // Créer le répertoire d'index s'il n'existe pas
    if (!fs.existsSync(INDEX_DIR)) {
      await mkdir(INDEX_DIR, { recursive: true });
    }
    
    // Scanner le répertoire de contenu
    const files = await scanDirectory(CONTENT_DIR);
    console.log(`Trouvé ${files.length} fichiers JSON`);
    
    // Indexer les fichiers
    const index = {};
    const metadata = [];
    
    // Compteurs pour les statistiques
    let totalExercises = 0;
    let individualExercises = 0;
    let bundleExercises = 0;
    let bundleFilesCount = 0;
    
    // Séparer les fichiers individuels et les bundles
    const singleFiles = files.filter(file => !isBundleFile(file));
    const bundleFiles = files.filter(file => isBundleFile(file));
    bundleFilesCount = bundleFiles.length;
    
    console.log(`Traitement de ${singleFiles.length} fichiers individuels...`);
    
    // Traiter les fichiers individuels d'abord
    for (const file of singleFiles) {
      const [uuid, location, meta] = await indexSingleFile(file);
      if (uuid) {
        index[uuid] = location;
        if (meta) metadata.push(meta);
        totalExercises++;
        individualExercises++;
      }
    }
    
    console.log(`Traitement de ${bundleFilesCount} fichiers bundle...`);
    
    // Ensuite traiter les fichiers bundle
    for (const file of bundleFiles) {
      const results = await indexBundleFile(file);
      for (const [uuid, location, meta] of results) {
        index[uuid] = location;
        if (meta) metadata.push(meta);
        totalExercises++;
        bundleExercises++;
      }
    }
    
    // Écrire l'index dans un fichier
    await writeFile(INDEX_FILE, JSON.stringify(index, null, 2), 'utf-8');
    
    // Écrire les métadonnées dans un fichier séparé
    await writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2), 'utf-8');
    
    console.log(`\nIndex généré avec succès:`);
    console.log(`- Total: ${totalExercises} exercices indexés`);
    console.log(`- ${individualExercises} exercices dans des fichiers individuels`);
    console.log(`- ${bundleExercises} exercices dans ${bundleFilesCount} fichiers bundle`);
    console.log(`\nFichiers générés:`);
    console.log(`- Index: ${INDEX_FILE}`);
    console.log(`- Métadonnées: ${METADATA_FILE}`);
  } catch (error) {
    console.error('Erreur lors de la génération de l\'index:', error);
    process.exit(1);
  }
}

// Lancer le programme
main();