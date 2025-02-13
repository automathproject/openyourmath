<!-- src/routes/RechercheModules.svelte -->
<script lang="ts">
    import { onMount } from 'svelte';
    import { slide } from 'svelte/transition';
    import MathRenderer from '../components/MathRenderer.svelte';
  
    export let onSelect: (uuid: string) => void;
  
    interface SousChapitreType {
        code: string;
        description: string;
    }
  
    interface ChapitreType {
        id: number;
        description: string;
        sousChapitres: SousChapitreType[];
    }
  
    interface ModuleType {
        id: number;
        niveau: string;
        description: string;
        chapitres: ChapitreType[];
    }
  
    let exercises: {
        uuid: string;
        titre: string;
        metadata: {
            chapitre?: string;
            sousChapitre?: string;
            [key: string]: any;
        };
        [key: string]: any;
    }[] = [];
    
    let modules: ModuleType[] = [];
    let expandedModules: Set<number> = new Set();
    let expandedChapitres: Set<number> = new Set();
    let expandedSousChapitres: Set<string> = new Set();
    let error: string | null = null;
    let loading: boolean = true;
    let selectedExerciseId: string | null = null;
    let isSelecting = false;
    let moduleChapitreMap = new Map<string, string>();

    // Pagination
    let exercisesPerPage = 10;
    let expandedExerciseLimits = new Map<string, number>();
    let loadingMoreExercises = new Map<string, boolean>();

    function getInitialLimit() {
        return exercisesPerPage;
    }

    function getExerciceLimit(code: string): number {
        return expandedExerciseLimits.get(code) || getInitialLimit();
    }

    async function loadMoreExercises(code: string) {
        loadingMoreExercises.set(code, true);
        loadingMoreExercises = loadingMoreExercises;

        try {
            const currentLimit = getExerciceLimit(code);
            expandedExerciseLimits.set(code, currentLimit + exercisesPerPage);
            expandedExerciseLimits = expandedExerciseLimits;
            
            // Petit délai pour une meilleure UX
            await new Promise(resolve => setTimeout(resolve, 300));
        } finally {
            loadingMoreExercises.delete(code);
            loadingMoreExercises = loadingMoreExercises;
        }
    }

    function resetExerciseLimit(code: string) {
        expandedExerciseLimits.delete(code);
        expandedExerciseLimits = expandedExerciseLimits;
    }
  
    onMount(async () => {
        try {
            const exercicesResponse = await fetch('/exercice/recherche');
            const modulesResponse = await fetch('/data/modules-chapitres.json');
            
            if (!exercicesResponse.ok || !modulesResponse.ok) {
                const status = !exercicesResponse.ok 
                    ? `Exercices: ${exercicesResponse.status}` 
                    : `Modules: ${modulesResponse.status}`;
                error = `Erreur lors du chargement des données (${status})`;
                return;
            }
  
            exercises = await exercicesResponse.json();
            modules = await modulesResponse.json();
            
            // Créer une map des chapitres pour faciliter la correspondance
            modules.forEach(module => {
                module.chapitres.forEach(chapitre => {
                    chapitre.sousChapitres.forEach(sousChapitre => {
                        moduleChapitreMap.set(sousChapitre.description, sousChapitre.code);
                    });
                });
            });
        } catch (err: any) {
            error = `Échec du chargement : ${err.message}`;
            console.error('Erreur détaillée:', err);
        } finally {
            loading = false;
        }
    });
  
    function toggleModule(moduleId: number) {
        if (expandedModules.has(moduleId)) {
            expandedModules.delete(moduleId);
        } else {
            expandedModules.add(moduleId);
        }
        expandedModules = expandedModules;
    }
  
    function toggleChapitre(chapitreId: number) {
        if (expandedChapitres.has(chapitreId)) {
            expandedChapitres.delete(chapitreId);
        } else {
            expandedChapitres.add(chapitreId);
        }
        expandedChapitres = expandedChapitres;
    }
  
    function toggleSousChapitre(code: string) {
        if (expandedSousChapitres.has(code)) {
            handleSousChapitreClose(code);
        } else {
            expandedSousChapitres.add(code);
        }
        expandedSousChapitres = expandedSousChapitres;
    }

    function handleSousChapitreClose(code: string) {
        expandedSousChapitres.delete(code);
        resetExerciseLimit(code);
        expandedSousChapitres = expandedSousChapitres;
    }
  
    function getExercicesForSousChapitre(code: string): any[] {
        let sousChapitreTrouve = null;
        let chapitreTrouve = null;
  
        // Recherche dans les modules
        for (const module of modules) {
            for (const chapitre of module.chapitres) {
                const sousChapitre = chapitre.sousChapitres.find(sc => sc.code === code);
                if (sousChapitre) {
                    sousChapitreTrouve = sousChapitre;
                    chapitreTrouve = chapitre;
                    break;
                }
            }
            if (chapitreTrouve) break;
        }
  
        if (!sousChapitreTrouve || !chapitreTrouve) {
            return [];
        }
  
        return exercises.filter(ex => {
            if (!ex.metadata?.chapitre || !ex.metadata?.sousChapitre) {
                return false;
            }
            return (
                ex.metadata.chapitre === chapitreTrouve.description && 
                ex.metadata.sousChapitre === sousChapitreTrouve.description
            );
        });
    }

    function getDisplayedExercices(code: string): any[] {
        const allExercices = getExercicesForSousChapitre(code);
        const limit = getExerciceLimit(code);
        return allExercices.slice(0, limit);
    }

    function hasMoreExercises(code: string): boolean {
        const allExercices = getExercicesForSousChapitre(code);
        const limit = getExerciceLimit(code);
        return allExercices.length > limit;
    }
  
    async function handleClick(uuid: string) {
        if (isSelecting) return;
        try {
            isSelecting = true;
            selectedExerciseId = uuid;
            await onSelect(uuid);
        } finally {
            isSelecting = false;
        }
    }
