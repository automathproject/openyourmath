// src/lib/utils/JsonFileIndex.ts
import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { watch } from 'fs';
import type { FSWatcher } from 'fs';

interface ExerciseLocation {
  filePath: string;
  isMulti: boolean;  // true if it's in a multi-exercise file
  index?: number;     // index in the multi-exercise array (if applicable)
}

export class JsonFileIndex {
  private index: Map<string, ExerciseLocation>;
  private watcher: FSWatcher | null;
  private baseDir: string;
  private multiFilesPattern: string[];  // Patterns to identify multi-exercise files

  constructor(multiFilesPattern: string[] = ['exercices_multi.json', 'collection_exercices.json']) {
    this.index = new Map();
    this.watcher = null;
    this.baseDir = '';
    this.multiFilesPattern = multiFilesPattern;
  }

  /**
   * Initialise l'index en parcourant le dossier
   * @param baseDir - Dossier racine contenant les fichiers JSON
   */
  async initialize(baseDir: string): Promise<void> {
    this.baseDir = baseDir;
    await this.buildIndex();
    this.setupWatcher();
  }

  /**
   * Construit l'index en parcourant récursivement le dossier
   */
  private async buildIndex(): Promise<void> {
    this.index.clear();
    console.log('Construction de l\'index...');
    
    const queue: string[] = [this.baseDir];
    
    while (queue.length > 0) {
      const currentDir = queue.shift()!;
      
      try {
        const entries = await readdir(currentDir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);
          
          if (entry.isDirectory()) {
            queue.push(fullPath);
          } else if (entry.isFile() && entry.name.endsWith('.json')) {
            // Traiter les fichiers individuels (un exercice par fichier)
            if (!this.isMultiExerciseFile(entry.name)) {
              const uuid = path.basename(entry.name, '.json');
              this.index.set(uuid, {
                filePath: fullPath,
                isMulti: false
              });
            } else {
              // Traiter les fichiers multi-exercices
              await this.indexMultiExerciseFile(fullPath);
            }
          }
        }
      } catch (error) {
        console.error(`Erreur lors de l'indexation du dossier ${currentDir}:`, error);
      }
    }
    
    console.log(`Index construit avec ${this.index.size} exercices`);
  }

  /**
   * Vérifie si le fichier est un fichier multi-exercices
   */
  private isMultiExerciseFile(filename: string): boolean {
    return this.multiFilesPattern.some(pattern => filename.includes(pattern));
  }

  /**
   * Indexe un fichier contenant plusieurs exercices
   */
  private async indexMultiExerciseFile(filePath: string): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const exercises = JSON.parse(content);
      
      // Format AMSCC: objet avec les UUIDs comme clés: { "Ab12": {...}, "Cd34": {...} }
      if (!Array.isArray(exercises) && typeof exercises === 'object') {
        // Vérifier si c'est un format objet avec UUIDs comme clés
        const hasUuidKeys = Object.keys(exercises).some(key => 
          typeof exercises[key] === 'object' && exercises[key].uuid
        );
        
        if (hasUuidKeys) {
          Object.keys(exercises).forEach(key => {
            const exercise = exercises[key];
            if (exercise.uuid) {
              this.index.set(exercise.uuid, {
                filePath,
                isMulti: true,
                key: key // Stocker la clé au lieu de l'index
              });
            }
          });
          return;
        }
        
        // Format { exercices: [...] }
        if (exercises.exercices && Array.isArray(exercises.exercices)) {
          exercises.exercices.forEach((exercise: any, index: number) => {
            if (exercise.uuid) {
              this.index.set(exercise.uuid, {
                filePath,
                isMulti: true,
                index
              });
            }
          });
          return;
        }
      } 
      
      // Format tableau d'exercices
      if (Array.isArray(exercises)) {
        exercises.forEach((exercise: any, index: number) => {
          if (exercise.uuid) {
            this.index.set(exercise.uuid, {
              filePath,
              isMulti: true,
              index
            });
          }
        });
      }
    } catch (error) {
      console.error(`Erreur lors de l'indexation du fichier multi-exercices ${filePath}:`, error);
    }
  }

  /**
   * Configure un watcher pour maintenir l'index à jour
   */
  private setupWatcher(): void {
    if (this.watcher) {
      this.watcher.close();
    }
    
    this.watcher = watch(
      this.baseDir,
      { recursive: true },
      async (eventType, filename) => {
        if (!filename) return;
        if (filename.endsWith('.json')) {
          console.log(`Changement détecté : ${filename}`);
          await this.buildIndex(); // Reconstruire l'index
        }
      }
    );
    
    this.watcher.on('error', (error) => {
      console.error('Erreur du watcher:', error);
    });
  }

  /**
   * Recherche un fichier par UUID
   * @param uuid - UUID recherché
   * @returns Information sur la localisation de l'exercice ou null
   */
  findExerciseLocation(uuid: string): ExerciseLocation | null {
    return this.index.get(uuid) || null;
  }

  /**
   * Arrête le watcher
   */
  close(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
  /**
 * Récupère tous les UUIDs des exercices indexés
 * @returns Ensemble des UUIDs
 */
  getAllExerciseIds(): Set<string> {
  return new Set(this.index.keys());
}
}

