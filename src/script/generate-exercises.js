// scripts/generate-exercises.js
import fs from 'fs/promises';
import path from 'path';

const INPUT_DIR = './static/content/json2';
const OUTPUT_FILE = './static/data/exercises.json';

async function generateExercisesJson() {
    try {
        // Créer le dossier de sortie s'il n'existe pas
        await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });

        // Lire tous les fichiers du dossier d'entrée
        const files = await fs.readdir(INPUT_DIR);
        const exercises = [];

        console.log(`Found ${files.length} files to process...`);

        // Traiter chaque fichier
        for (const file of files) {
            if (file.endsWith('.json')) {
                try {
                    const filePath = path.join(INPUT_DIR, file);
                    const content = await fs.readFile(filePath, 'utf-8');
                    const exercise = JSON.parse(content);
                    exercises.push(exercise);
                } catch (error) {
                    console.error(`Error processing file ${file}:`, error.message);
                }
            }
        }

        // Trier les exercices par titre (optionnel)
        exercises.sort((a, b) => a.titre.localeCompare(b.titre));

        // Créer l'objet final
        const output = {
            metadata: {
                totalCount: exercises.length,
                generatedAt: new Date().toISOString(),
            },
            exercises: exercises
        };

        // Écrire le fichier de sortie
        await fs.writeFile(
            OUTPUT_FILE,
            JSON.stringify(output, null, 2),
            'utf-8'
        );

        console.log(`Successfully generated ${OUTPUT_FILE}`);
        console.log(`Total exercises: ${exercises.length}`);

    } catch (error) {
        console.error('Error generating exercises JSON:', error);
        process.exit(1);
    }
}

// Exécuter le script
generateExercisesJson();