// src/lib/utils/JsonFileIndex.ts
import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { watch } from 'fs';
import type { FSWatcher } from 'fs';

interface ExerciseLocation {
  filePath: string;
  isMulti: boolean;  // true if it's in a multi-exercise file
  index?: number;    // index in the multi-exercise array (if applicable)
  key?: string;      // key in the object-based bundles
}

export class JsonFileIndex {
  private index: Map<string, ExerciseLocation>;
  private watcher: FSWatcher | null;
  private baseDir: string;
  private bundlePatterns: string[];  // Patterns to identify bundle files

  constructor(bundlePatterns: string[] = ['exercices_multi.json', 'collection_exercices.json', 'amscc.json']) {
    this.index = new Map();
    this.watcher = null;
    this.baseDir = '';
    this.bundlePatterns = bundlePatterns;
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
    let individualFiles = 0;
    let bundledExercises = 0;
    
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
            if (!this.isBundleFile(entry.name)) {
              const uuid = path.basename(entry.name, '.json');
              this.index.set(uuid, {
                filePath: fullPath,
                isMulti: false
              });
              individualFiles++;
            } else {
              // Traiter les fichiers bundle
              const exercisesInBundle = await this.indexBundleFile(fullPath);
              bundledExercises += exercisesInBundle;
            }
          }
        }
      } catch (error) {
        console.error(`Erreur lors de l'indexation du dossier ${currentDir}:`, error);
      }
    }
    
    console.log(`Index construit avec ${this.index.size} exercices au total:`);
    console.log(`- ${individualFiles} exercices dans des fichiers individuels`);
    console.log(`- ${bundledExercises} exercices dans des bundles`);
  }

  /**
   * Vérifie si le fichier est un bundle
   * @param filename - Nom du fichier à vérifier
   * @returns true si le fichier est un bundle, false sinon
   */
  isBundleFile(filename: string): boolean {
    return this.bundlePatterns.some(pattern => filename.includes(pattern)) || 
           filename.includes('bundle');  // Détection des bundles par convention de nommage
  }

  /**
   * Indexe un fichier contenant plusieurs exercices
   * @param filePath - Chemin du fichier bundle à indexer
   * @returns Le nombre d'exercices indexés dans ce bundle
   */
  private async indexBundleFile(filePath: string): Promise<number> {
    let exercisesIndexed = 0;
    
    try {
      const content = await readFile(filePath, 'utf-8');
      const exercises = JSON.parse(content);
      
      // Format bundle type AMSCC: objet avec les UUIDs comme clés
      if (!Array.isArray(exercises) && typeof exercises === 'object') {
        // Vérifier si c'est un format objet avec UUIDs comme clés
        Object.keys(exercises).forEach(key => {
          const exercise = exercises[key];
          // Si l'exercice a un UUID défini, on l'utilise
          if (exercise.uuid) {
            this.index.set(exercise.uuid, {
              filePath,
              isMulti: true,
              key
            });
            exercisesIndexed++;
          } else {
            // Sinon, on utilise la clé comme UUID
            this.index.set(key, {
              filePath,
              isMulti: true,
              key
            });
            exercisesIndexed++;
          }
        });
        
        // Format { exercices: [...] }
        if (exercises.exercices && Array.isArray(exercises.exercices)) {
          exercises.exercices.forEach((exercise: any, index: number) => {
            if (exercise.uuid) {
              this.index.set(exercise.uuid, {
                filePath,
                isMulti: true,
                index
              });
              exercisesIndexed++;
            }
          });
        }
      } 
      
      // Format tableau d'exercices
      else if (Array.isArray(exercises)) {
        exercises.forEach((exercise: any, index: number) => {
          if (exercise.uuid) {
            this.index.set(exercise.uuid, {
              filePath,
              isMulti: true,
              index
            });
            exercisesIndexed++;
          }
        });
      }
      
    } catch (error) {
      console.error(`Erreur lors de l'indexation du fichier bundle ${filePath}:`, error);
    }
    
    return exercisesIndexed;
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

  /**
   * Récupère les statistiques sur l'index
   * @returns Objet contenant des statistiques sur l'index
   */
  getStats(): {total: number, bundles: {[key: string]: number}} {
    const stats = {
      total: this.index.size,
      bundles: {} as {[key: string]: number}
    };
    
    // Compter le nombre d'exercices par bundle
    for (const location of this.index.values()) {
      if (location.isMulti) {
        const bundleName = path.basename(location.filePath);
        stats.bundles[bundleName] = (stats.bundles[bundleName] || 0) + 1;
      }
    }
    
    return stats;
  }

  /**
   * Ajoute un nouveau pattern de bundle à surveiller
   * @param pattern - Pattern de nom de fichier pour identifier les bundles
   */
  addBundlePattern(pattern: string): void {
    if (!this.bundlePatterns.includes(pattern)) {
      this.bundlePatterns.push(pattern);
    }
  }
}

