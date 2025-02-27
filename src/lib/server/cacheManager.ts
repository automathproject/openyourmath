// src/lib/server/cacheManager.ts
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { jsonIndex } from './jsonIndex';

// Vérifier si le code s'exécute en mode production ou préchargement
const isPrerendering = process.env.PRERENDERING === 'true';
const isBuild = process.env.NODE_ENV === 'production' && process.env.SKIP_INDEX === 'true';
const shouldSkipCacheOperations = isPrerendering || isBuild;

// Chemin du fichier de cache
const CACHE_DIR = path.resolve('static/cache');
const EXERCISES_CACHE_FILE = path.join(CACHE_DIR, 'exercises-cache.json');
const CACHE_VALIDITY_DURATION = 3600 * 1000; // 1 heure en millisecondes

interface CacheData {
  timestamp: number;
  exercises: any[];
}

// Fonction pour vérifier si le cache est valide
export async function isCacheValid(): Promise<boolean> {
  if (shouldSkipCacheOperations) {
    return true; // Éviter les opérations de cache pendant le build
  }
  
  try {
    if (!existsSync(EXERCISES_CACHE_FILE)) return false;
    
    const stats = await readFile(EXERCISES_CACHE_FILE, 'utf-8');
    const cache = JSON.parse(stats) as CacheData;
    
    // Vérifier si le cache est encore valide (moins d'une heure)
    const now = Date.now();
    return (now - cache.timestamp) < CACHE_VALIDITY_DURATION && 
           !jsonIndex.hasChangedSince(cache.timestamp);
  } catch (error) {
    console.error('Erreur lors de la vérification du cache:', error);
    return false;
  }
}

// Fonction pour lire le cache
export async function readExercisesCache(): Promise<any[]> {
  if (shouldSkipCacheOperations) {
    return []; // Retourner une liste vide pendant le build
  }
  
  try {
    if (!existsSync(EXERCISES_CACHE_FILE)) {
      return [];
    }
    
    const data = await readFile(EXERCISES_CACHE_FILE, 'utf-8');
    const cache = JSON.parse(data) as CacheData;
    return cache.exercises;
  } catch (error) {
    console.error('Erreur lors de la lecture du cache:', error);
    return [];
  }
}

// Fonction pour écrire le cache
export async function writeExercisesCache(exercises: any[]): Promise<void> {
  if (shouldSkipCacheOperations) {
    return; // Ne pas écrire pendant le build
  }
  
  try {
    // S'assurer que le répertoire de cache existe
    if (!existsSync(CACHE_DIR)) {
      await mkdir(CACHE_DIR, { recursive: true });
    }
    
    const cacheData: CacheData = {
      timestamp: Date.now(),
      exercises
    };
    
    await writeFile(EXERCISES_CACHE_FILE, JSON.stringify(cacheData), 'utf-8');
    console.log('Cache des exercices mis à jour avec', exercises.length, 'exercices');
  } catch (error) {
    console.error('Erreur lors de l\'écriture du cache:', error);
  }
}

// Fonction pour générer la liste des exercices
export async function generateExercisesList(): Promise<any[]> {
  if (shouldSkipCacheOperations) {
    return []; // Ne pas traiter pendant le build
  }
  
  // Récupérer tous les UUIDs d'exercices depuis l'index
  const allExerciseIds = Array.from(jsonIndex.getAllExerciseIds());
  const exercises: any[] = [];

  // Traitement par lots pour améliorer les performances
  const BATCH_SIZE = 50;
  const totalBatches = Math.ceil(allExerciseIds.length / BATCH_SIZE);
  
  console.log(`Génération de la liste avec ${allExerciseIds.length} exercices en ${totalBatches} lots`);
  
  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const batchStart = batchIndex * BATCH_SIZE;
    const batchEnd = Math.min(batchStart + BATCH_SIZE, allExerciseIds.length);
    const batchIds = allExerciseIds.slice(batchStart, batchEnd);
    
    console.log(`Traitement du lot ${batchIndex + 1}/${totalBatches} (${batchIds.length} exercices)`);
    
    // Traitement des exercices du lot en parallèle
    const batchPromises = batchIds.map(async (uuid) => {
      const exerciseLocation = jsonIndex.findExerciseLocation(uuid);
      if (!exerciseLocation) return null;
      
      try {
        // Charger le fichier
        const fileContent = await readFile(exerciseLocation.filePath, 'utf-8');
        let json;
        
        // Extraire l'exercice selon le format du fichier
        if (exerciseLocation.isMulti) {
          const data = JSON.parse(fileContent);
          
          // Format AMSCC: { "Ab12": {...}, "Cd34": {...} }
          if (exerciseLocation.key && !Array.isArray(data) && typeof data === 'object') {
            json = data[exerciseLocation.key];
          }
          // Format: { exercices: [...] }
          else if (data.exercices && Array.isArray(data.exercices)) {
            json = data.exercices[exerciseLocation.index as number];
          } 
          // Format: [...] (tableau direct)
          else if (Array.isArray(data)) {
            json = data[exerciseLocation.index as number];
          } else {
            return null; // Format non reconnu
          }
        } else {
          // Fichier individuel
          json = JSON.parse(fileContent);
        }
        
        // Extraire les informations minimales nécessaires
        const preview = json.preview || '';
        const title = json.titre || preview || 'Sans titre';
        const theme = json.theme || 'Sans thème';
        const chapitre = json.metadata?.chapitre || 'Sans chapitre';
        const sousChapitre = json.metadata?.sousChapitre || 'Sans sous-chapitre';
        
        return {
          uuid,
          titre: title,
          theme: theme,
          metadata: {
            chapitre,
            sousChapitre
          }
        };
      } catch (error) {
        console.error(`Erreur lors de la lecture de l'exercice ${uuid}:`, error);
        return null;
      }
    });
    
    // Attendre la fin du traitement du lot
    const batchResults = await Promise.all(batchPromises);
    
    // Filtrer les résultats null et les ajouter à la liste
    exercises.push(...batchResults.filter(result => result !== null));
  }
  
  console.log(`Liste générée avec ${exercises.length} exercices valides`);
  return exercises;
}

// Fonction pour régénérer le cache si nécessaire
export async function ensureCacheIsUpToDate(): Promise<void> {
  if (shouldSkipCacheOperations) {
    return; // Ne pas traiter pendant le build
  }
  
  if (await isCacheValid()) {
    console.log('Le cache des exercices est à jour');
    return;
  }
  
  console.log('Régénération du cache des exercices');
  const exercises = await generateExercisesList();
  await writeExercisesCache(exercises);
}

// Configuration d'une tâche périodique pour mettre à jour le cache
let cacheUpdateInterval: NodeJS.Timeout | null = null;

export function startPeriodicCacheUpdate(intervalMs: number = CACHE_VALIDITY_DURATION / 2): void {
  if (shouldSkipCacheOperations) {
    return; // Ne pas démarrer de tâche périodique pendant le build
  }
  
  if (cacheUpdateInterval) {
    clearInterval(cacheUpdateInterval);
  }
  
  cacheUpdateInterval = setInterval(async () => {
    console.log('Vérification périodique du cache des exercices');
    await ensureCacheIsUpToDate();
  }, intervalMs);
  
  console.log(`Mise à jour périodique du cache configurée (intervalle: ${intervalMs}ms)`);
}

export function stopPeriodicCacheUpdate(): void {
  if (cacheUpdateInterval) {
    clearInterval(cacheUpdateInterval);
    cacheUpdateInterval = null;
    console.log('Mise à jour périodique du cache arrêtée');
  }
}