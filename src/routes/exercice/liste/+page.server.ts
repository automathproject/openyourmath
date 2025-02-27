// src/routes/exercice/liste/+page.server.ts
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, fetch }) => {
  // Récupérer l'UUID de l'URL si présent
  const uuid = url.searchParams.get('uuid');
  const listId = url.searchParams.get('list');
  
  // Objet pour stocker les données préchargées
  const data: { exercise?: any, error?: string } = {};
  
  // Précharger l'exercice si un UUID est spécifié
  if (uuid) {
    try {
      const response = await fetch(`/exercice/${uuid}`);
      if (response.ok) {
        data.exercise = await response.json();
      } else {
        data.error = `Erreur lors du chargement de l'exercice : ${response.statusText}`;
      }
    } catch (error: any) {
      data.error = `L'exercice ${uuid} n'a pas pu être chargé : ${error.message}`;
    }
  }
  
  // Retourner les données pour le préchargement
  return {
    uuid,
    listId,
    ...data
  };
};

// Désactiver le préchargement SSR pour cette route pour éviter les conflits avec l'initialisation du cache
export const ssr = false;