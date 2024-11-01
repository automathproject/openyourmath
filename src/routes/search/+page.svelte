<!-- src/routes/+page.svelte -->
<script lang="ts">
    import { onMount } from 'svelte';
    import { ExerciceSearchEngine } from '$lib/utils/search';
    import type { Exercice } from '$lib/types/types';
    import Modal from '../../components/Modal.svelte';
    import ExerciceRenderer from '../ExerciceRenderer.svelte';
    import { fade, slide } from 'svelte/transition';
    import { flip } from 'svelte/animate';
    
    export let data;
    
    let searchEngine: ExerciceSearchEngine;
    let query = '';
    let results: Array<{ exercise: Exercice; score: number }> = [];
    let showModal = false;
    let selectedExercise: Exercice | null = null;
    let selectedTags: Set<string> = new Set();
    let allTags: Map<string, number> = new Map(); // Map pour stocker les tags et leur nombre d'occurrences

    onMount(() => {
        searchEngine = new ExerciceSearchEngine();
        searchEngine.initialize(data.exercises);
        // Collecter tous les tags uniques et compter leurs occurrences
        data.exercises.forEach(exercise => {
            normalizeThemes(exercise.theme).forEach(theme => {
                allTags.set(theme, (allTags.get(theme) || 0) + 1);
            });
        });
        allTags = allTags; // Trigger reactivity
        updateResults();
    });

    function updateResults() {
        if (!searchEngine) return;
        
        let searchResults;
        if (query.trim()) {
            searchResults = searchEngine.search(query);
        } else {
            searchResults = data.exercises.map(exercise => ({ 
                exercise,
                score: 1
            }));
        }

        // Filtrer par tags si des tags sont sélectionnés
        if (selectedTags.size > 0) {
            searchResults = searchResults.filter(result => {
                const exerciseTags = new Set(normalizeThemes(result.exercise.theme));
                return Array.from(selectedTags).every(tag => exerciseTags.has(tag));
            });
        }

        results = searchResults;
    }

    function handleExerciseClick(exercise: Exercice) {
        selectedExercise = exercise;
        showModal = true;
    }

    function handleModalClose() {
        showModal = false;
        selectedExercise = null;
    }

    function normalizeThemes(theme: string | string[]): string[] {
        if (Array.isArray(theme)) return theme;
        return theme.split(',').map(t => t.trim());
    }

    // Optimisation : création d'une clé unique plus simple pour l'animation
    function getResultKey(exercise: Exercice) {
        return exercise.uuid || exercise.titre;
    }

    // Ajout d'un délai pour éviter trop de calculs d'animations simultanés
    let animationTimeout: NodeJS.Timeout;
    function debouncedUpdateResults() {
        clearTimeout(animationTimeout);
        animationTimeout = setTimeout(() => {
            updateResults();
        }, 50);
    }

    function toggleTag(tag: string) {
        if (selectedTags.has(tag)) {
            selectedTags.delete(tag);
        } else {
            selectedTags.add(tag);
        }
        selectedTags = selectedTags;
        debouncedUpdateResults();
    }

    function resetFilters() {
        selectedTags.clear();
        selectedTags = selectedTags;
        query = '';
        updateResults();
    }

    // Réagir aux changements de query et selectedTags
    $: {
        query;
        selectedTags;
        updateResults();
    }
</script>

