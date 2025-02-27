// src/routes/exercice/[uuid]/+server.ts
import { readFile } from 'fs/promises';
import type { RequestHandler } from './$types';
import { staticJsonIndex } from '$lib/server/staticJsonIndex';

export const GET: RequestHandler = async ({ params }) => {
  try {
    const { uuid } = params;
    
    // Utiliser l'index statique pour trouver l'information sur l'exercice
    const exerciseLocation = staticJsonIndex.findExerciseLocation(uuid);
    
    if (!exerciseLocation) {
      return new Response(JSON.stringify({ error: 'Exercice non trouvé' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Lire le fichier
    const fileContent = await readFile(exerciseLocation.filePath, 'utf-8');
    let exercise;
    
    // Extraire l'exercice selon qu'il s'agit d'un fichier individuel ou multi
    if (exerciseLocation.isMulti) {
      const data = JSON.parse(fileContent);
      
      // Format AMSCC: { "Ab12": {...}, "Cd34": {...} }
      if (exerciseLocation.key && !Array.isArray(data) && typeof data === 'object') {
        exercise = data[exerciseLocation.key];
      }
      // Format: { exercices: [...] }
      else if (data.exercices && Array.isArray(data.exercices)) {
        exercise = data.exercices[exerciseLocation.index as number];
      } 
      // Format: [...] (tableau direct)
      else if (Array.isArray(data)) {
        exercise = data[exerciseLocation.index as number];
      } else {
        throw new Error('Format de fichier multi-exercices non reconnu');
      }
    } else {
      // Fichier individuel
      exercise = JSON.parse(fileContent);
    }
    
    // S'assurer que l'UUID est correctement défini
    if (!exercise.uuid) {
      exercise.uuid = uuid;
    }
    
    return new Response(JSON.stringify(exercise), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error(`Erreur lors de la lecture de l'exercice ${params.uuid}:`, error);
    return new Response(JSON.stringify({
      error: 'Erreur lors de la lecture de l\'exercice',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};