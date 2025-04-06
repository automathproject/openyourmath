<script lang="ts">
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import MathRenderer from '../components/MathRenderer.svelte';
    import { page } from '$app/stores'; // To potentially read current UUID

	export let onSelect: (uuid: string) => Promise<void>; // Indicate async

	// --- Interfaces ---
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
	interface MinimalExercice {
		uuid: string;
		titre: string;
		metadata: {
			chapitre?: string;
			sousChapitre?: string;
			[key: string]: any; // Allow other metadata keys
		};
	}

	// --- Component State ---
	let exercises: MinimalExercice[] = [];
	let modules: ModuleType[] = [];
	let expandedModules: Set<number> = new Set();
	let expandedChapitres: Set<number> = new Set();
	let expandedSousChapitres: Set<string> = new Set();
	let error: string | null = null;
	let loading: boolean = true;
	let selectedExerciseId: string | null = $page.url.searchParams.get('uuid'); // Initialize from URL
	let isSelecting = false; // Track async selection state

	// Pagination State
	const exercisesPerPage = 10; // Items per page load
	let expandedExerciseLimits = new Map<string, number>();
	let loadingMoreExercises = new Map<string, boolean>(); // Track loading state per sub-chapter

    // Update selectedExerciseId when URL changes externally
    $: selectedExerciseId = $page.url.searchParams.get('uuid');

	// --- Lifecycle ---
	onMount(async () => {
		loading = true;
		try {
			const [exercicesResponse, modulesResponse] = await Promise.all([
				fetch('/exercice/recherche'), // Endpoint providing minimal exercise list
				fetch('/data/modules-chapitres.json')
			]);

			if (!exercicesResponse.ok) throw new Error(`Failed to load exercises: ${exercicesResponse.status}`);
			if (!modulesResponse.ok) throw new Error(`Failed to load modules: ${modulesResponse.status}`);

			exercises = await exercicesResponse.json();
			modules = await modulesResponse.json();

            // Pre-expand based on initial selectedExerciseId
            preExpandTree();

		} catch (err: any) {
			error = `Failed to load data: ${err.message}`;
			console.error('Detailed load error:', err);
		} finally {
			loading = false;
		}
	});

    // --- Helper Functions ---
    function preExpandTree() {
        if (!selectedExerciseId || !exercises.length || !modules.length) return;

        const selectedExercise = exercises.find(ex => ex.uuid === selectedExerciseId);
        if (!selectedExercise?.metadata?.chapitre || !selectedExercise?.metadata?.sousChapitre) return;

        const selChapitre = selectedExercise.metadata.chapitre.trim();
        const selSousChapitre = selectedExercise.metadata.sousChapitre.trim();

        // Use temporary sets/maps for pre-expansion updates
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
                        found = true;
                        break findLoop; // Found and expanded
                    }
                }
            }
        }

        // Assign the new sets at the end to trigger reactivity once
        if (found) {
            expandedModules = newExpandedModules;
            expandedChapitres = newExpandedChapitres;
            expandedSousChapitres = newExpandedSousChapitres;
        }
    }

	// --- Toggle Functions ---
	function toggleModule(moduleId: number) {
        const newSet = new Set(expandedModules);
		newSet.has(moduleId) ? newSet.delete(moduleId) : newSet.add(moduleId);
		expandedModules = newSet; // Assign new Set
	}
	function toggleChapitre(chapitreId: number) {
        const newSet = new Set(expandedChapitres);
		newSet.has(chapitreId) ? newSet.delete(chapitreId) : newSet.add(chapitreId);
		expandedChapitres = newSet; // Assign new Set
	}
	function toggleSousChapitre(code: string) {
        const newSet = new Set(expandedSousChapitres);
		if (newSet.has(code)) {
            // Closing
            newSet.delete(code);
			resetExerciseLimit(code); // Reset pagination on close
		} else {
            // Opening
			newSet.add(code);
            // Optional: Initialize limit here if needed, although getExerciceLimit has fallback
            // if (!expandedExerciseLimits.has(code)) { ... assign new map ... }
		}
        expandedSousChapitres = newSet; // Assign new Set
	}
    // Removed handleSousChapitreClose

	// --- Data Filtering & Calculation ---
	// Memoization could be added here if performance degrades with large datasets
	function getExercicesForSousChapitre(sousChapitreCode: string): MinimalExercice[] {
		// Ensure data is loaded - defensively check arrays
        if (!exercises?.length || !modules?.length) return [];

		let targetChapitreDesc: string | null = null;
		let targetSousChapitreDesc: string | null = null;

		// Find the descriptions associated with the code
		findLoop: for (const module of modules) {
			for (const chapitre of module.chapitres) {
				const sousChapitre = chapitre.sousChapitres.find(sc => sc.code === sousChapitreCode);
				if (sousChapitre) {
					targetChapitreDesc = chapitre.description.trim();
					targetSousChapitreDesc = sousChapitre.description.trim();
					break findLoop;
				}
			}
		}

		if (!targetChapitreDesc || !targetSousChapitreDesc) {
            // console.warn(`Could not find descriptions for sousChapitreCode: ${sousChapitreCode}`);
            return [];
        }

		// Filter exercises matching the found descriptions
		return exercises.filter(ex =>
			ex.metadata?.chapitre?.trim() === targetChapitreDesc &&
			ex.metadata?.sousChapitre?.trim() === targetSousChapitreDesc
		);
	}

    // Count functions using the filtered data
	function getExercisesCountForSousChapitre(code: string): number {
		return getExercicesForSousChapitre(code).length;
	}
	function getExercisesCountForChapitre(chapitre: ChapitreType): number {
		return chapitre.sousChapitres.reduce((total, sc) => total + getExercisesCountForSousChapitre(sc.code), 0);
	}
	function getExercisesCountForModule(module: ModuleType): number {
		return module.chapitres.reduce((total, ch) => total + getExercisesCountForChapitre(ch), 0);
	}
    // Helper booleans for conditional rendering
    function hasExercisesInSousChapitre(code: string): boolean { return getExercisesCountForSousChapitre(code) > 0; }
	function hasExercisesInChapitre(chapitre: ChapitreType): boolean { return getExercisesCountForChapitre(chapitre) > 0; }
	function hasExercisesInModule(module: ModuleType): boolean { return getExercisesCountForModule(module) > 0; }


	// --- Pagination Functions ---
    function getInitialLimit(): number { return exercisesPerPage; }
	function getExerciceLimit(code: string): number {
		return expandedExerciseLimits.get(code) || getInitialLimit();
	}

	async function loadMoreExercises(code: string) {
		// Use a new map for the loading state update
		const newLoadingMap = new Map(loadingMoreExercises);
		if (newLoadingMap.get(code)) return; // Check using the new map instance

		console.log(`[Load More] Starting for code: ${code}`);

		newLoadingMap.set(code, true);
		loadingMoreExercises = newLoadingMap; // Assign the NEW map

		try {
			const currentLimit = getExerciceLimit(code);
			const newLimit = currentLimit + exercisesPerPage;
			console.log(`[Load More] Code: ${code}, Current Limit: ${currentLimit}, New Limit: ${newLimit}`);

			// Simulate network delay - REMOVE or keep short for testing
			// await new Promise(resolve => setTimeout(resolve, 300));

			// Create and assign a new map for the limits
			const newLimitsMap = new Map(expandedExerciseLimits);
			newLimitsMap.set(code, newLimit);
			expandedExerciseLimits = newLimitsMap; // Assign the NEW map

            console.log('[Load More] Updated expandedExerciseLimits:', new Map(expandedExerciseLimits)); // Log the map state

		} catch (error) {
            console.error(`[Load More] Error for code ${code}:`, error); // Log errors
        } finally {
            console.log(`[Load More] Finishing for code: ${code}`); // Log finish
			// Create and assign a new map for the loading state update
			const finalLoadingMap = new Map(loadingMoreExercises);
            finalLoadingMap.delete(code);
            loadingMoreExercises = finalLoadingMap; // Assign the NEW map
		}
	}

	function resetExerciseLimit(code: string) {
		// Create and assign a new map
        const newLimitsMap = new Map(expandedExerciseLimits);
        if (newLimitsMap.has(code)) { // Only update if it exists
            newLimitsMap.delete(code);
		    expandedExerciseLimits = newLimitsMap; // Assign the NEW map
            console.log(`[Reset Limit] Limit reset for code: ${code}`);
        }
	}

    function getDisplayedExercices(code: string): MinimalExercice[] {
		const allExercices = getExercicesForSousChapitre(code);
		const limit = getExerciceLimit(code);
        // Log the data used for slicing right before returning
        // console.log(`[Display] Code: ${code}, Limit: ${limit}, Total Found: ${allExercices.length}`);
		return allExercices.slice(0, limit);
	}
	function hasMoreExercises(code: string): boolean {
		// Ensure limit is fetched correctly for comparison
        return getExercicesForSousChapitre(code).length > getExerciceLimit(code);
	}
    function remainingExercisesCount(code: string): number {
        // Ensure limit is fetched correctly for calculation
        return Math.max(0, getExercicesForSousChapitre(code).length - getExerciceLimit(code));
    }

	// --- Event Handlers ---
	async function handleClick(uuid: string) {
		if (isSelecting || uuid === selectedExerciseId) return;

		selectedExerciseId = uuid; // Optimistic UI update
		isSelecting = true;
		try {
			await onSelect(uuid);
		} catch (e) {
            console.error("Selection callback failed:", e);
            // Optional: Revert optimistic UI update on error
            // selectedExerciseId = $page.url.searchParams.get('uuid');
        } finally {
			isSelecting = false;
		}
	}
