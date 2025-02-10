// src/routes/exercice/[uuid]/+server.ts
import { readFile } from 'fs/promises';
import type { RequestHandler } from './$types';
import { jsonIndex } from '$lib/server/jsonIndex';

export const GET: RequestHandler = async ({ params }) => {
  try {
    const { uuid } = params;
    
    // Utiliser l'index pour trouver le fichier
    const filePath = jsonIndex.findFile(uuid);
    
    if (!filePath) {
      return new Response(JSON.stringify({ error: 'Exercice non trouvé' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const data = await readFile(filePath, 'utf-8');
    const exercise = JSON.parse(data);
    exercise.uuid = uuid;
    
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