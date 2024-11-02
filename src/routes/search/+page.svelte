<!-- src/routes/+page.svelte -->
<script lang="ts">
    import { onMount } from 'svelte';
    import { ExerciceSearchEngine } from '$lib/utils/search';
    import type { Exercice } from '$lib/types/types';
    import Modal from '../../components/Modal.svelte';
    import ExerciceRenderer from '../ExerciceRenderer.svelte';
    import MathRenderer from '../MathRenderer.svelte';
    
    export let data;
    
    let searchEngine: ExerciceSearchEngine;
    let query = '';
    let results: Array<{ exercise: Exercice; score: number }> = [];
    let showModal = false;
    let selectedExercise: Exercice | null = null;
    let selectedTags: Set<string> = new Set();
    let allTags: Map<string, number> = new Map();
    let dynamicTagCounts: Map<string, number> = new Map();
    let showFilters = true;

    function normalizeThemes(theme: string | string[]): string[] {
        if (Array.isArray(theme)) return theme;
        return theme ? theme.split(',').map(t => t.trim()) : [];
    }

    // Calculer les compteurs dynamiques en fonction des filtres actuels
    function updateDynamicCounts(currentResults: Array<{ exercise: Exercice; score: number }>) {
        dynamicTagCounts.clear();
        
        // Pour chaque résultat actuellement visible
        currentResults.forEach(result => {
            const exerciseTags = normalizeThemes(result.exercise.theme);
            exerciseTags.forEach(tag => {
                // Si ce n'est pas un tag déjà sélectionné
                if (!selectedTags.has(tag)) {
                    dynamicTagCounts.set(tag, (dynamicTagCounts.get(tag) || 0) + 1);
                }
            });
        });

        // Pour les tags sélectionnés, calculer leur nombre à partir de tous les résultats
        // en simulant le retrait de ce tag des filtres
        if (selectedTags.size > 0) {
            const baseResults = query.trim() && searchEngine 
                ? searchEngine.search(query)
                : data.exercises.map(exercise => ({ exercise, score: 1 }));

            selectedTags.forEach(selectedTag => {
                // Filtrer les résultats avec tous les tags sauf celui-ci
                const otherTags = new Set(selectedTags);
                otherTags.delete(selectedTag);
                
                const count = baseResults.filter(result => {
                    const exerciseTags = new Set(normalizeThemes(result.exercise.theme));
                    return Array.from(otherTags).every(tag => exerciseTags.has(tag)) 
                        && exerciseTags.has(selectedTag);
                }).length;

                dynamicTagCounts.set(selectedTag, count);
            });
        }

        dynamicTagCounts = new Map(dynamicTagCounts);
    }

    function updateResults() {
        let filteredResults;
        
        // Recherche textuelle
        if (query.trim() && searchEngine) {
            filteredResults = searchEngine.search(query);
        } else {
            filteredResults = data.exercises.map(exercise => ({
                exercise,
                score: 1
            }));
        }

        // Filtrage par tags
        if (selectedTags.size > 0) {
            filteredResults = filteredResults.filter(result => {
                const exerciseTags = new Set(normalizeThemes(result.exercise.theme));
                return Array.from(selectedTags).every(tag => exerciseTags.has(tag));
            });
        }

        results = filteredResults;
        
        // Mettre à jour les compteurs dynamiques
        updateDynamicCounts(filteredResults);
    }

    onMount(() => {
        if (data?.exercises) {
            // Initialiser le moteur de recherche
            searchEngine = new ExerciceSearchEngine();
            searchEngine.initialize(data.exercises);
            
            // Initialiser les tags
            data.exercises.forEach(exercise => {
                const themes = normalizeThemes(exercise.theme);
                themes.forEach(theme => {
                    allTags.set(theme, (allTags.get(theme) || 0) + 1);
                });
            });
            allTags = new Map(allTags);
            
            // Initialiser les résultats et les compteurs
            updateResults();
        }
    });

    function handleExerciseClick(exercise: Exercice) {
        selectedExercise = exercise;
        showModal = true;
    }

    function handleModalClose() {
        showModal = false;
        selectedExercise = null;
    }

    function toggleTag(tag: string) {
        if (selectedTags.has(tag)) {
            selectedTags.delete(tag);
        } else {
            selectedTags.add(tag);
        }
        selectedTags = selectedTags;
        updateResults(); // Mettre à jour les résultats après le changement de tag
    }

    // Réagir aux changements de la recherche
    $: query, updateResults();
