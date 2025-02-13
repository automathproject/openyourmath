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



async function getAllJsonFiles(dir) {
  try {
    const files = await fs.readdir(dir, { withFileTypes: true });
    const jsonFiles = [];

    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      
      if (file.isDirectory()) {
        const subDirFiles = await getAllJsonFiles(fullPath);
        jsonFiles.push(...subDirFiles);
      } else if (file.isFile() && file.name.endsWith('.json')) {
        jsonFiles.push(fullPath);
      }
    }

    return jsonFiles;
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
    throw error;
  }
}

async function generateExercisesJson() {
  try {
    // Créer les dossiers de sortie s'ils n'existent pas
    await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
    await fs.mkdir(INPUT_DIR, { recursive: true });
    
    // Lire récursivement tous les fichiers JSON
    const jsonFiles = await getAllJsonFiles(INPUT_DIR);
    console.log(`Found ${jsonFiles.length} JSON files to process...`);
    
    const exercises = [];
    
    // Traiter chaque fichier
    for (const filePath of jsonFiles) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const exercise = JSON.parse(content);
        
        // Ajouter le chemin relatif du fichier comme métadonnée
        exercise.filePath = path.relative(INPUT_DIR, filePath);
        
        exercises.push(exercise);
      } catch (error) {
        console.error(`Error processing file ${filePath}:`, error.message);
      }
    }
    
    // Trier les exercices par titre
    exercises.sort((a, b) => a.titre.localeCompare(b.titre));
    
    // Créer l'objet complet
    const output = {
      metadata: {
        totalCount: exercises.length,
        generatedAt: new Date().toISOString(),
      },
      exercises: exercises
    };
    
    // Créer la version indexée pour la recherche
    const indexOutput = {
      metadata: output.metadata,
      exercises: exercises.map(exercise => ({
        ...exercise,
        preview: generatePreview(exercise),
        contenu: exercise.contenu.map(item => ({
          type: item.type,
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