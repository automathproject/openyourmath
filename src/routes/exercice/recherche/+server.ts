// src/routes/exercice/recherche/+server.ts
import type { RequestHandler } from './$types';
import { staticJsonIndex } from '$lib/server/staticJsonIndex';

export const GET: RequestHandler = async () => {
  try {
    // Accéder directement aux métadonnées pré-générées
    const exercisesMetadata = staticJsonIndex.getAllExercisesMetadata();
    
    return new Response(JSON.stringify(exercisesMetadata), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error reading exercise list:', error);
    return new Response(JSON.stringify({ 
      error: 'Unable to load exercise list',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};