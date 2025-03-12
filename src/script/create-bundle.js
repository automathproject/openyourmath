// Usage: node src/script/create-bundle.js [directoryPath] [outputPath]
import fs from 'fs';
import path from 'path';

/**
 * Crée un bundle à partir de tous les fichiers JSON d'un répertoire
 * @param {string} directoryPath - Chemin vers le répertoire contenant les fichiers JSON
 * @param {string} outputPath - Chemin pour le fichier de sortie
 */
function createJsonBundle(directoryPath, outputPath) {
  // Vérifier si le répertoire existe
  if (!fs.existsSync(directoryPath)) {
    console.error(`Le répertoire ${directoryPath} n'existe pas.`);
    return;
  }

  // Objet qui contiendra tous les fichiers JSON
  const bundle = {};

  // Lire tous les fichiers du répertoire
  const files = fs.readdirSync(directoryPath);
  
  // Filtrer pour ne garder que les fichiers JSON
  const jsonFiles = files.filter(file => path.extname(file).toLowerCase() === '.json');
  
  console.log(`Traitement de ${jsonFiles.length} fichiers JSON...`);

  // Parcourir chaque fichier JSON
  jsonFiles.forEach(file => {
    try {
      // Lire le contenu du fichier
      const filePath = path.join(directoryPath, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // Parser le contenu JSON
      const jsonData = JSON.parse(fileContent);
      
      // Vérifier que le fichier contient un uuid
      if (jsonData.uuid) {
        // Ajouter au bundle en utilisant l'uuid comme clé
        bundle[jsonData.uuid] = jsonData;
        console.log(`Ajouté: ${jsonData.uuid} - ${jsonData.titre || 'Sans titre'}`);
      } else {
        console.warn(`Le fichier ${file} ne contient pas d'uuid et sera ignoré.`);
      }
    } catch (error) {
      console.error(`Erreur lors du traitement du fichier ${file}:`, error.message);
    }
  });

  // Écrire le bundle dans un fichier de sortie
  try {
    fs.writeFileSync(outputPath, JSON.stringify(bundle, null, 2), 'utf8');
    console.log(`Bundle créé avec succès: ${outputPath}`);
    console.log(`Nombre total d'éléments dans le bundle: ${Object.keys(bundle).length}`);
  } catch (error) {
    console.error(`Erreur lors de l'écriture du fichier de sortie:`, error.message);
  }
}

// Exemple d'utilisation
const directoryPath = process.argv[2] || './json-files';
const outputPath = process.argv[3] || './bundle.json';

createJsonBundle(directoryPath, outputPath);