import { JsonFileIndex } from '$lib/utils/JsonFileIndex';
import path from 'path';

// Création d'une instance unique pour l'application
const jsonIndex = new JsonFileIndex();

/**
 * Fonction d'initialisation à appeler au démarrage du serveur
 */
export async function initializeJsonIndex(): Promise<void> {
  const jsonDir = path.resolve('static/content/json2');
  await jsonIndex.initialize(jsonDir);
}

export { jsonIndex };