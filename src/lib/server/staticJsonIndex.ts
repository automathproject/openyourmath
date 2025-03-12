// src/lib/server/staticJsonIndex.ts
import { readFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

interface ExerciseLocation {
  filePath: string;
  isMulti: boolean;
  index?: number;
  key?: string;
}

interface ExerciseIndex {
  [uuid: string]: ExerciseLocation;
}

interface ExerciseMetadata {
  uuid: string;
  titre: string;
  theme: string | string[];
  metadata: {
    chapitre?: string;
    sousChapitre?: string;
    auteur?: string;
    organisation?: string;
    createdAt?: string;
    updatedAt?: string;
  };
}

// Interface pour regrouper les exercices par fichier
interface ExercisesByFile {
  [filePath: string]: {
    uuids: string[];
    locations: ExerciseLocation[];
  };
}

// Cache pour les fichiers déjà chargés
interface FileCache {
  [filePath: string]: {
    content: any;
    timestamp: number;
  };
}

export class StaticJsonIndex {
  private index: ExerciseIndex = {};
  private metadata: ExerciseMetadata[] = [];
  private initialized: boolean = false;
  private fileCache: FileCache = {}; // Cache pour les fichiers chargés
  private cacheTTL: number = 60000; // 1 minute (ajustable selon vos besoins)
  
  /**
   * Initialise l'index à partir des fichiers pré-générés
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    const indexFile = path.resolve('static/cache/exercises-index.json');
    const metadataFile = path.resolve('static/cache/exercises-metadata.json');
    
    // Vérifier si les fichiers existent
    if (!existsSync(indexFile) || !existsSync(metadataFile)) {
      console.error('Fichiers d\'index non trouvés. Exécutez d\'abord le script de génération de l\'index.');
      console.error('Commande: node src/scripts/generate-index.js');
      throw new Error('Fichiers d\'index non trouvés');
    }
    
    try {
      // Charger l'index
      const indexContent = await readFile(indexFile, 'utf-8');
      this.index = JSON.parse(indexContent);
      
      // Charger les métadonnées
      const metadataContent = await readFile(metadataFile, 'utf-8');
      this.metadata = JSON.parse(metadataContent);
      
      this.initialized = true;
      console.log(`Index statique chargé: ${Object.keys(this.index).length} exercices`);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'index statique:', error);
      throw error;
    }
  }
  
  /**
   * Trouve l'emplacement d'un exercice par son UUID
   */
  findExerciseLocation(uuid: string): ExerciseLocation | null {
    if (!this.initialized) {
      console.warn('L\'index n\'est pas encore initialisé');
      return null;
    }
    return this.index[uuid] || null;
  }
  
  /**
   * Récupère tous les UUIDs des exercices indexés
   */
  getAllExerciseIds(): string[] {
    if (!this.initialized) {
      console.warn('L\'index n\'est pas encore initialisé');
      return [];
    }
    return Object.keys(this.index);
  }
  
  /**
   * Récupère toutes les métadonnées des exercices
   */
  getAllExercisesMetadata(): ExerciseMetadata[] {
    if (!this.initialized) {
      console.warn('L\'index n\'est pas encore initialisé');
      return [];
    }
    return this.metadata;
  }
  
  /**
   * Récupère les métadonnées d'un exercice spécifique
   */
  getExerciseMetadata(uuid: string): ExerciseMetadata | null {
    if (!this.initialized) {
      console.warn('L\'index n\'est pas encore initialisé');
      return null;
    }
    return this.metadata.find(meta => meta.uuid === uuid) || null;
  }
  
  /**
   * Regroupe les exercices par fichier source
   * Utile pour optimiser le chargement de plusieurs exercices
   */
  getExercisesByFile(): ExercisesByFile {
    if (!this.initialized) {
      console.warn('L\'index n\'est pas encore initialisé');
      return {};
    }
    
    const exercisesByFile: ExercisesByFile = {};
    
    for (const uuid of Object.keys(this.index)) {
      const location = this.index[uuid];
      if (!exercisesByFile[location.filePath]) {
        exercisesByFile[location.filePath] = {
          uuids: [],
          locations: []
        };
      }
      exercisesByFile[location.filePath].uuids.push(uuid);
      exercisesByFile[location.filePath].locations.push(location);
    }
    
    return exercisesByFile;
  }
  
  /**
   * Charge le contenu d'un fichier avec mise en cache
   */
  async loadFile(filePath: string): Promise<any> {
    const now = Date.now();
    const absolutePath = path.resolve(process.cwd(), filePath);
    
    // Vérifier si le fichier est dans le cache et si le cache est encore valide
    if (this.fileCache[filePath] && now - this.fileCache[filePath].timestamp < this.cacheTTL) {
      return this.fileCache[filePath].content;
    }
    
    try {
      const content = await readFile(absolutePath, 'utf-8');
      const data = JSON.parse(content);
      
      // Mettre en cache
      this.fileCache[filePath] = {
        content: data,
        timestamp: now
      };
      
      return data;
    } catch (error) {
      console.error(`Erreur lors du chargement du fichier ${filePath}:`, error);
      throw error;
    }
  }
  
  /**
   * Extrait un exercice spécifique d'un fichier chargé
   */
  extractExerciseFromData(data: any, location: ExerciseLocation): any {
    if (!location.isMulti) {
      return data;
    }
    
    if (location.key && typeof data === 'object' && !Array.isArray(data)) {
      return data[location.key];
    } else if (data.exercices && Array.isArray(data.exercices) && location.index !== undefined) {
      return data.exercices[location.index];
    } else if (Array.isArray(data) && location.index !== undefined) {
      return data[location.index];
    }
    
    throw new Error('Format de fichier multi-exercices non reconnu');
  }
  
  /**
   * Charge un exercice spécifique par son UUID
   */
  async loadExercise(uuid: string): Promise<any> {
    if (!this.initialized) {
      console.warn('L\'index n\'est pas encore initialisé');
      return null;
    }
    
    const location = this.findExerciseLocation(uuid);
    if (!location) {
      throw new Error(`Exercice non trouvé: ${uuid}`);
    }
    
    const fileData = await this.loadFile(location.filePath);
    const exercise = this.extractExerciseFromData(fileData, location);
    
    if (!exercise) {
      throw new Error(`Exercice ${uuid} non trouvé dans le fichier ${location.filePath}`);
    }
    
    // Assurer que l'UUID est correctement défini
    if (!exercise.uuid) {
      exercise.uuid = uuid;
    }
    
    return exercise;
  }
  
  /**
   * Charge plusieurs exercices efficacement (en minimisant les lectures de fichiers)
   */
  async loadMultipleExercises(uuids: string[]): Promise<any[]> {
    if (!this.initialized) {
      console.warn('L\'index n\'est pas encore initialisé');
      return [];
    }
    
    // Regrouper par fichier
    const exercisesByFile: Record<string, { uuid: string, location: ExerciseLocation }[]> = {};
    
    for (const uuid of uuids) {
      const location = this.findExerciseLocation(uuid);
      if (!location) continue;
      
      if (!exercisesByFile[location.filePath]) {
        exercisesByFile[location.filePath] = [];
      }
      
      exercisesByFile[location.filePath].push({ uuid, location });
    }
    
    // Charger les exercices
    const exercises: any[] = [];
    
    for (const filePath of Object.keys(exercisesByFile)) {
      const fileData = await this.loadFile(filePath);
      
      for (const { uuid, location } of exercisesByFile[filePath]) {
        try {
          const exercise = this.extractExerciseFromData(fileData, location);
          
          if (exercise) {
            // Assurer que l'UUID est correctement défini
            if (!exercise.uuid) {
              exercise.uuid = uuid;
            }
            
            exercises.push(exercise);
          }
        } catch (error) {
          console.error(`Erreur lors de l'extraction de l'exercice ${uuid}:`, error);
        }
      }
    }
    
    return exercises;
  }
  
  /**
   * Recherche d'exercices par critères
   */
  findExercises(criteria: Partial<ExerciseMetadata>): ExerciseMetadata[] {
    if (!this.initialized) {
      console.warn('L\'index n\'est pas encore initialisé');
      return [];
    }
    
    return this.metadata.filter(meta => {
      // Vérifier chaque critère
      for (const [key, value] of Object.entries(criteria)) {
        if (key === 'metadata') {
          // Vérifier les métadonnées imbriquées
          for (const [metaKey, metaValue] of Object.entries(criteria.metadata || {})) {
            if (meta.metadata?.[metaKey] !== metaValue) {
              return false;
            }
          }
        } else if (key === 'theme') {
          // Gérer les thèmes qui peuvent être une chaîne ou un tableau
          const themeValue = criteria.theme;
          if (typeof themeValue === 'string') {
            if (Array.isArray(meta.theme)) {
              if (!meta.theme.includes(themeValue)) {
                return false;
              }
            } else if (meta.theme !== themeValue) {
              return false;
            }
          } else if (Array.isArray(themeValue)) {
            // Vérifier si tous les thèmes critères sont présents
            if (Array.isArray(meta.theme)) {
              if (!themeValue.every(t => meta.theme.includes(t))) {
                return false;
              }
            } else {
              return false;
            }
          }
        } else if (meta[key] !== value) {
          return false;
        }
      }
      return true;
    });
  }
  
  /**
   * Réinitialise le cache des fichiers
   */
  clearFileCache(): void {
    this.fileCache = {};
    console.log('Cache des fichiers réinitialisé');
  }
}

// Instance singleton
export const staticJsonIndex = new StaticJsonIndex();