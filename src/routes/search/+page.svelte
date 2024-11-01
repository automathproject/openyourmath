<!-- src/routes/+page.svelte -->
<script lang="ts">
    import { onMount } from 'svelte';
    import { ExerciceSearchEngine } from '$lib/utils/search';
    import type { Exercice } from '$lib/types/types';

    export let data;
    
    let searchEngine: ExerciceSearchEngine;
    let query = '';
    let results: Array<{ exercise: Exercice; score: number }> = [];

    // Initialisation du moteur de recherche
    onMount(() => {
        searchEngine = new ExerciceSearchEngine();
        searchEngine.initialize(data.exercises);
        // Au début, montrer tous les exercices
        results = data.exercises.map(exercise => ({ 
            exercise,
            score: 1
        }));
    });

    // Réactivité de la recherche
    $: if (searchEngine && query.trim()) {
        results = searchEngine.search(query);
    } else if (searchEngine) {
        // Si la recherche est vide, montrer tous les exercices
        results = data.exercises.map(exercise => ({ 
            exercise,
            score: 1
        }));
    }
</script>

<div class="container mx-auto p-4">
    <!-- Barre de recherche -->
    <div class="mb-4">
        <input
            type="text"
            bind:value={query}
            placeholder="Rechercher un exercice..."
            class="w-full p-2 border rounded"
        />
    </div>

    <!-- Compteur de résultats -->
    <div class="mb-4">
        <p>{results.length} exercice(s) trouvé(s)</p>
    </div>

    <!-- Résultats -->
    <div class="space-y-4">
        {#each results as { exercise }}
            <div class="border rounded p-4">
                <h3 class="font-bold">{exercise.titre}</h3>
                <p>Niveau: {exercise.niveau}</p>
                <p>Thèmes: {exercise.theme.join(', ')}</p>
            </div>
        {/each}
    </div>
</div>