<!-- src/routes/search/+page.svelte -->
<script lang="ts">
	// ... (script content remains the same) ...
	import { onMount } from 'svelte';
	import { ExerciceSearchEngine } from '$lib/utils/search';
	import type { Exercice } from '$lib/types/types';
	import Modal from '../../components/Modal.svelte';
	import CustomList from '../../components/CustomList.svelte';
	import ExerciceRenderer from '../../components/ExerciceRenderer.svelte';
	import MathRenderer from '../../components/MathRenderer.svelte';
	import AddButton from '../../components/AddButton.svelte';
	import FiltersPanel from '../../components/filters/FiltersPanel.svelte';

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
	// Ajout d'une variable pour indiquer si l'interface est prête
	let isUIReady = true;

	function normalizeThemes(theme: string | string[]): string[] {
		if (Array.isArray(theme)) return theme;
		return theme ? theme.split(',').map((t) => t.trim()) : [];
	}

	function updateDynamicCounts(currentResults: Array<{ exercise: Exercice; score: number }>) {
		dynamicTagCounts.clear();

		currentResults.forEach((result) => {
			const exerciseTags = normalizeThemes(result.exercise.theme);
			exerciseTags.forEach((tag) => {
				if (!selectedTags.has(tag)) {
					dynamicTagCounts.set(tag, (dynamicTagCounts.get(tag) || 0) + 1);
				}
			});
		});

		if (selectedTags.size > 0) {
			const baseResults =
				query.trim() && searchEngine
					? searchEngine.search(query)
					: data.exercises.map((exercise) => ({ exercise, score: 1 }));

			selectedTags.forEach((selectedTag) => {
				const otherTags = new Set(selectedTags);
				otherTags.delete(selectedTag);

				const count = baseResults.filter((result) => {
					const exerciseTags = new Set(normalizeThemes(result.exercise.theme));
					return (
						Array.from(otherTags).every((tag) => exerciseTags.has(tag)) && exerciseTags.has(selectedTag)
					);
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
			filteredResults = data.exercises.map((exercise) => ({
				exercise,
				score: 1
			}));
		}

		// Applique le filtre par tags
		if (selectedTags.size > 0) {
			filteredResults = filteredResults.filter((result) => {
				const exerciseTags = new Set(normalizeThemes(result.exercise.theme));
				return Array.from(selectedTags).every((tag) => exerciseTags.has(tag));
			});
		}

		// Applique le filtre par correction
		if (correctionFilter !== 'all') {
			filteredResults = filteredResults.filter((result) => {
				const hasCorrection =
					result.exercise.metadata?.hasCorrection === true ||
					result.exercise.metadata?.hasCorrection === 'true';
				return correctionFilter === 'with' ? hasCorrection : !hasCorrection;
			});
		}

		// Réinitialiser la pagination
		currentPage = 1;
		allResults = filteredResults;
		updateDisplayedResults();
		updateDynamicCounts(filteredResults);
	}

	function initializeSearchEngine() {
		if (data?.exercises) {
			console.log('Initialisation du moteur de recherche...');
			searchEngine = new ExerciceSearchEngine();
			searchEngine.initialize(data.exercises);

			// Construction de la collection des tags
			data.exercises.forEach((exercise) => {
				const themes = normalizeThemes(exercise.theme);
				themes.forEach((theme) => {
					allTags.set(theme, (allTags.get(theme) || 0) + 1);
				});
			});
			allTags = new Map(allTags);

			updateResults();
			isLoading = false;
			console.log('Moteur de recherche initialisé!');
		}
	}

	onMount(() => {
		// Montrer immédiatement l'UI
		isUIReady = true;

		// Initialiser le moteur de recherche de manière asynchrone
		// pour libérer le thread principal et permettre au header de s'afficher
		setTimeout(initializeSearchEngine, 10);
	});

	async function handleExerciseClick(exercise: Exercice) {
		try {
			const response = await fetch(`/exercice/${exercise.uuid}`);
			if (!response.ok) {
				throw new Error("Erreur lors du chargement de l'exercice");
			}
			selectedExercise = await response.json();
			showModal = true;
		} catch (error) {
			console.error("Erreur lors du chargement de l'exercice:", error);
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
	$: query, searchEngine && updateResults();
	$: correctionFilter, searchEngine && updateResults();
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
						<button class="search-clear-btn" on:click={() => (query = '')}>
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
									<!-- AddButton component used here -->
									<AddButton uuid={result.exercise.uuid} />
								</div>
								<!-- Exercise content (clickable) -->
								<div
									class="exercise-content cursor-pointer"
									on:click={() => handleExerciseClick(result.exercise)}
								>
									<h5 class="card-title">
										<MathRenderer content={result.exercise.titre} />
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
												<MathRenderer content={result.exercise.preview} />
											</span>
										</p>
									{/if}
								</div>
								<small class="text-muted position-absolute bottom-0 end-0 p-2"
									>{result.exercise.uuid}</small
								>
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

<Modal showModal={showModal} on:close={handleModalClose}>
	{#if selectedExercise}
		<ExerciceRenderer ExerciceData={selectedExercise} />
	{/if}
</Modal>

<style>
	/* Styles specific to the layout within this page's result card */
    .exercise-content {
        padding-right: 3rem; /* Make space for the add button */
    }

    .add-button-wrapper {
        position: absolute;
        right: 1rem;
        top: 1rem;
        z-index: 2; /* Ensure button is clickable above content */
    }

	/* Styles moved to app.css:
    - Search Bar Styles (.search-*)
    - Tag Styles (.tags, .tag, .tag:hover, .tag.selected, .tag.result-tag) -> Merged/Replaced in app.css
    - Utility (.cursor-pointer)
    - Card Hover Effect (.hover-card)
    - Preview Styling (.preview-html, .preview-html p)
    - Loading Indicator (.loading-container, .search-loader-*, @keyframes loader-bounce)
    */
</style>