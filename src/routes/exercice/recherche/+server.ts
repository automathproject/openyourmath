// src/routes/exercice/+server.ts
import { readdir, readFile } from 'fs/promises';
import path from 'path';
import type { RequestHandler } from './$types';

async function readExercisesRecursively(dir: string): Promise<any[]> {
  const exercises: any[] = [];
  const items = await readdir(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      // Récursion pour les sous-répertoires
      const subExercises = await readExercisesRecursively(fullPath);
      exercises.push(...subExercises);
    } else if (item.isFile() && item.name.endsWith('.json')) {
      try {
        const uuid = path.basename(item.name, '.json');
        const data = await readFile(fullPath, 'utf-8');
        const json = JSON.parse(data);
        const preview = json.preview || '';
        const title = json.titre || preview || 'Sans titre';
        const theme = json.theme || 'Sans thème';
        const chapitre = json.metadata?.chapitre || 'Sans chapitre';
        const sousChapitre = json.metadata?.sousChapitre || 'Sans sous-chapitre';
        exercises.push({ 
          uuid, 
          titre: title, 
          theme: theme, 
          metadata: {
            chapitre,
            sousChapitre
          }
        });
      } catch (error) {
        console.error(`Erreur lors de la lecture de ${fullPath}:`, error);
      }
    }
  }

  return exercises;
}

export const GET: RequestHandler = async () => {
  try {
    const jsonDir = path.resolve('static/content/json2');
    const exercises = await readExercisesRecursively(jsonDir);
    
    return new Response(JSON.stringify(exercises), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error reading exercise list:', error);
    return new Response(JSON.stringify({ error: 'Unable to load exercise list' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};