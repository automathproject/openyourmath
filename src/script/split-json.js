import fs from 'fs';
import path from 'path';

/**
 * Split un fichier JSON en plusieurs fichiers contenant au maximum `chunkSize` entrées chacun.
 *
 * @param {string} inputFilePath Le chemin vers le fichier JSON d'entrée.
 * @param {number} chunkSize Le nombre maximum d'entrées par fichier de sortie (par défaut 300).
 * @returns {Promise<void>} Une promesse qui se résout lorsque le processus est terminé.
 * @throws {Error} Si une erreur survient lors de la lecture, de l'analyse ou de l'écriture des fichiers.
 */
async function splitJsonFile(inputFilePath, chunkSize = 300) {
    try {
        // 1. Lecture du fichier JSON d'entrée.
        const rawData = fs.readFileSync(inputFilePath, 'utf-8');

        // 2. Analyse du contenu JSON.
        const jsonData = JSON.parse(rawData);

        // 3. Récupérer les entrées (exercices) du JSON
        const entries = Object.entries(jsonData);  // Convertit l'objet en un tableau de [clé, valeur]

        // 4. Vérifier qu'on a bien des entrées
        if (!entries || entries.length === 0) {
            throw new Error("Le fichier JSON d'entrée ne contient pas d'entrées.");
        }

        // Extraire les informations du chemin du fichier d'entrée
        const inputFileDir = path.dirname(inputFilePath);
        const inputFileBaseName = path.basename(inputFilePath, path.extname(inputFilePath));
        const inputFileExtension = path.extname(inputFilePath);

        // Le répertoire de sortie est le même que le répertoire du fichier d'entrée
        const outputDir = inputFileDir;

        // 5. Découpage des données en chunks.
        const numChunks = Math.ceil(entries.length / chunkSize);

        for (let i = 0; i < numChunks; i++) {
            const chunk = entries.slice(i * chunkSize, (i + 1) * chunkSize);

            // 6. Reconstruire un objet JSON à partir du chunk
            const outputJson = Object.fromEntries(chunk);  // Reconvertit le tableau de [clé, valeur] en objet

            // 7. Écriture de chaque chunk dans un fichier JSON distinct.
            const outputFilePath = path.join(outputDir, `${inputFileBaseName}-part_${i + 1}${inputFileExtension}`); //Utilisation du nom d'origine + numéro de part
            fs.writeFileSync(outputFilePath, JSON.stringify(outputJson, null, 2)); // Ajouter `null, 2` pour une indentation lisible
            console.log(`Fichier créé: ${outputFilePath}`);
        }

        // Renommer le fichier d'entrée
        const renamedFilePath = path.join(inputFileDir, `${inputFileBaseName}-full${inputFileExtension}`); //Même répertoire, nom -full
        fs.renameSync(inputFilePath, renamedFilePath);

        console.log(`Fichier JSON splitté en ${numChunks} parties dans le répertoire ${outputDir}.`);
        console.log(`Fichier original renommé en ${renamedFilePath}`);

    } catch (error) {
        console.error("Erreur lors du traitement du fichier JSON:", error);
        throw error; // Re-lancer l'erreur pour qu'elle puisse être gérée en amont.
    }
}

// Fonction principale pour gérer les arguments de ligne de commande
async function main() {
    const args = process.argv.slice(2); // Récupérer les arguments après node et le nom du script

    if (args.length < 1) {
        console.error("Usage: node split_json.js <inputFilePath> [chunkSize]");
        process.exit(1); // Quitter le script avec un code d'erreur
    }

    const inputFilePath = args[0];
    const chunkSize = parseInt(args[1], 10) || 300; // Taille des chunks, par défaut 300

    try {
        await splitJsonFile(inputFilePath, chunkSize);
    } catch (error) {
        console.error("Une erreur s'est produite dans la fonction main:", error);
        process.exit(1);
    }
}

main();