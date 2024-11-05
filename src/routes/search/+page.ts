// src/routes/+page.ts
import type { PageLoad } from './$types';
import type { Exercice } from '$lib/types/types';

export const load: PageLoad = async ({ fetch }) => {
    try {
        const response = await fetch('/data/exercises.json', {
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!response.ok) {
            console.error('Failed to load exercises:', response.status, response.statusText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Successfully loaded exercises:', data.exercises?.length);
        
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