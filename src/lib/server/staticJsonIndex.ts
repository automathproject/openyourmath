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

export class StaticJsonIndex {
  private index: ExerciseIndex = {};
  private metadata: ExerciseMetadata[] = [];
  private initialized: boolean = false;
  
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
      console.error('Commande: npx ts-node src/scripts/generate-index.ts');
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
}

// Instance singleton
export const staticJsonIndex = new StaticJsonIndex();