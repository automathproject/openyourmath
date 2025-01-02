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