</script>

<div class="container-fluid p-4">
    <div class="row">
        <div class="col-12 col-md-4 col-lg-3">
            <div class="card mb-4">
                <div class="card-body">
                    <h5 class="card-title">Recherche</h5>
                    <input
                        type="text"
                        bind:value={query}
                        placeholder="Rechercher un exercice..."
                        class="form-control"
                    />
                </div>
            </div>

            <div class="card">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5 class="card-title mb-0">Thèmes disponibles</h5>
                        {#if selectedTags.size > 0}
                            <button 
                                class="btn btn-outline-danger btn-sm" 
                                on:click={() => {
                                    selectedTags.clear();
                                    selectedTags = selectedTags;
                                    updateResults();
                                }}
                            >
                                Réinitialiser
                            </button>
                        {/if}
                    </div>
                    
                    {#if selectedTags.size > 0}
                        <div class="selected-tags mb-3">
                            <div class="small text-muted mb-2">Filtres actifs :</div>
                            <div class="tags">
                                {#each Array.from(selectedTags) as tag}
                                    <span class="tag selected">
                                        {tag}
                                        <span class="tag-count selected">
                                            {dynamicTagCounts.get(tag)}
                                        </span>
                                        <button 
                                            class="remove-tag"
                                            on:click={() => toggleTag(tag)}
                                        >
                                            ×
                                        </button>
                                    </span>
                                {/each}
                            </div>
                        </div>
                    {/if}

                    <div class="available-tags">
                        {#if selectedTags.size > 0}
                            <div class="small text-muted mb-2">Filtres additionnels disponibles :</div>
                        {/if}
                        <div class="tags">
                            {#each Array.from(allTags) as [tag, totalCount]}
                                {@const availableCount = dynamicTagCounts.get(tag) ?? 0}
                                {#if !selectedTags.has(tag) && availableCount > 0}
                                    <span 
                                        class="tag"
                                        on:click={() => toggleTag(tag)}
                                    >
                                        {tag}
                                        <span class="tag-count">
                                            {availableCount}
                                        </span>
                                    </span>
                                {/if}
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
                            Filtres actifs : {Array.from(selectedTags).join(', ')}
                        </small>
                    {/if}
                </div>
            </div>

            <div class="d-flex flex-column gap-3">
                {#each results as result}
                    <div 
                        class="card cursor-pointer hover-card"
                        on:click={() => handleExerciseClick(result.exercise)}
                    >
                        <div class="card-body">
                            <h5 class="card-title"><MathRenderer content={result.exercise.titre}/></h5>
                            {#if result.exercise.theme}
                                <div class="tags">
                                    {#each normalizeThemes(result.exercise.theme) as theme}
                                        <span 
                                            class="tag result-tag {selectedTags.has(theme) ? 'selected' : ''}"
                                            on:click|stopPropagation={() => toggleTag(theme)}
                                        >
                                            {theme}
                                        </span>
                                    {/each}
                                </div>
                            {/if}
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
        transition: all 0.2s ease;
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
        min-width: 24px;
        text-align: center;
    }

    .tag-count.selected {
        background-color: rgba(255, 255, 255, 0.2);
    }

    .remove-tag {
        background: none;
        border: none;
        color: inherit;
        margin-left: 4px;
        padding: 0 4px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        opacity: 0.7;
        transition: opacity 0.2s ease;
    }

    .remove-tag:hover {
        opacity: 1;
    }

    .selected-tags {
        padding-bottom: 1rem;
        border-bottom: 1px solid #eee;
    }

    .available-tags {
        padding-top: 0.5rem;
    }

    .cursor-pointer {
        cursor: pointer;
    }

    .hover-card {
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .hover-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
</style>