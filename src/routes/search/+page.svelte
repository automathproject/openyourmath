<!-- src/routes/search/+page.svelte -->
<script lang="ts">
    import { onMount } from 'svelte';
    import { ExerciceSearchEngine } from '$lib/utils/search';
    import type { Exercice } from '$lib/types/types';
    import Modal from '../../components/Modal.svelte';
    import CustomList from '../../components/CustomList.svelte';
    import ExerciceRenderer from '../../components/ExerciceRenderer.svelte';
    import MathRenderer from '../../components/MathRenderer.svelte';
    import {  customList, addToCustomList, removeFromCustomList } from '$lib/stores/customList';
    import { slide } from 'svelte/transition';

    
    
    export let data;

    let exercicesInList: Set<string>;
    
    customList.subscribe(list => {
        exercicesInList = new Set(list.map(ex => ex.uuid));
    });
    
    let searchEngine: ExerciceSearchEngine;
    let query = '';
    let allResults: Array<{ exercise: Exercice; score: number }> = [];
    let displayedResults: Array<{ exercise: Exercice; score: number }> = [];
    let showModal = false;
    let selectedExercise: Exercice | null = null;
    let selectedTags: Set<string> = new Set();
    let allTags: Map<string, number> = new Map();
    let dynamicTagCounts: Map<string, number> = new Map();
    let showFilters = true;

    // Pagination
    const ITEMS_PER_PAGE = 10;
    let currentPage = 1;
    let hasMoreItems = false;

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

        if (selectedTags.size > 0) {
            filteredResults = filteredResults.filter(result => {
                const exerciseTags = new Set(normalizeThemes(result.exercise.theme));
                return Array.from(selectedTags).every(tag => exerciseTags.has(tag));
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
        updateResults();
    }

    // Réagir aux changements de la recherche
    $: query, updateResults();

    function getPreview(content: string, maxLength: number = 150): string {
        if (!content) return '';
        
        if (content.length <= maxLength) return content;
        
        const truncated = content.slice(0, maxLength);
        
        const lastDoubleDollar = truncated.lastIndexOf('$$');
        const lastSingleDollar = truncated.lastIndexOf('$');
        const lastBracketOpen = truncated.lastIndexOf('\\[');
        const lastParenOpen = truncated.lastIndexOf('\\(');
        
        const lastBracketClose = truncated.lastIndexOf('\\]');
        const lastParenClose = truncated.lastIndexOf('\\)');
        
        let safeEnd = maxLength;
        
        if (lastDoubleDollar !== -1) {
            const doubleDollarMatches = truncated.match(/\$\$/g) || [];
            if (doubleDollarMatches.length % 2 !== 0) {
                safeEnd = Math.min(safeEnd, lastDoubleDollar);
            }
        }
        
        if (lastSingleDollar !== -1) {
            const contentWithoutDoubleDollar = truncated.replace(/\$\$/g, '##');
            const singleDollarCount = (contentWithoutDoubleDollar.match(/\$/g) || []).length;
            if (singleDollarCount % 2 !== 0) {
                safeEnd = Math.min(safeEnd, lastSingleDollar);
            }
        }
        
        if (lastBracketOpen !== -1 && (lastBracketClose === -1 || lastBracketClose < lastBracketOpen)) {
            safeEnd = Math.min(safeEnd, lastBracketOpen);
        }
        
        if (lastParenOpen !== -1 && (lastParenClose === -1 || lastParenClose < lastParenOpen)) {
            safeEnd = Math.min(safeEnd, lastParenOpen);
        }
        
        return content.slice(0, safeEnd) + ' ...';
    }

    function toggleCustomList(exercise: Exercice, event: MouseEvent) {
    event.stopPropagation();
    if (exercicesInList.has(exercise.uuid)) {
        removeFromCustomList(exercise);
    } else {
        addToCustomList(exercise);
    }
}

let showCustomListModal = false;
</script>

<div class="container-fluid p-4">
    <div class="row">
        <!-- Colonne de gauche : Filtres -->
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
        <div class="col-12 col-md-5 col-lg-6">
            <div class="alert alert-info">
                <div class="d-flex justify-content-between align-items-center">
                    <strong>{allResults.length} exercice(s) trouvé(s)</strong>
                    {#if selectedTags.size > 0}
                        <small class="text-muted">
                            Filtres : {Array.from(selectedTags).join(', ')}
                        </small>
                    {/if}
                </div>
            </div>
        
            <div class="d-flex flex-column gap-3">
                {#each displayedResults as result (result.exercise.uuid)}
                    <div class="card hover-card">
                        <div class="card-body position-relative">
                            <!-- Add button -->
                            <button 
                            class="btn-add {exercicesInList.has(result.exercise.uuid) ? 'added' : ''}"
                            on:click={(e) => toggleCustomList(result.exercise, e)}
                            title={exercicesInList.has(result.exercise.uuid) ? "Retirer de ma liste" : "Ajouter à ma liste"}
                        >
                            {exercicesInList.has(result.exercise.uuid) ? '−' : '+'}
                        </button>
                            
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
                                
                                {#if result.exercise.contenu.length > 0}
                                    {@const previewContent = result.exercise.contenu.find(el => el.type === "description") || 
                                                           result.exercise.contenu.find(el => el.type === "question")}
                                    {#if previewContent && previewContent.value.html}
                                        <p class="card-text text-muted mb-2">
                                            <span class="preview-html">
                                                <MathRenderer content={getPreview(previewContent.value.html)}/>
                                            </span>
                                        </p>
                                    {/if}
                                {/if}
                            </div>
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
        <div class="d-none d-md-block col-md-3 col-lg-3">
            <CustomList showMobileButton={false} />
        </div>
        <!-- Mobile Custom List Modal -->
         <div class="d-block d-md-none">
            <CustomList showMobileButton={true} />
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

    .preview-html {
        font-size: 0.9rem;
        color: #6c757d;
    }
    
    .preview-html :global(p) {
        margin: 0;
    }

    .preview-type {
        font-size: 0.8rem;
        color: #999;
        font-style: italic;
        margin-left: 0.5rem;
    }

    .btn-add {
        position: absolute;
        right: 1rem;
        top: 1rem;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background-color: #e0e0e0;
        border: none;
        color: #333;
        font-size: 20px;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
        z-index: 1;
    }

    .btn-add:hover {
        background-color: #d0d0d0;
        transform: scale(1.1);
    }

    .btn-add.added {
        background-color: #333;
        color: #fff;
    }

    .exercise-content {
        padding-right: 3rem;
    }

    .custom-list-item {
        padding: 0.5rem;
        background-color: #f8f9fa;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
    }

    .btn-remove {
        background: none;
        border: none;
        color: #dc3545;
        font-size: 20px;
        font-weight: bold;
        padding: 0 6px;
        cursor: pointer;
        opacity: 0.7;
        transition: opacity 0.2s ease;
    }

    .btn-remove:hover {
        opacity: 1;
    }

    .custom-list-content {
    max-height: calc(80vh - 180px);
    overflow-y: auto;
    padding-right: 0.5rem;
}

.sticky-top {
    z-index: 1030;  /* s'assurer qu'il reste sous les modals */
    max-height: 80vh;
    overflow-y: auto;
}

.uuids-list {
    font-size: 0.75rem;
    color: #6c757d;
    word-wrap: break-word;
    line-height: 1.2;
    margin-bottom: 1rem;
}

.floating-list-button {
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    background: #0d6efd;
    color: white;
    border: none;
    border-radius: 1rem;
    padding: 0.5rem 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    z-index: 1030;
}

.list-count {
    font-size: 1.2rem;
    font-weight: bold;
}

.list-label {
    font-size: 0.8rem;
}

.custom-list-modal {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: white;
    border-top-left-radius: 1rem;
    border-top-right-radius: 1rem;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
    z-index: 2001;
}

.custom-list-modal-header {
    padding: 1rem;
    border-bottom: 1px solid #dee2e6;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: sticky;
    top: 0;
    background: white;
}

.custom-list-modal-body {
    padding: 1rem;
}
</style>