// src/routes/+page.ts
import type { PageLoad } from './$types';
import type { Exercice } from '$lib/types/types';
import { browser } from '$app/environment';

export const load: PageLoad = async () => {
    try {
        // Utiliser l'URL complète en production
        const baseUrl = browser ? window.location.origin : 'https://openyourmath.org';
        const response = await fetch(`${baseUrl}/data/exercises.json`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Log pour debug
        console.log('Loaded exercises:', data.exercises?.length);
        
        return {
            exercises: data.exercises as Exercice[]
        };
    } catch (error) {
        console.error('Error loading exercises:', error);
        return {
            exercises: [] as Exercice[]
        };
    }
};