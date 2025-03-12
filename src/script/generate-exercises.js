// src/script/generate-exercises.js
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { generatePreview } from './PreviewUtils.js';

// Obtenir le chemin du répertoire courant
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Définir les chemins relatifs par rapport à la racine du projet
const PROJECT_ROOT = path.join(__dirname, '../..');
const INPUT_DIR = path.join(PROJECT_ROOT, 'static/content/json2');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'static/data/exercises.json');
const OUTPUT_INDEX_FILE = path.join(PROJECT_ROOT, 'static/data/exercises-index.json');

// Logging des chemins pour debug
console.log('Project root:', PROJECT_ROOT);
console.log('Input directory:', INPUT_DIR);
console.log('Output file:', OUTPUT_FILE);

/**
 * Trouve tous les fichiers bundle JSON dans le répertoire spécifié
 * @param {string} dir - Répertoire à parcourir
 * @returns {Promise<string[]>} - Liste des chemins vers les fichiers bundle JSON
 */
async function getAllBundleFiles(dir) {
  try {
    const files = await fs.readdir(dir, { withFileTypes: true });
    const bundleFiles = [];

    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      
      if (file.isDirectory()) {
        const subDirFiles = await getAllBundleFiles(fullPath);
        bundleFiles.push(...subDirFiles);
      } else if (file.isFile() && file.name.endsWith('-bundle.json')) {
        bundleFiles.push(fullPath);
      }
    }
    
    return bundleFiles;
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
    throw error;
  }
}

/**
 * Génère les fichiers exercises.json et exercises-index.json à partir des bundles
 */
async function generateExercisesJson() {
  try {
    // Créer les dossiers de sortie s'ils n'existent pas
    await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
    await fs.mkdir(INPUT_DIR, { recursive: true });

    // Lire récursivement tous les fichiers bundle JSON
    const bundleFiles = await getAllBundleFiles(INPUT_DIR);
    console.log(`Found ${bundleFiles.length} bundle JSON files to process...`);

    const exercises = [];
    let totalExercisesInBundles = 0;

    // Traiter chaque fichier bundle
    for (const bundlePath of bundleFiles) {
      try {
        const content = await fs.readFile(bundlePath, 'utf-8');
        const bundle = JSON.parse(content);
        const bundleName = path.basename(bundlePath);
        
        // Parcourir chaque exercice dans le bundle
        for (const [uuid, exercise] of Object.entries(bundle)) {
          if (!exercise) continue;
          
          // Ajouter des métadonnées supplémentaires sur le bundle source
          exercise.bundlePath = path.relative(INPUT_DIR, bundlePath);
          exercise.bundleName = bundleName;
          
          // S'assurer que l'exercice a un UUID (devrait déjà être le cas)
          if (!exercise.uuid) {
            exercise.uuid = uuid;
          }
          
          exercises.push(exercise);
        }
        
        totalExercisesInBundles += Object.keys(bundle).length;
        console.log(`Processed ${bundleName}: ${Object.keys(bundle).length} exercises`);
        
      } catch (error) {
        console.error(`Error processing bundle ${bundlePath}:`, error.message);
      }
    }

    // Trier les exercices par titre
    exercises.sort((a, b) => a.titre.localeCompare(b.titre));

    // Créer l'objet complet
    const output = {
      metadata: {
        totalCount: exercises.length,
        bundleCount: bundleFiles.length,
        generatedAt: new Date().toISOString(),
      },
      exercises: exercises
    };

    // Créer la version indexée pour la recherche (avec moins de données pour réduire la taille)
    const indexOutput = {
      metadata: output.metadata,
      exercises: exercises.map(exercise => ({
        uuid: exercise.uuid,
        titre: exercise.titre,
        niveau: exercise.niveau,
        theme: exercise.theme,
        metadata: exercise.metadata,
        preview: exercise.preview || generatePreview(exercise),
        bundleName: exercise.bundleName,
        // Version allégée du contenu pour l'indexation et la recherche
        contenu: exercise.contenu.map(item => ({
          type: item.type,
          id: item.id,
          value: {
            latex: item.value.latex
          }
        }))
      }))
    };

    // Écrire les fichiers de sortie
    await Promise.all([
      fs.writeFile(
        OUTPUT_FILE,
        JSON.stringify(output, null, 2),
        'utf-8'
      ),
      fs.writeFile(
        OUTPUT_INDEX_FILE,
        JSON.stringify(indexOutput, null, 2),
        'utf-8'
      )
    ]);

    console.log(`Successfully generated ${OUTPUT_FILE} and ${OUTPUT_INDEX_FILE}`);
    console.log(`Total exercises: ${exercises.length}`);
    console.log(`Total exercises in bundles: ${totalExercisesInBundles}`);
    
    if (exercises.length !== totalExercisesInBundles) {
      console.warn(`Warning: There is a discrepancy between total exercises (${exercises.length}) and 
                    the sum of exercises in bundles (${totalExercisesInBundles})`);
    }
    
  } catch (error) {
    console.error('Error generating exercises JSON:', error);
    process.exit(1);
  }
}

// Pour une utilisation comme module
export async function initializeJsonIndex() {
  await generateExercisesJson();
}

// Pour une utilisation directe en ligne de commande
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateExercisesJson();
}