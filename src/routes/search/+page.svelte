<!-- src/routes/+page.svelte -->
<script lang="ts">
    import { onMount } from 'svelte';
    import { ExerciceSearchEngine } from '$lib/utils/search';
    import type { Exercice } from '$lib/types/types';

    export let data;
    
    let searchEngine: ExerciceSearchEngine;
    let query = '';
    let results: Array<{ exercise: Exercice; score: number }> = [];

    onMount(() => {
        searchEngine = new ExerciceSearchEngine();
        searchEngine.initialize(data.exercises);
        updateResults(); // Affichage initial
    });

    function updateResults() {
        if (!searchEngine) return;
        
        if (query.trim()) {
            console.log('Searching for:', query);
            const searchResults = searchEngine.search(query);
            console.log('Found results:', searchResults.length);
            results = searchResults;
        } else {
            results = data.exercises.map(exercise => ({ 
                exercise,
                score: 1
            }));
        }
    }

    $: query, updateResults();
</script>

<div class="container mx-auto p-4">
    <div class="mb-4">
        <input
            type="text"
            bind:value={query}
            placeholder="Rechercher un exercice..."
            class="w-full p-2 border rounded"
        />
    </div>

    <div class="mb-4">
        <p>{results.length} exercice(s) trouvé(s)</p>
    </div>

    <div class="space-y-4">
        {#each results as result}
            {@const exercise = result.exercise}
            <div class="border rounded p-4">
                <h3 class="font-bold">{exercise.titre}</h3>
                <p>Niveau: {exercise.niveau}</p>
                <!-- Vérification que theme est un tableau avant d'utiliser join -->
                <p>Thèmes: {Array.isArray(exercise.theme) ? exercise.theme.join(', ') : exercise.theme}</p>
            </div>
        {/each}
    </div>
</div>