</script>
  
<div class="theme-explorer">
    {#if loading}
        <div class="loading-spinner">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Chargement...</span>
            </div>
        </div>
    {:else if error}
        <div class="alert alert-danger" role="alert">
            {error}
        </div>
    {:else}
        <div class="themes-tree">
            <div class="themes-list">
                {#each modules as module}
                    <div class="module-group">
                        <button 
                            class="theme-button module-button" 
                            on:click={() => toggleModule(module.id)}
                        >
                            <span class="module-name">{module.niveau} - {module.description}</span>
                            <div class="icon-wrapper chevron" class:rotated={expandedModules.has(module.id)}>
                                <svg class="icon-small" viewBox="0 0 24 24">
                                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                                </svg>
                            </div>
                        </button>
  
                        {#if expandedModules.has(module.id)}
                            <div class="chapitres" transition:slide|local>
                                {#each module.chapitres as chapitre}
                                    <div class="chapitre-group">
                                        <button 
                                            class="theme-button chapitre-button" 
                                            on:click={() => toggleChapitre(chapitre.id)}
                                        >
                                            <span class="chapitre-name">{chapitre.description}</span>
                                            <div class="theme-right">
                                                <span class="badge">{chapitre.sousChapitres.length}</span>
                                                <div class="icon-wrapper chevron" class:rotated={expandedChapitres.has(chapitre.id)}>
                                                    <svg class="icon-small" viewBox="0 0 24 24">
                                                        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                                                    </svg>
                                                </div>
                                            </div>
                                        </button>
  
                                        {#if expandedChapitres.has(chapitre.id)}
                                            <div class="sous-chapitres" transition:slide|local>
                                                {#each chapitre.sousChapitres as sousChapitre}
                                                    <div class="sous-chapitre-group">
                                                        <button 
                                                            class="theme-button sous-chapitre-button" 
                                                            on:click={() => toggleSousChapitre(sousChapitre.code)}
                                                        >
                                                            <span class="sous-chapitre-name">{sousChapitre.description}</span>
                                                            <div class="theme-right">
                                                                <span class="badge">
                                                                    {getExercicesForSousChapitre(sousChapitre.code).length}
                                                                </span>
                                                                <div class="icon-wrapper chevron" class:rotated={expandedSousChapitres.has(sousChapitre.code)}>
                                                                    <svg class="icon-small" viewBox="0 0 24 24">
                                                                        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                                                                    </svg>
                                                                </div>
                                                            </div>
                                                        </button>
  
                                                        {#if expandedSousChapitres.has(sousChapitre.code)}
                                                            <div class="exercises-list" transition:slide|local>
                                                                {#each getDisplayedExercices(sousChapitre.code) as exercise}
                                                                    <button
                                                                        class="exercise-item"
                                                                        class:selected={selectedExerciseId === exercise.uuid}
                                                                        class:selecting={isSelecting && selectedExerciseId === exercise.uuid}
                                                                        disabled={isSelecting}
                                                                        on:click={() => handleClick(exercise.uuid)}
                                                                    >
                                                                        <div class="exercise-title">
                                                                            <MathRenderer content={exercise.titre} />
                                                                        </div>
                                                                    </button>
                                                                {/each}

                                                                {#if hasMoreExercises(sousChapitre.code)}
                                                                    <button 
                                                                        class="load-more-button"
                                                                        on:click={() => loadMoreExercises(sousChapitre.code)}
                                                                        disabled={loadingMoreExercises.get(sousChapitre.code)}
                                                                    >
                                                                        {#if loadingMoreExercises.get(sousChapitre.code)}
                                                                            <div class="loading-spinner"></div>
                                                                        {:else}
                                                                            Voir plus d'exercices 
                                                                            ({getExercicesForSousChapitre(sousChapitre.code).length - getExerciceLimit(sousChapitre.code)} restants)
                                                                        {/if}
                                                                    </button>
                                                                {/if}
                                                            </div>
                                                        {/if}
                                                    </div>
                                                {/each}
                                            </div>
                                        {/if}
                                    </div>
                                {/each}
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        </div>
    {/if}
</div>
  
<style>
    .theme-explorer {
        width: 100%;
        max-width: 100%;
        overflow-x: hidden;
    }

    .loading-spinner {
        display: flex;
        justify-content: center;
        padding: 2rem;
    }

    .themes-tree {
        margin-top: 1rem;
    }

    .theme-button {
        width: 100%;
        text-align: left;
        padding: 0.5rem;
        background: none;
        border: none;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        border-radius: 0.25rem;
        transition: background-color 0.2s;
    }

    .theme-button:hover {
        background-color: #f3f4f6;
    }

    .module-button {
        font-weight: 600;
        color: #1a365d;
    }

    .chapitre-button {
        padding-left: 1.5rem;
        color: #2d3748;
    }

    .sous-chapitre-button {
        padding-left: 3rem;
        color: #4a5568;
    }

    .theme-right {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .badge {
        background-color: #e2e8f0;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.75rem;
        color: #4a5568;
    }

    .icon-wrapper {
        display: flex;
        align-items: center;
        transition: transform 0.2s;
    }

    .icon-wrapper.rotated {
        transform: rotate(90deg);
    }

    .icon-small {
        width: 20px;
        height: 20px;
        fill: currentColor;
    }

    .exercises-list {
        max-height: 70vh;
        overflow-y: auto;
        padding-right: 0.5rem;
        margin-left: 3rem;
    }

    .exercises-list::-webkit-scrollbar {
        width: 6px;
    }

    .exercises-list::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 3px;
    }

    .exercises-list::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 3px;
    }

    .exercises-list::-webkit-scrollbar-thumb:hover {
        background: #555;
    }

    .exercise-item {
        width: 100%;
        text-align: left;
        padding: 0.5rem;
        margin: 0.25rem 0;
        background: none;
        border: 1px solid #e5e7eb;
        border-radius: 0.25rem;
        cursor: pointer;
        transition: all 0.2s;
    }

    .exercise-item:hover {
        background-color: #f3f4f6;
        border-color: #d1d5db;
    }

    .exercise-item.selected {
        background-color: #e6f0fd;
        border-color: #3b82f6;
    }

    .exercise-item:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }

    .exercise-title {
        font-size: 0.875rem;
        color: #374151;
    }

    .load-more-button {
        width: 100%;
        padding: 0.5rem;
        margin-top: 0.5rem;
        background-color: #f3f4f6;
        border: 1px solid #e5e7eb;
        border-radius: 0.375rem;
        color: #374151;
        font-size: 0.875rem;
        text-align: center;
        transition: background-color 0.2s;
        cursor: pointer;
    }

    .load-more-button:hover:not(:disabled) {
        background-color: #e5e7eb;
    }

    .load-more-button:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }

    .load-more-button .loading-spinner {
        width: 1rem;
        height: 1rem;
        border: 2px solid #e5e7eb;
        border-top-color: #374151;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto;
        padding: 0;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

    .chapitres, .sous-chapitres {
        margin-left: 0.5rem;
        border-left: 1px solid #e5e7eb;
    }
</style>