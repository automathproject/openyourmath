<!-- src/routes/search/+page.svelte -->
<script lang="ts">
    import { onMount } from 'svelte';
    import { ExerciceSearchEngine } from '$lib/utils/search';
    import type { Exercice } from '$lib/types/types';
    import Modal from '../../components/Modal.svelte';
    import CustomList from '../../components/CustomList.svelte';
    import ExerciceRenderer from '../../components/ExerciceRenderer.svelte';
    import MathRenderer from '../../components/MathRenderer.svelte';
    import AddButton from '../../components/AddButton.svelte';
    import FiltersPanel from '../../components/filters/FiltersPanel.svelte';
    // Assurez-vous d'avoir Bootstrap Icons installé dans votre projet
    // npm install bootstrap-icons
    // Et importé dans votre fichier app.html ou layout.svelte
    // <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css"
    
    export let data;
    
    let searchEngine: ExerciceSearchEngine;
    let query = '';
    let allResults: Array<{ exercise: Exercice; score: number }> = [];
    let displayedResults: Array<{ exercise: Exercice; score: number }> = [];
    let showModal = false;
    let selectedExercise: Exercice | null = null;
    let selectedTags: Set<string> = new Set();
    let allTags: Map<string, number> = new Map();
    let dynamicTagCounts: Map<string, number> = new Map();
    
    // Filtre de correction
    let correctionFilter: 'all' | 'with' | 'without' = 'all';

    // Pagination
    const ITEMS_PER_PAGE = 10;
    let currentPage = 1;
    let hasMoreItems = false;

    // Statut de chargement - initialisé à true
    let isLoading = true;

    function normalizeThemes(theme: string | string[]): string[] {
        if (Array.isArray(theme)) return theme;
        return theme ? theme.split(',').map(t => t.trim()) : [];
    }

    function updateDynamicCounts(currentResults: Array<{ exercise: Exercice; score: number }>) {
        dynamicTagCounts.clear();
        
        currentResults.forEach(result => {
            const exerciseTags = normalizeThemes(result.exercise.theme);
            exerciseTags.forEach(tag => {
                if (!selectedTags.has(tag)) {
                    dynamicTagCounts.set(tag, (dynamicTagCounts.get(tag) || 0) + 1);
                }
            });
        });

        if (selectedTags.size > 0) {
            const baseResults = query.trim() && searchEngine 
                ? searchEngine.search(query)
                : data.exercises.map(exercise => ({ exercise, score: 1 }));

            selectedTags.forEach(selectedTag => {
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

    function updateDisplayedResults() {
        const startIndex = 0;
        const endIndex = currentPage * ITEMS_PER_PAGE;
        displayedResults = allResults.slice(startIndex, endIndex);
        hasMoreItems = endIndex < allResults.length;
    }

    function loadMore() {
        currentPage += 1;
        updateDisplayedResults();
    }

    function updateResults() {
        let filteredResults;
        
        if (query.trim() && searchEngine) {
            filteredResults = searchEngine.search(query);
        } else {
            filteredResults = data.exercises.map(exercise => ({
                exercise,
                score: 1
            }));
        }

        // Applique le filtre par tags
        if (selectedTags.size > 0) {
            filteredResults = filteredResults.filter(result => {
                const exerciseTags = new Set(normalizeThemes(result.exercise.theme));
                return Array.from(selectedTags).every(tag => exerciseTags.has(tag));
            });
        }
        
        // Applique le filtre par correction
        if (correctionFilter !== 'all') {
            filteredResults = filteredResults.filter(result => {
                const hasCorrection = 
        result.exercise.metadata?.hasCorrection === true || 
        result.exercise.metadata?.hasCorrection === "true";
                return correctionFilter === 'with' ? hasCorrection : !hasCorrection;
            });
        }

        // Réinitialiser la pagination
        currentPage = 1;
        allResults = filteredResults;
        updateDisplayedResults();
        updateDynamicCounts(filteredResults);
    }

    onMount(() => {
        if (data?.exercises) {
            // Initialisation des données
            setTimeout(() => {
                searchEngine = new ExerciceSearchEngine();
                searchEngine.initialize(data.exercises);
                
                data.exercises.forEach(exercise => {
                    const themes = normalizeThemes(exercise.theme);
                    themes.forEach(theme => {
                        allTags.set(theme, (allTags.get(theme) || 0) + 1);
                    });
                });
                allTags = new Map(allTags);
                
                updateResults();
                isLoading = false;
            }, 0); // Exécution asynchrone pour permettre au header de s'afficher
        }
    });

    async function handleExerciseClick(exercise: Exercice) {
        try {
            const response = await fetch(`/exercice/${exercise.uuid}`);
            if (!response.ok) {
                throw new Error('Erreur lors du chargement de l\'exercice');
            }
            selectedExercise = await response.json();
            showModal = true;
        } catch (error) {
            console.error('Erreur lors du chargement de l\'exercice:', error);
            // Optionnel : ajouter une notification d'erreur pour l'utilisateur
        }
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
        updateResults();
    }

    // Réagir aux changements de la recherche et des filtres
    $: query, updateResults();
    $: correctionFilter, updateResults();
</script>

<div class="container-fluid">
    <!-- Header - toujours affiché immédiatement -->
    <div class="row mb-4">
        <div class="col-12 d-flex flex-column align-items-center">
            <div class="search-brand mb-4 mt-5">
                <h1 class="search-title"><span class="search-highlight">Search</span>yourMath</h1>
            </div>
            <div class="search-container">
                <div class="search-input-wrapper">
                    <i class="search-icon bi bi-search"></i>
                    <input
                        type="text"
                        bind:value={query}
                        placeholder="Rechercher un exercice..."
                        class="search-input"
                        disabled={isLoading}
                    />
                    {#if query.length > 0}
                        <button class="search-clear-btn" on:click={() => query = ''}>
                            <i class="bi bi-x"></i>
                        </button>
                    {/if}
                </div>
            </div>
        </div>
    </div>

    <!-- Contenu principal - affiché avec état de chargement -->
    <div class="row">
        {#if isLoading}
            <div class="col-12">
                <div class="loading-container">
                    <div class="search-loader">
                        <div class="search-loader-dot" style="--delay: 0s"></div>
                        <div class="search-loader-dot" style="--delay: 0.1s"></div>
                        <div class="search-loader-dot" style="--delay: 0.2s"></div>
                        <div class="search-loader-dot" style="--delay: 0.3s"></div>
                    </div>
                    <div class="mt-3 search-loader-text">Chargement des exercices...</div>
                </div>
            </div>
        {:else}
            <!-- Colonne de gauche : Filtres -->
            <div class="col-12 col-md-4 col-lg-3">
                <FiltersPanel
                    {selectedTags}
                    {allTags}
                    {dynamicTagCounts}
                    bind:correctionFilter
                    on:toggleTag={({ detail }) => toggleTag(detail.tag)}
                    on:resetTags={() => {
                        selectedTags.clear();
                        selectedTags = selectedTags;
                        updateResults();
                    }}
                    on:filterChange={() => updateResults()}
                />
            </div>
    
            <!-- Colonne de droite : Résultats -->
            <div class="col-12 col-md-5 col-lg-5">
                <div class="alert alert-info">
                    <div class="d-flex justify-content-between align-items-center">
                        <strong>{allResults.length} exercice(s) trouvé(s)</strong>
                        <div class="d-flex flex-wrap gap-2 justify-content-end">
                            {#if selectedTags.size > 0}
                                <small class="badge bg-secondary">
                                    Thèmes : {Array.from(selectedTags).join(', ')}
                                </small>
                            {/if}
                            {#if correctionFilter !== 'all'}
                                <small class="badge bg-secondary">
                                    {correctionFilter === 'with' ? 'Avec correction' : 'Sans correction'}
                                </small>
                            {/if}
                        </div>
                    </div>
                </div>
            
                <div class="d-flex flex-column gap-3">
                    {#each displayedResults as result (result.exercise.uuid)}
                        <div class="card hover-card">
                            <div class="card-body position-relative">
                                <div class="add-button-wrapper">
                                    <AddButton uuid={result.exercise.uuid} />
                                </div>
                                <!-- Exercise content (clickable) -->
                                <div 
                                    class="exercise-content cursor-pointer"
                                    on:click={() => handleExerciseClick(result.exercise)}
                                >
                                    <h5 class="card-title">
                                        <MathRenderer content={result.exercise.titre}/>
                                    </h5>
                                    
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
                                    
                                    {#if result.exercise.preview}
                                        <p class="card-text text-muted mb-2">
                                            <span class="preview-html">
                                                <MathRenderer content={result.exercise.preview}/>
                                            </span>
                                        </p>
                                    {/if}
                                </div>
                                <small class="text-muted position-absolute bottom-0 end-0 p-2">{result.exercise.uuid}</small>
                            </div>
                        </div>
                    {/each}
                </div>
    
                {#if hasMoreItems}
                    <div class="text-center mt-4">
                        <button class="btn btn-primary" on:click={loadMore}>
                            Charger plus d'exercices
                        </button>
                    </div>
                {/if}
            </div>
            
            <!-- Custom List Column -->
            <div class="d-none d-md-block col-md-3 col-lg-4">
                <CustomList showMobileButton={false} />
            </div>
            
            <!-- Mobile Custom List Modal -->
            <div class="d-block d-md-none">
                <CustomList showMobileButton={true} />
            </div>
        {/if}
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
    /* Styles du moteur de recherche */
    .search-brand {
        text-align: center;
        padding: 1rem 0;
    }
    
    .search-title {
        font-size: 2.5rem;
        font-weight: 500;
        letter-spacing: -1px;
        color: #333;
        margin: 0;
    }
    
    .search-highlight {
        color: #4285F4;
        font-weight: 700;
    }
    
    .search-container {
        width: 100%;
        max-width: 640px;
        margin-bottom: 2rem;
    }
    
    .search-input-wrapper {
        position: relative;
        width: 100%;
        display: flex;
        align-items: center;
        box-shadow: 0 1px 6px rgba(32, 33, 36, 0.28);
        border-radius: 24px;
        transition: box-shadow 0.3s;
    }
    
    .search-input-wrapper:hover, 
    .search-input-wrapper:focus-within {
        box-shadow: 0 1px 10px rgba(32, 33, 36, 0.45);
    }
    
    .search-icon {
        position: absolute;
        left: 16px;
        color: #9AA0A6;
        font-size: 1.2rem;
    }
    
    .search-input {
        height: 48px;
        border: none;
        border-radius: 24px;
        padding: 0 48px 0 48px;
        font-size: 1rem;
        width: 100%;
        outline: none;
    }
    
    .search-clear-btn {
        position: absolute;
        right: 16px;
        background: none;
        border: none;
        color: #9AA0A6;
        cursor: pointer;
        font-size: 1.2rem;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .search-clear-btn:hover {
        color: #4285F4;
    }
    
    /* Styles existants */
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

    .preview-html {
        font-size: 0.9rem;
        color: #6c757d;
    }
    
    .preview-html :global(p) {
        margin: 0;
    }

    .exercise-content {
        padding-right: 3rem;
    }

    .add-button-wrapper {
        position: absolute;
        right: 1rem;
        top: 1rem;
        z-index: 2;
    }

    .loading-container {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        min-height: 300px;
        color: #666;
    }
    
    .search-loader {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 6px;
    }
    
    .search-loader-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        animation: loader-bounce 1.4s ease infinite;
        animation-delay: var(--delay);
    }
    
    .search-loader-dot:nth-child(1) { background-color: #4285F4; }
    .search-loader-dot:nth-child(2) { background-color: #EA4335; }
    .search-loader-dot:nth-child(3) { background-color: #FBBC05; }
    .search-loader-dot:nth-child(4) { background-color: #34A853; }
    
    .search-loader-text {
        color: #5f6368;
        font-size: 0.95rem;
    }
    
    @keyframes loader-bounce {
        0%, 100% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(-10px);
        }
    }
</style>