<script lang="ts">
	// Imports remain the same
	import { onMount, onDestroy, tick } from 'svelte';
	import { slide } from 'svelte/transition';
	import MathRenderer from '../components/MathRenderer.svelte';
    import { page } from '$app/stores';
    import { derived } from 'svelte/store';

	export let onSelect: (uuid: string) => Promise<void>;

	// --- Interfaces (remain the same) ---
	interface SousChapitreType { code: string; description: string; }
	interface ChapitreType { id: number; description: string; sousChapitres: SousChapitreType[]; }
	interface ModuleType { id: number; niveau: string; description: string; chapitres: ChapitreType[]; }
	interface MinimalExercice {
        uuid: string;
        titre: string; // Ensure titre is expected
        metadata: { chapitre?: string; sousChapitre?: string; [key: string]: any; };
    }

	// --- Component State ---
	let allExercises: MinimalExercice[] = [];
	let modules: ModuleType[] = [];
	let expandedModules: Set<number> = new Set();
	let expandedChapitres: Set<number> = new Set();
	let expandedSousChapitres: Set<string> = new Set();
	let error: string | null = null;
	let loading: boolean = true;
	let selectedExerciseId: string | null = null;
	let isSelecting = false;

    // Filter State
    let sousChapitreFilters = new Map<string, string>();

    // --- REMOVED Pagination State ---
    // const exercisesPerPage = 10;
	// let expandedExerciseLimits = new Map<string, number>();
	// let loadingMoreExercises = new Map<string, boolean>();

	// --- Derived State from URL ---
    const currentUuidStore = derived(page, ($page, set) => {
        set($page.url.searchParams.get('uuid'));
    });

    const unsubscribeUuidStore = currentUuidStore.subscribe(value => {
        if (value !== selectedExerciseId) {
            selectedExerciseId = value;
            if (!loading && allExercises.length > 0 && modules.length > 0) {
                 preExpandTree();
                 if (selectedExerciseId) {
                    tick().then(() => {
                        scrollToSelectedExercise(selectedExerciseId);
                    });
                 }
            }
        }
    });

    onDestroy(unsubscribeUuidStore);

	// --- Lifecycle ---
	onMount(async () => {
		// console.log("Explorer Mounting..."); // Debug log
		loading = true;
		selectedExerciseId = $page.url.searchParams.get('uuid');
		try {
			const [exercicesResponse, modulesResponse] = await Promise.all([
				fetch('/exercice/recherche'),
				fetch('/data/modules-chapitres.json')
			]);

			if (!exercicesResponse.ok) throw new Error(`Failed to load exercises: ${exercicesResponse.status}`);
			if (!modulesResponse.ok) throw new Error(`Failed to load modules: ${modulesResponse.status}`);

			allExercises = await exercicesResponse.json();
			modules = await modulesResponse.json();
            // console.log("Data loaded:", { exercises: allExercises.length, modules: modules.length }); // Debug log

            preExpandTree();
            if (selectedExerciseId) {
                await tick();
                scrollToSelectedExercise(selectedExerciseId);
            }

		} catch (err: any) {
			error = `Failed to load data: ${err.message}`;
			console.error('Detailed load error:', err);
		} finally {
			loading = false;
            // console.log("Explorer Loading Finished."); // Debug log
            // Request update if needed after loading finishes and DOM is settled
            // await tick(); // Might help if initial render is empty due to timing
		}
	});

    // --- Helper Functions ---
    function preExpandTree() {
        if (!selectedExerciseId || !allExercises.length || !modules.length) return;
        const selectedExercise = allExercises.find(ex => ex.uuid === selectedExerciseId);
        if (!selectedExercise?.metadata?.chapitre || !selectedExercise?.metadata?.sousChapitre) return;

        const selChapitre = selectedExercise.metadata.chapitre.trim();
        const selSousChapitre = selectedExercise.metadata.sousChapitre.trim();

        const newExpandedModules = new Set(expandedModules);
        const newExpandedChapitres = new Set(expandedChapitres);
        const newExpandedSousChapitres = new Set(expandedSousChapitres);
        let found = false;

        findLoop: for (const module of modules) {
            for (const chapitre of module.chapitres) {
                 if (chapitre.description.trim() === selChapitre) {
                    const sousChapitre = chapitre.sousChapitres.find(sc => sc.description.trim() === selSousChapitre);
                     if (sousChapitre) {
                        newExpandedModules.add(module.id);
                        newExpandedChapitres.add(chapitre.id);
                        newExpandedSousChapitres.add(sousChapitre.code);
                        // REMOVED: Pagination limit calculation
                        found = true;
                        break findLoop;
                    }
                 }
            }
        }

        if (found) {
            expandedModules = newExpandedModules;
            expandedChapitres = newExpandedChapitres;
            expandedSousChapitres = newExpandedSousChapitres;
        }
    }

    async function scrollToSelectedExercise(uuid: string) {
        await tick();
        const element = document.getElementById(`exercise-${uuid}`);
        if (element && element.offsetParent !== null) {
             element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

	// --- Toggle Functions ---
	function toggleModule(moduleId: number) {
        const newSet = new Set(expandedModules);
		newSet.has(moduleId) ? newSet.delete(moduleId) : newSet.add(moduleId);
		expandedModules = newSet;
	}
	function toggleChapitre(chapitreId: number) {
        const newSet = new Set(expandedChapitres);
		newSet.has(chapitreId) ? newSet.delete(chapitreId) : newSet.add(chapitreId);
		expandedChapitres = newSet;
	}
	function toggleSousChapitre(code: string) {
        const newSet = new Set(expandedSousChapitres);
		if (newSet.has(code)) {
            newSet.delete(code);
            // REMOVED: resetExerciseLimit(code);
            resetFilter(code);
		} else {
			newSet.add(code);
		}
        expandedSousChapitres = newSet;
	}

    // --- Data Filtering & Calculation ---
    const descriptionCache = new Map<string, { chapitre: string; sousChapitre: string }>();
    function getDescriptionsForCode(code: string): { chapitre: string; sousChapitre: string } | null {
        if (descriptionCache.has(code)) return descriptionCache.get(code)!;
        if (!modules?.length) return null;
        for (const module of modules) {
            for (const chapitre of module.chapitres) {
                const sousChapitre = chapitre.sousChapitres.find(sc => sc.code === code);
                if (sousChapitre) {
                    const descriptions = {
                        chapitre: chapitre.description.trim(),
                        sousChapitre: sousChapitre.description.trim()
                    };
                    descriptionCache.set(code, descriptions);
                    return descriptions;
                }
            }
        }
        return null;
    }

	function getExercicesForSousChapitre(sousChapitreCode: string): MinimalExercice[] {
        if (!allExercises?.length) return [];
        const descriptions = getDescriptionsForCode(sousChapitreCode);
        if (!descriptions) return [];
        return allExercises.filter(ex =>
            ex.metadata?.chapitre?.trim() === descriptions.chapitre &&
            ex.metadata?.sousChapitre?.trim() === descriptions.sousChapitre
        );
	}

    function getFilteredExercises(code: string): MinimalExercice[] {
        const allForSc = getExercicesForSousChapitre(code);
        const filterText = (sousChapitreFilters.get(code) || '').toLowerCase().trim();
        if (!filterText) return allForSc;

        return allForSc.filter(ex => {
            // Safety Check: Ensure ex.titre is a string before calling .toLowerCase()
            const title = ex.titre;
            return typeof title === 'string' && title.toLowerCase().includes(filterText);
        });
    }

	// Count functions based on *total* exercises
	function getExercisesCountForSousChapitre(code: string): number {
		return getExercicesForSousChapitre(code).length;
	}
	function getExercisesCountForChapitre(chapitre: ChapitreType): number {
		return chapitre.sousChapitres.reduce((total, sc) => total + getExercisesCountForSousChapitre(sc.code), 0);
	}
	function getExercisesCountForModule(module: ModuleType): number {
		return module.chapitres.reduce((total, ch) => total + getExercisesCountForChapitre(ch), 0);
	}

    // Helper booleans based on *total* exercises
    function hasExercisesInSousChapitre(code: string): boolean { return getExercisesCountForSousChapitre(code) > 0; }
	function hasExercisesInChapitre(chapitre: ChapitreType): boolean { return getExercisesCountForChapitre(chapitre) > 0; }
	function hasExercisesInModule(module: ModuleType): boolean {
        // console.log(`Checking module ${module.id}: ${getExercisesCountForModule(module)} exercises`); // Debug log
        return getExercisesCountForModule(module) > 0;
    }

	// --- REMOVED Pagination Functions ---

    // --- Filter Functions ---
    function handleFilterInput(code: string, event: Event) {
        const value = (event.target as HTMLInputElement).value;
        const newFilters = new Map(sousChapitreFilters);
        newFilters.set(code, value);
        sousChapitreFilters = newFilters;
    }
    function resetFilter(code: string) {
        const newFilters = new Map(sousChapitreFilters);
        if (newFilters.has(code)) {
            newFilters.delete(code);
            sousChapitreFilters = newFilters;
        }
    }

	// --- Event Handlers ---
	async function handleClick(uuid: string) {
		if (isSelecting || uuid === selectedExerciseId) return;
        isSelecting = true;
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('uuid', uuid);
        history.replaceState({}, '', newUrl);
		try {
			await onSelect(uuid);
		} catch (e) { console.error("Selection callback failed:", e); }
        finally { isSelecting = false; }
	}
</script>

<!-- TEMPLATE - Carefully checked structure -->
<div class="theme-explorer">
	{#if loading}
		<div class="loading-spinner">
			<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Chargement...</span></div>
		</div>
	{:else if error}
		<div class="alert alert-danger mx-2" role="alert">{error}</div>
	{:else}
		<!-- Ensure modules array is populated before rendering -->
        {#if modules && modules.length > 0}
            <div class="themes-tree">
                <div class="themes-list">
                    {#each modules as module (module.id)}
                        {#if hasExercisesInModule(module)}
                            <div class="module-group">
                                <!-- Module Button -->
                                <button class="theme-button module-button" on:click={() => toggleModule(module.id)} aria-expanded={expandedModules.has(module.id)} aria-controls={`module-content-${module.id}`}>
                                    <span class="module-name">{module.niveau} - {module.description}</span>
                                    <div class="theme-right">
                                        <span class="badge">{getExercisesCountForModule(module)}</span>
                                        <div class="icon-wrapper chevron" class:rotated={expandedModules.has(module.id)}>
                                            <svg class="icon-small" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></svg>
                                        </div>
                                    </div>
                                </button>

                                {#if expandedModules.has(module.id)}
                                    <div class="chapitres" transition:slide|local={{ duration: 200 }} id={`module-content-${module.id}`}>
                                        {#each module.chapitres as chapitre (chapitre.id)}
                                            {#if hasExercisesInChapitre(chapitre)}
                                                <div class="chapitre-group">
                                                    <!-- Chapitre Button -->
                                                    <button class="theme-button chapitre-button" on:click={() => toggleChapitre(chapitre.id)} aria-expanded={expandedChapitres.has(chapitre.id)} aria-controls={`chapitre-content-${chapitre.id}`}>
                                                        <span class="chapitre-name">{chapitre.description}</span>
                                                        <div class="theme-right">
                                                            <span class="badge">{getExercisesCountForChapitre(chapitre)}</span>
                                                            <div class="icon-wrapper chevron" class:rotated={expandedChapitres.has(chapitre.id)}>
                                                                <svg class="icon-small" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></svg>
                                                            </div>
                                                        </div>
                                                    </button>

                                                    {#if expandedChapitres.has(chapitre.id)}
                                                        <div class="sous-chapitres" transition:slide|local={{ duration: 200 }} id={`chapitre-content-${chapitre.id}`}>
                                                            {#each chapitre.sousChapitres as sousChapitre (sousChapitre.code)}
                                                                {#if hasExercisesInSousChapitre(sousChapitre.code)}
                                                                    {@const totalExercicesCount = getExercisesCountForSousChapitre(sousChapitre.code)}
                                                                    {@const currentFilter = sousChapitreFilters.get(sousChapitre.code) || ''}
                                                                    {@const isScExpanded = expandedSousChapitres.has(sousChapitre.code)}
                                                                    {@const exercisesToShow = isScExpanded ? getFilteredExercises(sousChapitre.code) : []}

                                                                    <div class="sous-chapitre-group" id={`sc-group-${sousChapitre.code}`}>
                                                                        <!-- Sous-Chapitre Button -->
                                                                        <button class="theme-button sous-chapitre-button" on:click={() => toggleSousChapitre(sousChapitre.code)} aria-expanded={isScExpanded} aria-controls={`sc-content-${sousChapitre.code}`}>
                                                                            <span class="sous-chapitre-name">{sousChapitre.description}</span>
                                                                            <div class="theme-right">
                                                                                <span class="badge">{totalExercicesCount}</span>
                                                                                <div class="icon-wrapper chevron" class:rotated={isScExpanded}>
                                                                                    <svg class="icon-small" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></svg>
                                                                                </div>
                                                                            </div>
                                                                        </button>

                                                                        {#if isScExpanded}
                                                                            <div class="sous-chapitre-content" transition:slide|local={{ duration: 200 }} id={`sc-content-${sousChapitre.code}`}>
                                                                                <!-- Filter Input -->
                                                                                <div class="filter-container">
                                                                                    <input type="text" class="filter-input" placeholder="Filtrer..." value={currentFilter} on:input={(e) => handleFilterInput(sousChapitre.code, e)} aria-label={`Filtrer ${sousChapitre.description}`} on:click|stopPropagation={() => {}} autocomplete="off"/>
                                                                                    {#if currentFilter}
                                                                                    <button class="clear-filter-button" title="Effacer le filtre" on:click|stopPropagation={() => resetFilter(sousChapitre.code)} aria-label="Effacer le filtre">×</button>
                                                                                    {/if}
                                                                                </div>

                                                                                <!-- Exercise List -->
                                                                                {#if exercisesToShow.length > 0}
                                                                                    <div class="exercises-list" role="listbox" aria-label={`Exercices pour ${sousChapitre.description}`}>
                                                                                        {#each exercisesToShow as exercise (exercise.uuid)}
                                                                                            <button role="option" aria-selected={selectedExerciseId === exercise.uuid} class="exercise-item" class:selected={selectedExerciseId === exercise.uuid} class:selecting={isSelecting && selectedExerciseId === exercise.uuid} disabled={isSelecting} on:click={() => handleClick(exercise.uuid)} id={`exercise-${exercise.uuid}`}>
                                                                                                <div class="exercise-title">
                                                                                                    <MathRenderer content={exercise.titre} displayMode={false}/>
                                                                                                </div>
                                                                                            </button>
                                                                                        {/each}
                                                                                        <!-- No Load More Button -->
                                                                                    </div>
                                                                                {:else if currentFilter}
                                                                                    <p class="no-results-message">Aucun exercice ne correspond.</p>
                                                                                {:else}
                                                                                     <!-- This case should ideally not happen if hasExercisesInSousChapitre is true -->
                                                                                     <!-- <p class="no-results-message">Aucun exercice dans ce sous-chapitre (après filtrage).</p> -->
                                                                                {/if}
                                                                            </div>
                                                                        {/if}
                                                                    </div>
                                                                {/if} <!-- End hasExercisesInSousChapitre -->
                                                            {/each} <!-- End sousChapitres loop -->
                                                        </div>
                                                    {/if} <!-- End expandedChapitres -->
                                                </div>
                                            {/if} <!-- End hasExercisesInChapitre -->
                                        {/each} <!-- End chapitres loop -->
                                    </div>
                                {/if} <!-- End expandedModules -->
                            </div>
                        {/if} <!-- End hasExercisesInModule -->
                    {/each} <!-- End modules loop -->
                </div>
            </div>
        {:else if !loading && !error}
             <div class="alert alert-info mx-2" role="alert">Aucun module ou exercice trouvé.</div>
        {/if} <!-- End modules length check -->
	{/if} <!-- End loading/error check -->
</div>

<style>
	/* Styles should be the same as the previous version without pagination */
    /* --- Main Container & Loading --- */
	.theme-explorer { display: flex; flex-direction: column; width: 100%; max-width: 100%; overflow-x: hidden; min-height: 200px; }
	.loading-spinner { display: flex; justify-content: center; align-items: center; padding: 2rem; min-height: 150px; flex-grow: 1; }
	@keyframes spin { to { transform: rotate(360deg); } }
    :global(.alert) { margin: 1rem; }

	/* --- Tree Structure & Layout --- */
	.themes-tree { flex-grow: 1; overflow-y: auto; position: relative; }
	.themes-list { padding: 0.25rem; }
	.module-group, .chapitre-group { margin-bottom: 0.1rem; }

	/* --- Interactive Row Buttons --- */
	.theme-button { width: 100%; text-align: left; padding: 0.5rem 0.75rem; background: none; border: none; display: flex; justify-content: space-between; align-items: center; cursor: pointer; border-radius: 4px; transition: background-color 0.15s ease; color: var(--color-text-secondary, #4a5568); font-size: 0.875rem; gap: 0.5rem; }
	.theme-button:hover { background-color: var(--color-bg-hover-light, #f3f4f6); }
    .theme-button:focus-visible { outline: 2px solid var(--bs-primary); outline-offset: 1px; background-color: var(--color-bg-hover-light, #f3f4f6); }

	/* --- Level-Specific Button Styles --- */
	.module-button { font-weight: 600; color: var(--color-heading-text, #1a365d); font-size: 0.9rem; }
	.chapitre-button { padding-left: 1.5rem; color: var(--color-text, #2d3748); font-weight: 500; }
	.sous-chapitre-button { padding-left: 2.5rem; }

	/* --- Text Content within Buttons --- */
	.module-name, .chapitre-name, .sous-chapitre-name { flex-grow: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

	/* --- Right Aligned Content (Badge & Icon) --- */
	.theme-right { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }

	/* --- Custom Badge Style --- */
	.badge { background-color: var(--color-bg-subtle, #e2e8f0); padding: 0.15rem 0.4rem; border-radius: 3px; font-size: 0.7rem; font-weight: 500; color: var(--color-text-secondary, #4a5568); min-width: 1.75rem; text-align: center; line-height: 1.2; }

	/* --- Chevron Icon --- */
	.icon-wrapper { display: flex; align-items: center; transition: transform 0.2s ease; color: var(--color-icon, #718096); }
	.icon-wrapper.rotated { transform: rotate(90deg); }
	.icon-small { width: 18px; height: 18px; fill: currentColor; }

	/* --- Collapsible Sections & Indentation Lines --- */
	.chapitres, .sous-chapitres, .sous-chapitre-content { margin-left: 1rem; padding-left: 0.75rem; border-left: 1px solid var(--border-color-light, #e5e7eb); position: relative; }
    .sous-chapitre-content { margin-left: calc(1.5rem + 0.75rem); padding-top: 0.25rem; }

	/* --- Filter Input Area --- */
	.filter-container { position: relative; padding: 0 0.5rem 0.5rem 0; margin-bottom: 0.25rem; }
	.filter-input { width: 100%; padding: 0.3rem 2rem 0.3rem 0.6rem; font-size: 0.8rem; border: 1px solid var(--border-color-light, #d1d5db); border-radius: 4px; background-color: var(--color-bg-input, #fff); color: var(--color-text, #374151); }
    .filter-input:focus { outline: 1px solid var(--bs-primary); border-color: var(--bs-primary); box-shadow: 0 0 0 2px var(--bs-primary-bg-subtle); }
    .clear-filter-button { position: absolute; right: 0.5rem; top: 50%; transform: translateY(-50%); background: none; border: none; padding: 0.1rem 0.3rem; cursor: pointer; color: var(--color-icon, #718096); font-size: 1.2rem; line-height: 1; opacity: 0.6; transition: opacity 0.15s ease; }
    .clear-filter-button:hover { opacity: 1; color: var(--color-text, #374151); }
    .clear-filter-button:focus-visible { outline: 1px solid var(--bs-primary); border-radius: 50%; }

	/* --- Exercise List within Sub-Chapter (Scrollable) --- */
	.exercises-list { margin-left: 0; padding-left: 0; max-height: clamp(200px, 45vh, 450px); overflow-y: auto; padding-top: 0.1rem; padding-bottom: 0.25rem; border-top: 1px solid var(--border-color-extralight, #f3f4f6); scrollbar-width: thin; scrollbar-color: var(--scrollbar-thumb-color, #ccc) transparent; }
	.exercises-list::-webkit-scrollbar { width: 8px; }
	.exercises-list::-webkit-scrollbar-track { background: transparent; margin: 4px 0; }
	.exercises-list::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb-color, #ccc); border-radius: 4px; border: 2px solid transparent; background-clip: content-box; }
	.exercises-list::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-thumb-hover-color, #aaa); background-clip: content-box; }

	/* --- Individual Exercise Items --- */
	.exercise-item { display: block; width: 100%; text-align: left; padding: 0.4rem 0.6rem; margin: 0.1rem 0; background: none; border: 1px solid transparent; border-radius: 4px; cursor: pointer; transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease; color: var(--color-text, #374151); font-size: 0.8rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.exercise-item:hover { background-color: var(--color-bg-hover-light, #f3f4f6); border-color: var(--border-color-light, #d1d5db); }
    .exercise-item:focus-visible { outline: 2px solid var(--bs-primary); outline-offset: -2px; background-color: var(--color-bg-hover-light, #f3f4f6); border-color: var(--border-color-light, #d1d5db); }
	.exercise-item.selected { background-color: var(--bs-primary-bg-subtle, #e6f0fd); border-color: var(--bs-primary-border-subtle, #3b82f6); color: var(--bs-primary-text-emphasis, #052c65); font-weight: 500; }
    .exercise-item.selected:focus-visible { outline-color: var(--bs-primary-text-emphasis, #052c65); }
	.exercise-item.selecting, .exercise-item:disabled { opacity: 0.6; cursor: wait; background-color: transparent !important; border-color: transparent !important; color: var(--color-text-disabled, #999); }
	.exercise-title { display: inline-block; max-width: 100%; vertical-align: middle; }

    /* --- No Results Message --- */
    .no-results-message { padding: 0.75rem 0.5rem; font-size: 0.8rem; color: var(--color-text-secondary, #6b7280); text-align: center; font-style: italic; }
</style>