<div class="container-fluid p-4">
    <div class="row">
        <!-- Colonne de gauche : Recherche et filtres -->
        <div class="col-12 col-md-4 col-lg-3">
            <div class="sticky-top" style="top: 1rem;">
                <!-- Champ de recherche -->
                <div class="card mb-4">
                    <div class="card-body">
                        <input
                            type="text"
                            bind:value={query}
                            placeholder="Rechercher un exercice..."
                            class="form-control"
                        />
                    </div>
                </div>

                <!-- Filtres par tags -->
                <div class="card">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h3 class="h5 mb-0">Filtrer par thèmes</h3>
                            {#if selectedTags.size > 0 || query}
                                <button
                                    class="btn btn-danger btn-sm"
                                    on:click={resetFilters}
                                >
                                    Réinitialiser
                                </button>
                            {/if}
                        </div>

                        <div class="tags">
                            {#each Array.from(allTags) as [tag, count]}
                                <span 
                                    class="tag {selectedTags.has(tag) ? 'selected' : ''}"
                                    on:click={() => toggleTag(tag)}
                                    on:keydown={(e) => e.key === 'Enter' && toggleTag(tag)}
                                    role="button"
                                    tabindex="0"
                                >
                                    {tag}
                                    <span class="tag-count" class:selected={selectedTags.has(tag)}>
                                        {count}
                                    </span>
                                </span>
                            {/each}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Colonne de droite : Résultats -->
        <div class="col-12 col-md-8 col-lg-9">
            <div class="alert alert-info mb-4">
                <div class="d-flex justify-content-between align-items-center">
                    <strong>{results.length} exercice(s) trouvé(s)</strong>
                    {#if selectedTags.size > 0}
                        <small class="text-muted">
                            Filtres : {Array.from(selectedTags).join(', ')}
                        </small>
                    {/if}
                </div>
            </div>

            <div class="results-container">
                {#each results as result (getResultKey(result.exercise))}
                    <div 
                        class="card mb-3 result-item cursor-pointer hover-card"
                        on:click={() => handleExerciseClick(result.exercise)}
                        on:keydown={(e) => e.key === 'Enter' && handleExerciseClick(result.exercise)}
                        tabindex="0"
                        role="button"
                    >
                        <div class="card-body">
                            <h3 class="h5 mb-2">{result.exercise.titre}</h3>
                            <p class="text-muted mb-2">Niveau: {result.exercise.niveau}</p>
                            <div class="tags">
                                {#each normalizeThemes(result.exercise.theme) as theme}
                                    <span 
                                        class="tag result-tag {selectedTags.has(theme) ? 'selected' : ''}"
                                        on:click|stopPropagation={() => toggleTag(theme)}
                                        on:keydown|stopPropagation={(e) => e.key === 'Enter' && toggleTag(theme)}
                                        role="button"
                                        tabindex="0"
                                    >
                                        {theme}
                                    </span>
                                {/each}
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    </div>
</div>

<Modal 
    showModal={showModal} 
    on:close={handleModalClose}
>
    {#if selectedExercise}
        <ExerciceRenderer ExerciceData={selectedExercise} />
    {/if}
</Modal>


<style>
        .sticky-top {
        z-index: 100;
    }

    .hover-card {
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .hover-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 0.5rem;
    }

    .tag {
        background-color: #e0e0e0;
        color: #333;
        padding: 5px 10px;
        border-radius: 15px;
        font-size: 14px;
        font-weight: 500;
        display: inline-flex;
        align-items: center;
        cursor: pointer;
        transition: all 0.3s ease;
        user-select: none;
    }

    .tag:hover {
        background-color: #d0d0d0;
    }

    .tag.selected {
        background-color: #333;
        color: #fff;
    }

    .tag.result-tag {
        font-size: 12px;
        padding: 3px 8px;
    }

    .tag-count {
        background-color: rgba(0, 0, 0, 0.1);
        border-radius: 10px;
        padding: 2px 6px;
        margin-left: 6px;
        font-size: 12px;
    }

    .tag-count.selected {
        background-color: rgba(255, 255, 255, 0.2);
    }

    .remove-tag {
        margin-left: 5px;
        font-size: 16px;
        font-weight: bold;
    }

    .reset-button {
        background-color: #ff4444;
        color: white;
        padding: 4px 12px;
        border-radius: 15px;
        font-size: 14px;
        transition: background-color 0.3s ease;
    }

    .reset-button:hover {
        background-color: #ff2222;
    }

    .text-gray-600 {
        color: #666;
    }


    .results-container {
        display: grid;
        gap: 1rem;
        grid-template-columns: 1fr;
    }

    .result-item {
        opacity: 1;
        transform: translateY(0);
        transition: opacity 0.2s ease, transform 0.2s ease;
    }

    /* Optimisation : utilisation de CSS pour les animations au lieu de Svelte transitions */
    .result-item:nth-child(n+1) {
        animation: fadeIn 0.2s ease forwards;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    /* Optimisation des transitions CSS */
    .tag {
        transition: background-color 0.2s ease, color 0.2s ease;
    }

    .reset-button {
        transition: background-color 0.2s ease;
    }
</style>