</script>

<!-- Template (HTML) and Style sections remain the same -->

<div class="theme-explorer">
	{#if loading}
		<div class="loading-spinner">
			<div class="spinner-border text-primary" role="status">
				<span class="visually-hidden">Chargement des modules...</span>
			</div>
		</div>
	{:else if error}
		<div class="alert alert-danger mx-2" role="alert">{error}</div>
	{:else}
		<div class="themes-tree">
			<div class="themes-list">
				{#each modules as module (module.id)}
					{#if hasExercisesInModule(module)}
						<div class="module-group">
							<button
								class="theme-button module-button"
								on:click={() => toggleModule(module.id)}
                                aria-expanded={expandedModules.has(module.id)}
							>
								<span class="module-name">{module.niveau} - {module.description}</span>
								<div class="theme-right">
									<span class="badge">{getExercisesCountForModule(module)}</span>
									<div class="icon-wrapper chevron" class:rotated={expandedModules.has(module.id)}>
										<svg class="icon-small" viewBox="0 0 24 24" aria-hidden="true">
											<path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
										</svg>
									</div>
								</div>
							</button>

							{#if expandedModules.has(module.id)}
								<div class="chapitres" transition:slide|local={{ duration: 200 }}>
									{#each module.chapitres as chapitre (chapitre.id)}
										{#if hasExercisesInChapitre(chapitre)}
											<div class="chapitre-group">
												<button
													class="theme-button chapitre-button"
													on:click={() => toggleChapitre(chapitre.id)}
                                                    aria-expanded={expandedChapitres.has(chapitre.id)}
												>
													<span class="chapitre-name">{chapitre.description}</span>
													<div class="theme-right">
														<span class="badge">{getExercisesCountForChapitre(chapitre)}</span>
														<div class="icon-wrapper chevron" class:rotated={expandedChapitres.has(chapitre.id)}>
															<svg class="icon-small" viewBox="0 0 24 24" aria-hidden="true">
																<path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
															</svg>
														</div>
													</div>
												</button>

												{#if expandedChapitres.has(chapitre.id)}
													<div class="sous-chapitres" transition:slide|local={{ duration: 200 }}>
														{#each chapitre.sousChapitres as sousChapitre (sousChapitre.code)}
															{#if hasExercisesInSousChapitre(sousChapitre.code)}
																{@const exercicesCount = getExercisesCountForSousChapitre(sousChapitre.code)}
																<div class="sous-chapitre-group">
																	<button
																		class="theme-button sous-chapitre-button"
																		on:click={() => toggleSousChapitre(sousChapitre.code)}
                                                                        aria-expanded={expandedSousChapitres.has(sousChapitre.code)}
																	>
																		<span class="sous-chapitre-name">{sousChapitre.description}</span>
																		<div class="theme-right">
																			<span class="badge">{exercicesCount}</span>
																			<div class="icon-wrapper chevron" class:rotated={expandedSousChapitres.has(sousChapitre.code)}>
																				<svg class="icon-small" viewBox="0 0 24 24" aria-hidden="true">
																					<path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
																				</svg>
																			</div>
																		</div>
																	</button>

																	{#if expandedSousChapitres.has(sousChapitre.code)}
																		<div class="exercises-list" transition:slide|local={{ duration: 200 }}>
																			{#each getDisplayedExercices(sousChapitre.code) as exercise (exercise.uuid)}
																				<button
																					class="exercise-item"
																					class:selected={selectedExerciseId === exercise.uuid}
																					class:selecting={isSelecting && selectedExerciseId === exercise.uuid}
																					disabled={isSelecting}
																					on:click={() => handleClick(exercise.uuid)}
                                                                                    aria-current={selectedExerciseId === exercise.uuid ? 'page' : undefined}
																				>
																					<div class="exercise-title">
																						<MathRenderer content={exercise.titre} displayMode={false}/>
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
																						<span class="loading-spinner" aria-hidden="true"></span>
                                                                                        Chargement...
																					{:else}
																						Voir plus ({remainingExercisesCount(sousChapitre.code)} restants)
																					{/if}
																				</button>
																			{/if}
																		</div>
																	{/if}
																</div>
															{/if}
														{/each}
													</div>
												{/if}
											</div>
										{/if}
									{/each}
								</div>
							{/if}
						</div>
					{/if}
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
    /* Styles are scoped to RechercheModules.svelte */

	/* --- Main Container & Loading --- */
	.theme-explorer {
		width: 100%;
		max-width: 100%;
		overflow-x: hidden;
        min-height: 200px;
        display: flex; /* Use flex for loading/error states */
        flex-direction: column;
	}

	.loading-spinner { /* Initial loading */
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 2rem;
		min-height: 150px;
        flex-grow: 1; /* Take space if tree isn't loaded */
	}
    /* Ensure alert takes space too */
    :global(.alert) {
        margin: 1rem;
    }

	/* --- Tree Structure & Layout --- */
	.themes-tree {
        flex-grow: 1;
        overflow-y: auto;
        position: relative;
	}

	.themes-list {
        padding: 0.25rem;
	}

	.module-group,
	.chapitre-group,
	.sous-chapitre-group {
        /* Add bottom margin for visual separation? */
        /* margin-bottom: 0.1rem; */
	}

	/* --- Interactive Row Buttons --- */
	.theme-button {
		width: 100%;
		text-align: left;
		padding: 0.5rem 0.75rem;
		background: none;
		border: none;
		display: flex;
		justify-content: space-between;
		align-items: center;
		cursor: pointer;
		border-radius: 4px;
		transition: background-color 0.15s ease;
		color: var(--color-text-secondary, #4a5568);
		font-size: 0.875rem;
		gap: 0.5rem;
	}
	.theme-button:hover {
		background-color: var(--color-bg-hover-light, #f3f4f6);
	}
    .theme-button:focus-visible {
        outline: 2px solid var(--bs-primary);
        outline-offset: 1px;
        background-color: var(--color-bg-hover-light, #f3f4f6);
    }


	/* --- Level-Specific Button Styles --- */
	.module-button {
		font-weight: 600;
		color: var(--color-heading-text, #1a365d);
		font-size: 0.9rem;
	}
	.chapitre-button {
		padding-left: 1.5rem;
		color: var(--color-text, #2d3748);
		font-weight: 500;
	}
	.sous-chapitre-button {
		padding-left: 2.5rem;
	}

	/* --- Text Content within Buttons --- */
	.module-name,
	.chapitre-name,
	.sous-chapitre-name {
		flex-grow: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* --- Right Aligned Content (Badge & Icon) --- */
	.theme-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	/* --- Custom Badge Style --- */
	.badge {
		background-color: var(--color-bg-subtle, #e2e8f0);
		padding: 0.15rem 0.4rem;
		border-radius: 3px;
		font-size: 0.7rem;
		font-weight: 500;
		color: var(--color-text-secondary, #4a5568);
		min-width: 1.75rem;
		text-align: center;
		line-height: 1.2;
	}

	/* --- Chevron Icon --- */
	.icon-wrapper {
		display: flex;
		align-items: center;
		transition: transform 0.2s ease;
		color: var(--color-icon, #718096);
	}
	.icon-wrapper.rotated {
		transform: rotate(90deg);
	}
	.icon-small {
		width: 18px;
		height: 18px;
		fill: currentColor;
	}

	/* --- Collapsible Sections & Indentation Lines --- */
	.chapitres,
	.sous-chapitres {
		margin-left: 1rem;
		padding-left: 0.75rem;
		border-left: 1px solid var(--border-color-light, #e5e7eb);
	}

	/* --- Exercise List within Sub-Chapter --- */
	.exercises-list {
		max-height: 60vh;
		overflow-y: auto;
		padding-left: 0.5rem;
		margin-left: calc(2.5rem + 8px); /* Align with parent text start */
		padding-top: 0.25rem;
		padding-bottom: 0.5rem;
	}
	.exercises-list::-webkit-scrollbar { width: 6px; }
	.exercises-list::-webkit-scrollbar-track { background: transparent; margin: 4px; }
	.exercises-list::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb-color, #ccc); border-radius: 3px; }
	.exercises-list::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-thumb-hover-color, #aaa); }

	/* --- Individual Exercise Items --- */
	.exercise-item {
		display: block;
		width: 100%;
		text-align: left;
		padding: 0.5rem 0.75rem;
		margin: 0.15rem 0;
		background: none;
		border: 1px solid transparent;
		border-radius: 4px;
		cursor: pointer;
		transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
		color: var(--color-text, #374151);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.exercise-item:hover {
		background-color: var(--color-bg-hover-light, #f3f4f6);
		border-color: var(--border-color-light, #d1d5db);
	}
    .exercise-item:focus-visible {
        outline: 2px solid var(--bs-primary);
        outline-offset: -2px;
        background-color: var(--color-bg-hover-light, #f3f4f6);
        border-color: var(--border-color-light, #d1d5db);
    }

	.exercise-item.selected {
		background-color: var(--bs-primary-bg-subtle, #e6f0fd);
		border-color: var(--bs-primary-border-subtle, #3b82f6);
		color: var(--bs-primary-text-emphasis, #052c65);
		font-weight: 500;
	}
    .exercise-item.selected:focus-visible {
         outline-color: var(--bs-primary-text-emphasis, #052c65);
    }

	.exercise-item.selecting,
	.exercise-item:disabled {
		opacity: 0.6;
		cursor: wait;
		background-color: transparent !important;
		border-color: transparent !important;
		color: var(--color-text-disabled, #999);
	}

	.exercise-title {
		font-size: 0.8rem;
		display: inline-block;
		max-width: 100%;
		vertical-align: middle;
	}

	/* --- Load More Button & Spinner --- */
	.load-more-button {
		display: block;
		width: calc(100% - 1rem); /* Adjust for padding if needed */
		margin: 0.5rem auto 0.25rem auto;
		padding: 0.5rem;
		background-color: var(--color-bg-subtle, #f3f4f6);
		border: 1px solid var(--border-color-light, #e5e7eb);
		border-radius: 4px;
		color: var(--color-text-secondary, #374151);
		font-size: 0.8rem;
		text-align: center;
		transition: background-color 0.2s ease;
		cursor: pointer;
	}
	.load-more-button:hover:not(:disabled) {
		background-color: var(--color-bg-hover, #e5e7eb);
	}
	.load-more-button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}
    .load-more-button:focus-visible {
        outline: 2px solid var(--bs-primary);
        outline-offset: 1px;
        background-color: var(--color-bg-hover, #e5e7eb);
    }

	.load-more-button .loading-spinner { /* Inline spinner */
		display: inline-block;
		width: 1em;
		height: 1em;
		border: 2px solid currentColor;
		border-top-color: transparent;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
		margin: 0 0.5em 0 0; /* Space between spinner and text */
		padding: 0;
		vertical-align: -0.15em; /* Align better with text */
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

</style>