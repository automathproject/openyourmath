// src/lib/utils/search.ts
import Fuse from 'fuse.js';
import type { Exercice } from '../types/types';

export class ExerciceSearchEngine {
    private fuse: Fuse<Exercice>;

    constructor() {
        const options: Fuse.IFuseOptions<Exercice> = {
            keys: [
                { name: 'titre', weight: 0.3 },
                { name: 'theme', weight: 0.3 },
                { name: 'niveau', weight: 0.1 },
                { 
                    name: 'contenu',
                    weight: 0.3,
                    getFn: (exercise) => {
                        return exercise.contenu
                            .map(element => {
                                const values = element.value;
                                return [
                                    values.latex,
                                    values.html,
                                    values.graphic?.caption,
                                    values.code
                                ].filter(Boolean).join(' ');
                            })
                            .join(' ');
                    }
                }
            ],
            threshold: 0.35,
            includeScore: true
        };

        this.fuse = new Fuse([], options);
    }

    initialize(exercises: Exercice[]) {
        // Réinitialiser Fuse avec la nouvelle collection
        this.fuse = new Fuse(exercises, this.fuse.options);
        console.log('Search engine initialized with', exercises.length, 'exercises'); // Debug
    }

    search(query: string) {
        console.log('Performing search for:', query); // Debug
        
        if (!query.trim()) {
            return this.fuse.getIndex().docs.map(exercise => ({
                exercise,
                score: 1
            }));
        }

        const searchResults = this.fuse.search(query);
        console.log('Found', searchResults.length, 'results'); // Debug
        
        return searchResults.map(result => ({
            exercise: result.item,
            score: result.score || 1
        }));
    }
}