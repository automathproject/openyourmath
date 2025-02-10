// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { initializeJsonIndex } from '$lib/server/jsonIndex';

// Initialiser l'index avant de configurer le handler
await initializeJsonIndex().catch(error => {
  console.error('Erreur lors de l\'initialisation de l\'index:', error);
  process.exit(1);
});

export const handle: Handle = async ({ event, resolve }) => {
  // Passer le contrôle au reste de l'application
  const response = await resolve(event);
  return response;
};