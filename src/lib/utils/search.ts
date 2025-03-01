import Fuse from 'fuse.js';
import type { Exercice } from '../types/types';

export class ExerciceSearchEngine {
  private fuse: Fuse<Exercice>;

  constructor() {
    const options: Fuse.IFuseOptions<Exercice> = {
      keys: [
        { name: 'titre', weight: 0.1 },
        { name: 'theme', weight: 0.3 },
        { name: 'niveau', weight: 0.1 },
        {
          name: 'contenu',
          weight: 0.5,
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
      includeScore: true,
      useExtendedSearch: true  // Activer la recherche étendue
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
    
    // Transformer la requête pour rechercher les mots individuellement
    const words = query.trim().split(/\s+/);
    
    // Créer un pattern de recherche étendue où chaque mot est facultatif (OR implicite)
    const searchPattern = words.map(word => `'${word}`).join(' ');
    
    console.log('Search pattern:', searchPattern); // Debug
    
    const searchResults = this.fuse.search(searchPattern);
    console.log('Found', searchResults.length, 'results'); // Debug
    
    return searchResults.map(result => ({
      exercise: result.item,
      score: result.score || 1
    }));
  }
}