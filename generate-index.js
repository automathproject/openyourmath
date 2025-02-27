// src/scripts/generate-index.js
/**
 * Script pour générer un fichier d'index statique pour les exercices
 * Usage: node src/scripts/generate-index.js
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

// Formats de fichiers multi-exercices
const MULTI_FILES_PATTERN = ['exercices_multi.json', 'collection_exercices.json', 'amscc.json'];

// Vérifie si un fichier est au format multi-exercices
function isMultiExerciseFile(filename) {
  return MULTI_FILES_PATTERN.some(pattern => filename.includes(pattern));
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

// Indexe un fichier multi-exercices
async function indexMultiFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    const results = [];
    
    // Convertir en chemin relatif (ajoutez ces lignes)
    const relativePath = path.relative(process.cwd(), filePath);
    
    // Format AMSCC: { "Ab12": {...}, "Cd34": {...} }
    if (!Array.isArray(data) && typeof data === 'object') {
      const hasUuidKeys = Object.keys(data).some(key => 
        typeof data[key] === 'object' && data[key].uuid
      );
      
      if (hasUuidKeys) {
        for (const key of Object.keys(data)) {
          const exercise = data[key];
          if (exercise.uuid) {
            const location = {
              filePath: relativePath, // Utilisez le chemin relatif ici
              isMulti: true,
              key
            };
            
            const metadata = {
              uuid: exercise.uuid,
              titre: exercise.titre || exercise.preview || 'Sans titre',
              theme: exercise.theme || ['Sans thème'],
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
        }
        return results;
      }
    }
    
    // Format { exercices: [...] }
    if (data.exercices && Array.isArray(data.exercices)) {
      data.exercices.forEach((exercise, index) => {
        if (exercise.uuid) {
          const location = {
            filePath: relativePath, // Utilisez le chemin relatif ici
            isMulti: true,
            index
          };
          
          const metadata = {
            uuid: exercise.uuid,
            titre: exercise.titre || exercise.preview || 'Sans titre',
            theme: exercise.theme || ['Sans thème'],
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
            filePath: relativePath, // Utilisez le chemin relatif ici
            isMulti: true,
            index
          };
          
          const metadata = {
            uuid: exercise.uuid,
            titre: exercise.titre || exercise.preview || 'Sans titre',
            theme: exercise.theme || ['Sans thème'],
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
    console.error(`Erreur lors de l'indexation du fichier multi-exercices ${filePath}:`, error);
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
    let totalExercises = 0;
    
    // Traiter les fichiers individuels d'abord
    const singleFiles = files.filter(file => !isMultiExerciseFile(file));
    for (const file of singleFiles) {
      const [uuid, location, meta] = await indexSingleFile(file);
      if (uuid) {
        index[uuid] = location;
        if (meta) metadata.push(meta);
        totalExercises++;
      }
    }
    
    // Ensuite traiter les fichiers multi-exercices
    const multiFiles = files.filter(file => isMultiExerciseFile(file));
    for (const file of multiFiles) {
      const results = await indexMultiFile(file);
      for (const [uuid, location, meta] of results) {
        index[uuid] = location;
        if (meta) metadata.push(meta);
        totalExercises++;
      }
    }
    
    // Écrire l'index dans un fichier
    await writeFile(INDEX_FILE, JSON.stringify(index, null, 2), 'utf-8');
    
    // Écrire les métadonnées dans un fichier séparé
    await writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2), 'utf-8');
    
    console.log(`Index généré avec succès: ${totalExercises} exercices indexés`);
    console.log(`-> Fichier d'index: ${INDEX_FILE}`);
    console.log(`-> Fichier de métadonnées: ${METADATA_FILE}`);
  } catch (error) {
    console.error('Erreur lors de la génération de l\'index:', error);
    process.exit(1);
  }
}

// Lancer le programme
main();