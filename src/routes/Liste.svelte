<!-- src/routes/Liste.svelte -->
<script lang="ts">
	import MathRenderer from '../components/MathRenderer.svelte';
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { Exercice } from '$lib/types/types';
	import { get } from 'svelte/store';
	import { customList as listStore } from '$lib/stores/customList'; // Renamed import for clarity
	import { derived, writable } from 'svelte/store';

	// --- Props ---
	export let onSelect: (uuid: string) => Promise<void>; // Expects async function
	export let activeExerciseId: string | null = null; // Currently selected UUID

	// --- Local State ---
	const uuidInput = writable(''); // Holds the raw comma-separated input string
	const error = writable<string | null>(null);
	const loading = writable(false); // Loading state for the whole list fetch
	const isInputDirty = writable(false); // Track if input changed since last load

	// --- Derived State ---
	// Derives the ordered list of exercises based on the *loaded* listStore and the order from uuidInput
	const orderedExercises = derived(
		[listStore, uuidInput], // Depends on the store and the *input* string for order
		([$listStore, $uuidInputString]) => {
			// Use the UUIDs currently reflected in the input as the source of truth for order
			const orderedUuids = $uuidInputString
				.split(',')
				.map((u) => u.trim())
				.filter(Boolean);

			if (orderedUuids.length === 0) return []; // No order defined, show nothing

			// Create a map for quick lookup of exercises already in the store
			const storeExerciseMap = new Map($listStore.map((ex) => [ex.uuid, ex]));

			// Map ordered UUIDs to exercises found in the store
			return orderedUuids
				.map((uuid) => storeExerciseMap.get(uuid))
				.filter((ex): ex is Exercice => ex !== undefined); // Filter out any not found (should be loaded by loadExercises)
		}
	);

	// --- Lifecycle & Effects ---
	let abortController: AbortController | null = null;
	let inputTimeout: NodeJS.Timeout | null = null; // For debouncing input

	onMount(() => {
		// Initialize from URL search param 'list'
		const currentListParam = get(page).url.searchParams.get('list');
		if (currentListParam) {
			uuidInput.set(currentListParam);
			isInputDirty.set(false); // Initial load isn't dirty
			// Load exercises if the store might be missing data for this list
			const currentUuids = currentListParam.split(',').filter(Boolean);
			const currentStore = get(listStore);
			const storeUuids = new Set(currentStore.map(ex => ex.uuid));
			const needsLoad = currentUuids.some(uuid => !storeUuids.has(uuid));

			if (needsLoad) {
				loadExercises();
			} else {
                // Ensure store is ordered correctly even if all data is present
                listStore.set(
                    currentUuids
                        .map(uuid => currentStore.find(ex => ex.uuid === uuid))
                        .filter((ex): ex is Exercice => ex !== undefined)
                );
            }
		}

		// Subscribe to URL changes specifically for the 'list' param
		const unsubscribePage = page.subscribe((currentPage) => {
			const newListParam = currentPage.url.searchParams.get('list');
			const currentInputValue = get(uuidInput);
			// Update input only if URL differs AND the input hasn't been modified by the user
			if (newListParam && newListParam !== currentInputValue && !get(isInputDirty)) {
				console.log("URL 'list' param changed externally, updating input:", newListParam);
				uuidInput.set(newListParam);
				isInputDirty.set(false); // Change from URL resets dirty state
                const newUuids = newListParam.split(',').filter(Boolean);
                const storeUuids = new Set(get(listStore).map(ex => ex.uuid));
                const needsLoad = newUuids.some(uuid => !storeUuids.has(uuid));
				if (needsLoad) {
                    loadExercises();
                } else {
                    // Reorder store if needed
                     listStore.set(
                        newUuids
                            .map(uuid => get(listStore).find(ex => ex.uuid === uuid))
                            .filter((ex): ex is Exercice => ex !== undefined)
                    );
                }
			}
		});

		return () => {
			// Cleanup on unmount
			if (abortController) abortController.abort();
			if (inputTimeout) clearTimeout(inputTimeout);
			unsubscribePage(); // Unsubscribe from page store
		};
	});

	onDestroy(() => {
		// Ensure cleanup happens
		if (abortController) abortController.abort();
		if (inputTimeout) clearTimeout(inputTimeout);
	});

	// --- Functions ---
	async function loadExercises() {
		const rawInput = get(uuidInput);
		if (!rawInput.trim()) {
			// If input is effectively empty, clear the list and URL param
			listStore.set([]);
			error.set(null);
            const currentUuid = get(page).url.searchParams.get('uuid');
            const targetUrl = currentUuid ? `?uuid=${currentUuid}` : '/exercice/liste'; // Go back to base URL or keep UUID
            goto(targetUrl, { replaceState: true, noScroll: true });
			return;
		}

		// Reset dirty state on explicit load
		isInputDirty.set(false);

		// Abort previous fetch if any
		if (abortController) abortController.abort();
		abortController = new AbortController();

		loading.set(true);
		error.set(null);

		try {
			// Normalize and deduplicate UUIDs from input
			const inputUuids = rawInput.split(',').map((u) => u.trim()).filter(Boolean);
			if (inputUuids.length === 0) {
				error.set('Aucun UUID valide trouvé.');
				listStore.set([]); // Clear store
				return;
			}
			const uniqueUuids = Array.from(new Set(inputUuids));

			// Update input visually and URL reflect normalized list
			const normalizedUuidString = uniqueUuids.join(',');
            // Update input store only if different to avoid triggering infinite loops via binding
            if (get(uuidInput) !== normalizedUuidString) {
			    uuidInput.set(normalizedUuidString);
            }
			// Update URL only if necessary
			if (get(page).url.searchParams.get('list') !== normalizedUuidString) {
				const currentUuidParam = get(page).url.searchParams.get('uuid');
				const targetUrl = `?list=${normalizedUuidString}${currentUuidParam ? `&uuid=${currentUuidParam}` : ''}`;
				await goto(targetUrl, { replaceState: true, noScroll: true });
			}


			const exercisesToFetch: string[] = [];
			const existingStoreExercises = get(listStore);
			const existingStoreMap = new Map(existingStoreExercises.map((ex) => [ex.uuid, ex]));

			// Determine which UUIDs are missing from the store
			uniqueUuids.forEach((uuid) => {
				if (!existingStoreMap.has(uuid)) {
					exercisesToFetch.push(uuid);
				}
			});

			console.log(`Fetching ${exercisesToFetch.length} missing exercises:`, exercisesToFetch);

			// Fetch missing exercises
			const fetchedExercises: Exercice[] = [];
			if (exercisesToFetch.length > 0) {
				// Fetch in parallel for speed
                const fetchPromises = exercisesToFetch.map(async (uuid) => {
                    try {
                        const response = await fetch(`/exercice/${uuid}`, { signal: abortController?.signal });
                        if (response.ok) {
                            const exerciseData = await response.json();
                            return { ...exerciseData, uuid }; // Ensure UUID is set
                        } else {
                            console.error(`Fetch error for UUID ${uuid}: ${response.status} ${response.statusText}`);
                            error.update(e => e ? `${e}\nErreur ${uuid}: ${response.statusText}` : `Erreur ${uuid}: ${response.statusText}`);
                            return null; // Indicate failure
                        }
                    } catch (fetchErr: any) {
                        if (fetchErr.name === 'AbortError') {
                            console.log('Fetch aborted for', uuid);
                            throw fetchErr; // Re-throw to stop processing
                        }
                        console.error(`Fetch exception for UUID ${uuid}:`, fetchErr);
                        error.update(e => e ? `${e}\nErreur fetch ${uuid}` : `Erreur fetch ${uuid}`);
                        return null; // Indicate failure
                    }
                });
                // Filter out nulls from failed fetches before adding to list
                fetchedExercises.push(...(await Promise.all(fetchPromises)).filter((ex): ex is Exercice => ex !== null));
			}

			// Combine existing and newly fetched exercises
			const combinedExercises = [...existingStoreExercises, ...fetchedExercises];
			const combinedMap = new Map(combinedExercises.map((ex) => [ex.uuid, ex]));

			// Create the final list in the correct order based on uniqueUuids
			const finalOrderedList = uniqueUuids
				.map((uuid) => combinedMap.get(uuid))
				.filter((ex): ex is Exercice => ex !== undefined); // Ensure all are found

			// Update the central store
			listStore.set(finalOrderedList);

			if (finalOrderedList.length === 0 && inputUuids.length > 0) {
				error.set('Aucun exercice trouvé pour les UUIDs fournis.');
			} else if (finalOrderedList.length !== uniqueUuids.length) {
                // Update error if some failed but not all
                error.update(e => e ? e : 'Certains exercices n\'ont pas pu être chargés.');
            }
		} catch (err: any) {
			if (err.name !== 'AbortError') {
				error.set(`Erreur lors du chargement: ${err.message}`);
				console.error('List loading error:', err);
			} else {
				console.log('List loading aborted.');
			}
		} finally {
			// Only stop loading if this specific request wasn't aborted by a newer one
			if (!abortController?.signal.aborted) {
				loading.set(false);
			}
		}
	}

	// --- Event Handlers ---
	let isSelecting = false; // Prevent double clicks on selection
	async function handleSelectItem(uuid: string) {
		if (isSelecting || uuid === activeExerciseId) return; // Prevent re-selection or concurrent calls

		isSelecting = true;
		try {
			// Call the async callback passed from the parent
			await onSelect(uuid);
		} catch (e) {
			console.error('Selection callback failed:', e);
		} finally {
			isSelecting = false;
		}
	}

	// Debounced input handler
	function handleInputChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const newValue = target.value;
        // Update store immediately for input binding reactivity
        // No need to set uuidInput store here if using bind:value
		isInputDirty.set(true); // Mark input as dirty

		if (inputTimeout) clearTimeout(inputTimeout);
		inputTimeout = setTimeout(() => {
			loadExercises(); // Trigger load after user stops typing
		}, 750); // 750ms debounce delay
	}
