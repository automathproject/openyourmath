// src/routes/exercice/[uuid]/+server.ts
import { readFile } from 'fs/promises';
import path from 'path';
import type { RequestHandler } from './$types';
import { staticJsonIndex } from '$lib/server/staticJsonIndex';
import { jsonIndex } from '$lib/server/jsonIndex';

export const GET: RequestHandler = async ({ params }) => {
  try {
    const { uuid } = params;
    console.log('=== Début de traitement de la requête pour UUID:', uuid);
    console.log('staticJsonIndex initialisé?', staticJsonIndex.isInitialized());

    const exerciseLocation = staticJsonIndex.findExerciseLocation(uuid);
    console.log('Emplacement trouvé dans staticJsonIndex:', exerciseLocation);

    if (!exerciseLocation) {
      console.log('Exercice non trouvé dans l\'index');
      return new Response(JSON.stringify({ error: 'Exercice non trouvé' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const absolutePath = path.resolve(process.cwd(), exerciseLocation.filePath);
    console.log('Chemin absolu du fichier:', absolutePath);

    let fileContent;
    try {
      fileContent = await readFile(absolutePath, 'utf-8');
    } catch (error) {
      console.error('Erreur lors de la lecture du fichier:', error);  // <-- Log l'erreur ici
      return new Response(JSON.stringify({
        error: 'Fichier d\'exercice non trouvé',
        details: `Impossible de lire ${exerciseLocation.filePath}`
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let parsedData;
    try {
      parsedData = JSON.parse(fileContent);
    } catch (error) {
      console.error('Erreur lors du parsing JSON:', error);  // <-- Log l'erreur ici
      return new Response(JSON.stringify({
        error: 'Format JSON invalide',
        details: `Erreur lors du parsing de ${exerciseLocation.filePath}`
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  
    // Extraire l'exercice selon qu'il s'agit d'un fichier individuel ou multi
    let exercise;
        if (exerciseLocation.isMulti) {
      console.log("C'est un fichier multi-exercice");
      // Vérifier le format et extraire l'exercice
      if (exerciseLocation.key && !Array.isArray(parsedData) && typeof parsedData === 'object') {
        // Format AMSCC: { "Ab12": {...}, "Cd34": {...} }
        exercise = parsedData[exerciseLocation.key];
                console.log("Format AMSCC détecté, exercise:", exercise);
      } else if (parsedData.exercices && Array.isArray(parsedData.exercices)) {
        // Format: { exercices: [...] }
        if (typeof exerciseLocation.index === 'number' && exerciseLocation.index < parsedData.exercices.length) {
          exercise = parsedData.exercices[exerciseLocation.index];
                  console.log("Format { exercices: [...] } détecté, exercise:", exercise);
        }
      } else if (Array.isArray(parsedData)) {
        // Format: [...] (tableau direct)
        if (typeof exerciseLocation.index === 'number' && exerciseLocation.index < parsedData.length) {
          exercise = parsedData[exerciseLocation.index];
                  console.log("Format tableau direct détecté, exercise:", exercise);
        }
      }

      // Si l'exercice n'a pas été trouvé par index, essayer de le chercher par UUID
      if (!exercise && uuid) {
        console.log("Exercice non trouvé par index, recherche par UUID");
        // Recherche dans un tableau (direct ou exercices)
        const searchArray = Array.isArray(parsedData) ? parsedData :
                          (parsedData.exercices && Array.isArray(parsedData.exercices) ? parsedData.exercices : null);

        if (searchArray) {
          exercise = searchArray.find(item => item.uuid === uuid);
                  console.log("Recherche dans un tableau, exercise:", exercise);
        }
        // Recherche dans un objet de type AMSCC
        else if (!Array.isArray(parsedData) && typeof parsedData === 'object') {
          for (const key of Object.keys(parsedData)) {
            if (parsedData[key].uuid === uuid) {
              exercise = parsedData[key];
                      console.log("Recherche dans un objet, exercise:", exercise);
              break;
            }
          }
        }
      }
    } else {
      console.log("C'est un fichier individuel");
      // Fichier individuel
      exercise = parsedData;
            console.log("Exercice (fichier individuel):", exercise);
    }

    if (!exercise) {
      console.log('Exercice non trouvé dans le fichier');
      return new Response(JSON.stringify({
        error: 'Exercice non trouvé dans le fichier',
        details: `L'exercice avec l'UUID ${uuid} n'a pas été trouvé dans ${exerciseLocation.filePath}`
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
        // S'assurer que l'UUID est correctement défini
        if (!exercise.uuid) {
            exercise.uuid = uuid;
        }

    console.log("Exercice trouvé et renvoyé:", exercise); //Ajouté
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