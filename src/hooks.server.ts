// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { staticJsonIndex } from '$lib/server/staticJsonIndex';

// Variable pour s'assurer de ne lancer l'indexation qu'une seule fois
let indexLoaded = false;

export const handle: Handle = async ({ event, resolve }) => {
  // Vérifier si on doit *sauter* l'indexation (pendant le build) ou si déjà chargée
  if (!process.env.SKIP_INDEX && !indexLoaded) {
    indexLoaded = true;
    console.log('→ Chargement de l\'index statique au runtime...');
    
    try {
      // Utiliser l'index statique au lieu de l'index dynamique
      await staticJsonIndex.initialize();
      console.log('✓ Index statique chargé avec succès');
    } catch (error) {
      console.error('Erreur lors du chargement de l\'index statique:', error);
    }
  }
  
  return resolve(event);
};