</script>

<div>
	<div class="input-container mb-3">
		<input
			type="text"
			bind:value={$uuidInput}
			class="form-control"
			placeholder="Entrez UUIDs (ex: Ab4f, BcK3)"
			aria-label="UUIDs de la liste d'exercices"
			on:input={handleInputChange}
			on:keydown={(event) => {
				if (event.key === 'Enter') {
					if (inputTimeout) clearTimeout(inputTimeout); // Clear timeout on Enter
					// bind:value handles store update
					loadExercises(); // Load immediately on Enter
				}
			}}
		/>
		<button
			on:click={() => { if (inputTimeout) clearTimeout(inputTimeout); loadExercises(); }}
			class="btn btn-primary mt-2"
			disabled={$loading || !$isInputDirty}
			title={$isInputDirty ? "Charger la liste basée sur l'entrée actuelle" : "L'entrée correspond à la liste chargée"}
		>
			{#if $loading}
				<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
				Chargement...
			{:else}
				Mettre à jour
			{/if}
		</button>
	</div>

	{#if $loading && $orderedExercises.length === 0}
		<div class="d-flex justify-content-center align-items-center py-3">
			<div class="spinner-border text-primary" role="status">
				<span class="visually-hidden">Chargement de la liste...</span>
			</div>
		</div>
	{:else if $error}
		<div class="alert alert-warning mt-2" role="alert">{$error}</div>
	{:else if $orderedExercises.length === 0 && !$loading && get(uuidInput).trim() !== ''}
		<div class="alert alert-secondary mt-2" role="alert">
			Aucun exercice trouvé ou chargé pour les UUIDs fournis.
		</div>
	{:else if $orderedExercises.length === 0 && !$loading && get(uuidInput).trim() === ''}
		<div class="alert alert-secondary mt-2" role="alert">
            Entrez des UUIDs pour charger une liste.
        </div>
	{:else}
		<div class="list-group">
			{#each $orderedExercises as exercise, index (exercise.uuid)}
				<button
					type="button"
					on:click={() => handleSelectItem(exercise.uuid)}
					class="list-group-item list-group-item-action"
					class:active={exercise.uuid === activeExerciseId}
					disabled={$loading}
					aria-current={exercise.uuid === activeExerciseId ? 'page' : undefined}
				>
					<div class="exercise-info">
						<div class="exercise-title">
							{index + 1}. <MathRenderer content={`${exercise.titre}`} displayMode={false} />
						</div>
						{#if exercise.theme}
							<div class="exercise-theme">
								<small>{Array.isArray(exercise.theme) ? exercise.theme.join(', ') : exercise.theme}</small>
							</div>
						{/if}
						<div class="exercise-uuid-small">{exercise.uuid}</div>
					</div>
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	/* --- List Group Item Customization --- */
	.list-group-item {
		cursor: pointer;
		transition:
			background-color 0.15s ease,
			border-color 0.15s ease;
		border-radius: 4px;
		margin-bottom: 2px;
		border: 1px solid var(--list-group-item-border-color, #ddd);
        padding: 0.6rem 0.8rem;
	}

	.list-group-item:hover:not(.active):not(:disabled) { /* Updated :disabled check */
		background-color: var(--list-group-item-hover-bg, #f5f5f5);
	}

	.list-group-item.active {
		background-color: var(--bs-primary-bg-subtle, #e6f0fd);
		border-color: var(--bs-primary-border-subtle, #cfe2ff);
		color: var(--bs-primary-text-emphasis, #052c65);
		font-weight: 500;
		z-index: 2;
	}
	.list-group-item.active:focus,
	.list-group-item.active:focus-visible {
		box-shadow: 0 0 0 0.2rem var(--bs-primary-focus-shadow, rgba(73, 178, 178, 0.3));
		border-color: var(--bs-primary-border-subtle, #cfe2ff);
		outline: none;
	}

	.list-group-item:not(.active):focus-visible {
		outline: 2px solid var(--bs-primary);
		outline-offset: -2px;
		z-index: 1;
	}

	/* Remove stacked borders */
	.list-group {
		border-radius: 4px;
	}
	.list-group-item:first-child { border-top-left-radius: inherit; border-top-right-radius: inherit; }
	.list-group-item:last-child { border-bottom-left-radius: inherit; border-bottom-right-radius: inherit; margin-bottom: 0;}
	.list-group-item + .list-group-item { border-top-width: 0; }
	.list-group-item + .list-group-item.active { margin-top: 0; border-top-width: 1px; }

	/* --- Internal Layout of List Items --- */
	.exercise-info {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		font-size: 0.9rem;
		gap: 0.1rem;
        line-height: 1.4;
        overflow: hidden;
	}

	.exercise-title {
		font-weight: 500;
		color: var(--color-text, #333);
        display: block;
        width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
	}
	.list-group-item.active .exercise-title {
		color: var(--bs-primary-text-emphasis, #052c65);
	}
    .exercise-title :global(.katex) {
        font-size: 0.95em;
        vertical-align: baseline;
    }

	.exercise-theme {
		color: var(--color-text-muted, #6c757d);
		font-size: 0.75rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
        max-width: 100%;
        line-height: 1.2;
	}
	.list-group-item.active .exercise-theme {
		color: var(--bs-primary-text, #0a58ca);
	}
    .exercise-uuid-small {
        font-family: var(--font-mono, monospace);
        font-size: 0.7rem;
        color: var(--color-text-muted, #999);
        margin-top: 2px;
    }
     .list-group-item.active .exercise-uuid-small {
        color: var(--bs-primary-text, #0a58ca);
    }

	/* --- Input Area Layout --- */
	.input-container {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-control {
		width: 100%;
	}

	.btn { /* Load button */
		align-self: flex-start;
	}
	.btn .spinner-border-sm {
		width: 1em;
		height: 1em;
		border-width: 0.2em;
		vertical-align: -0.125em;
	}

    /* --- Loading/Disabled State --- */
	/* Select using the :disabled attribute pseudo-class */
	.list-group-item:disabled {
        background-color: var(--list-group-disabled-bg, #f8f9fa);
        color: var(--list-group-disabled-color, #adb5bd);
        cursor: not-allowed;
        border-color: var(--list-group-disabled-border-color, #dee2e6);
    }
    /* Select children when the button has the :disabled attribute */
    .list-group-item:disabled .exercise-title,
    .list-group-item:disabled .exercise-theme,
    .list-group-item:disabled .exercise-uuid-small {
        opacity: 0.7; /* Dim content when disabled */
    }
</style>