// src/routes/exercice/[uuid]/+server.ts
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { RequestHandler } from './$types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const GET: RequestHandler = async ({ params }) => {
  try {
    const { uuid } = params;
    const jsonDir = path.resolve('static/content/json2');
    const filePath = path.join(jsonDir, `${uuid}.json`);

    const data = await readFile(filePath, 'utf-8');
    const exercise = JSON.parse(data);

    // Ajouter l'UUID à l'objet exercise
    exercise.uuid = uuid;

    return new Response(JSON.stringify(exercise), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error(`Erreur lors de la lecture de l'exercice ${params.uuid}:`, error);

    if (error.code === 'ENOENT') {
      return new Response(JSON.stringify({ error: 'Exercice non trouvé' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({ error: 'Erreur lors de la lecture de l\'exercice' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
