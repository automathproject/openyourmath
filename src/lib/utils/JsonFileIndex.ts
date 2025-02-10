// src/lib/utils/JsonFileIndex.ts

import { readdir } from 'fs/promises';
import path from 'path';
import { watch } from 'fs';
import type { FSWatcher } from 'fs';

export class JsonFileIndex {
  private index: Map<string, string>;
  private watcher: FSWatcher | null;
  private baseDir: string;

  constructor() {
    this.index = new Map();
    this.watcher = null;
    this.baseDir = '';
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
            const uuid = path.basename(entry.name, '.json');
            this.index.set(uuid, fullPath);
          }
        }
      } catch (error) {
        console.error(`Erreur lors de l'indexation du dossier ${currentDir}:`, error);
      }
    }

    console.log(`Index construit avec ${this.index.size} fichiers`);
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
   * @returns Chemin du fichier ou null
   */
  findFile(uuid: string): string | null {
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
}