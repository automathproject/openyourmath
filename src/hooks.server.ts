import type { Handle } from '@sveltejs/kit';
import { initializeJsonIndex } from '$lib/server/jsonIndex';

// Variable globale pour s'assurer de ne lancer l'indexation qu'une seule fois
let indexLoaded = false;

export const handle: Handle = async ({ event, resolve }) => {
  // Vérifier si on doit *sauter* l'indexation (pendant le build) ou si déjà chargée
  if (!process.env.SKIP_INDEX && !indexLoaded) {
    indexLoaded = true;
    console.log('→ Initialisation de l\'index JSON au runtime...');
    await initializeJsonIndex();
  }

  return resolve(event);
};
