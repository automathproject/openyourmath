/* -- lib/stores/customList.ts --> */
import { writable } from 'svelte/store';
import type { Exercice } from '$lib/types/types';

export const customList = writable<Exercice[]>([]);

export function addToCustomList(exercise: Exercice) {
    customList.update(list => {
        if (!list.some(item => item.uuid === exercise.uuid)) {
            return [...list, exercise];
        }
        return list;
    });
}

export function removeFromCustomList(exercise: Exercice) {
    customList.update(list => list.filter(item => item.uuid !== exercise.uuid));
}

export function moveInCustomList(fromIndex: number, toIndex: number) {
    customList.update(list => {
        // Valider les indices
        if (fromIndex < 0 || fromIndex >= list.length || 
            toIndex < 0 || toIndex >= list.length || 
            fromIndex === toIndex) {
            return list;
        }
        
        // Créer une copie de la liste
        const newList = [...list];
        
        // Extraire l'élément à déplacer
        const [movedItem] = newList.splice(fromIndex, 1);
        
        // Insérer l'élément à la nouvelle position
        newList.splice(toIndex, 0, movedItem);
        
        return newList;
    });
}