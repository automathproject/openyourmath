// src/routes/+page.ts
import type { PageLoad } from './$types';
import type { Exercice } from '$lib/types/types';

export const load: PageLoad = async () => {
    try {
        const response = await fetch('/data/exercises.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
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