// src/routes/search/+page.ts
import type { PageLoad } from './$types';
import type { Exercice } from '$lib/types/types';
import { browser } from '$app/environment';

export const load: PageLoad = async ({ fetch }) => {
    try {
        // Ajout d'un timestamp pour éviter le cache lors de la navigation
        const timestamp = Date.now();
        const response = await fetch(`/data/exercises-index.json?t=${timestamp}`, {
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            // Force le rechargement lors de la navigation
            cache: 'no-store'
        });
        
        if (!response.ok) {
            console.error('Failed to load exercises:', response.status, response.statusText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Log pour debug
        if (browser) {
            console.log('Successfully loaded exercises:', data.exercises?.length);
            console.log('Loading context:', window.location.pathname);
        }
        
        return {
            exercises: data.exercises as Exercice[],
            // Ajouter une propriété pour forcer le rechargement
            timestamp: timestamp
        };
    } catch (error) {
        console.error('Error loading exercises:', error);
        return {
            exercises: [] as Exercice[],
            timestamp: Date.now()
        };
    }
};