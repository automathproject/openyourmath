import { JsonFileIndex } from '$lib/utils/JsonFileIndex';
import path from 'path';
import fs from 'fs/promises';

// Liste des patterns de bundles à reconnaître
const bundlePatterns = [
  'exercices_multi.json',
  'collection_exercices.json',
  'amscc.json'
];

// Détection des bundles supplémentaires par convention de nommage
async function detectAdditionalBundles(jsonDir: string): Promise<string[]> {
  try {
    const additionalPatterns: string[] = [];
    // Maintenir une map pour regrouper les parties d'un même bundle
    const bundleParts = new Map<string, string[]>();
    
    // Fonction récursive pour explorer les répertoires
    const scanDirectory = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await scanDirectory(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          // Ignorer les fichiers -full.json (ce sont des backups)
          if (entry.name.endsWith('-full.json')) {
            continue;
          }
          
          // Détecter les fichiers qui contiennent "bundle" dans leur nom
          if (entry.name.toLowerCase().includes('bundle')) {
            // Vérifier si c'est une partie d'un bundle divisé (ex: nom-bundle-part1.json)
            const partMatch = entry.name.match(/(.*bundle.*)-part(\d+)\.json$/i);
            if (partMatch) {
              // C'est une partie d'un bundle divisé
              const baseName = partMatch[1];
              const partNumber = partMatch[2];
              if (!bundleParts.has(baseName)) {
                bundleParts.set(baseName, []);
              }
              bundleParts.get(baseName)?.push(entry.name);
            } else {
              // C'est un bundle standard
              additionalPatterns.push(entry.name);
            }
          }
        }
      }
    };
    
    await scanDirectory(jsonDir);
    
    // Ajouter toutes les parties de bundle détectées
    for (const [_, parts] of bundleParts) {
      additionalPatterns.push(...parts);
    }
    
    return [...new Set(additionalPatterns)]; // Éliminer les doublons
  } catch (error) {
    console.error("Erreur lors de la détection des bundles:", error);
    return [];
  }
}

// Création d'une instance unique pour l'application
let jsonIndex: JsonFileIndex;

/**
 * Fonction d'initialisation à appeler au démarrage du serveur
 */
export async function initializeJsonIndex(): Promise<void> {
  const jsonDir = path.resolve('static/content/json2');
  
  // Détecter les bundles additionnels
  const additionalBundles = await detectAdditionalBundles(jsonDir);
  const allBundlePatterns = [...bundlePatterns, ...additionalBundles];
  
  console.log(`Patterns de bundles détectés: ${allBundlePatterns.join(', ')}`);
  
  // Créer et initialiser l'index
  jsonIndex = new JsonFileIndex(allBundlePatterns);
  await jsonIndex.initialize(jsonDir);
  
  // Afficher les statistiques
  const stats = jsonIndex.getStats();
  console.log(`Total d'exercices indexés: ${stats.total}`);
  console.log('Répartition par bundle:');
  
  Object.entries(stats.bundles).forEach(([bundleName, count]) => {
    console.log(`- ${bundleName}: ${count} exercices`);
  });
  
  const individualCount = stats.total - Object.values(stats.bundles).reduce((a, b) => a + b, 0);
  console.log(`- Fichiers individuels: ${individualCount} exercices`);
}

/**
 * Récupère tous les exercices d'un répertoire (pour faciliter la migration)
 * @param dirPath - Chemin relatif du répertoire (par rapport à static/content/json2)
 */
export async function listExercisesInDirectory(dirPath: string): Promise<string[]> {
  const fullPath = path.resolve('static/content/json2', dirPath);
  const exercises: string[] = [];
  
  const scanDir = async (dir: string) => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await scanDir(entryPath);
      } else if (entry.isFile() && entry.name.endsWith('.json') && !jsonIndex.isBundleFile(entry.name)) {
        // Ajouter uniquement les fichiers JSON individuels (non-bundles)
        exercises.push(entryPath);
      }
    }
  };
  
  await scanDir(fullPath);
  return exercises;
}

export { jsonIndex };