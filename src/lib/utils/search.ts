// src/lib/utils/search.ts
import Fuse from 'fuse.js';
import type { Exercice } from '../types/types';

export class ExerciceSearchEngine {
    private fuse: Fuse<Exercice>;
    private exercises: Exercice[];

    constructor() {
        const options: Fuse.IFuseOptions<Exercice> = {
            keys: [
                { name: 'titre', weight: 0.4 },
                { name: 'theme', weight: 0.3 },
                { name: 'niveau', weight: 0.2 },
                { 
                    name: 'contenu',
                    weight: 0.1,
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
            threshold: 0.4,
            includeScore: true
        };

        this.exercises = [];
        this.fuse = new Fuse([], options);
    }

    initialize(exercises: Exercice[]) {
        this.exercises = exercises;
        this.fuse.setCollection(exercises);
    }

    search(query: string) {
        if (!query.trim()) {
            return this.exercises.map(exercise => ({
                exercise,
                score: 1
            }));
        }

        return this.fuse.search(query).map(result => ({
            exercise: result.item,
            score: result.score || 1
        }));
    }
}