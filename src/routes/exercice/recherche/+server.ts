// src/routes/exercice/list/+server.ts
import { readdir, readFile } from 'fs/promises';
import path from 'path';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  try {
    const jsonDir = path.resolve('static/content/json');
    const files = await readdir(jsonDir);
    const exercises = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const uuid = path.basename(file, '.json');
        const filePath = path.join(jsonDir, file);
        const data = await readFile(filePath, 'utf-8');
        const json = JSON.parse(data);
        const title = json.titre || 'Sans titre';
        const theme = json.theme || 'Sans thème';
        exercises.push({ uuid, titre: title, theme: theme });
      }
    }

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
