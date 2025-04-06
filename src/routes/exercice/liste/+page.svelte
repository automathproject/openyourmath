<!--src/routes/exercice/liste/+page.svelte-->
<script lang="ts">
	import { onMount, tick } from 'svelte'; // Added tick
	import { page } from '$app/stores';
	import { goto, invalidate } from '$app/navigation'; // Added invalidate
	import Liste from '../../Liste.svelte';
	import ExerciceRenderer from '../../../components/ExerciceRenderer.svelte';
	import HideColumnsButton from '../../../components/buttons/HideColumnsButton.svelte';

	// --- Props ---
	export let data; // Server data: { uuid, listId, exercise, error }

	// --- State ---
	let exerciseUuid: string = data.uuid || '';
	let listId: string = data.listId || ''; // Store listId from server data
	let exerciseData: any = data.exercise || null;
	let errorMessage: string = data.error || (exerciseUuid ? '' : 'Aucun exercice sélectionné');
	let loadingExercise: boolean = false;
	let showList = true; // Show list column by default

	// --- Load Exercise Data ---
	// This function might not be strictly needed if the server load handles it well,
	// but can be useful for client-side navigation within the list.
	async function loadExerciseData(uuid: string) {
		if (!uuid) {
			exerciseData = null;
			errorMessage = 'Aucun exercice sélectionné';
			return;
		}

		// Avoid reloading if data is already present (e.g., from server load)
		if (exerciseData?.uuid === uuid) {
			errorMessage = ''; // Ensure error is cleared
			return;
		}

		loadingExercise = true;
		errorMessage = '';
		exerciseData = null; // Clear previous data immediately
		await tick(); // Wait for UI to update

		try {
			const response = await fetch(`/exercice/${uuid}`); // Fetch specific exercise
			if (response.ok) {
				const newData = await response.json();
                // Ensure we are setting data for the *requested* UUID,
                // handling potential race conditions if user clicks fast.
                if (uuid === exerciseUuid) {
				    exerciseData = newData;
                }
			} else {
				throw new Error(`HTTP ${response.status} ${response.statusText}`);
			}
		} catch (error: any) {
            if (uuid === exerciseUuid) { // Only set error if it's for the current selection
			    exerciseData = null;
			    errorMessage = `L'exercice ${uuid} n'a pas pu être chargé: ${error.message}`;
            }
            console.error("Error loading exercise:", error);
		} finally {
            // Only stop loading indicator if it's for the current selection
            if (uuid === exerciseUuid) {
			    loadingExercise = false;
            }
		}
	}

	// --- UI Toggles ---
	function toggleList() {
		showList = !showList;
	}

	// --- Reactivity to URL Changes ---
	$: {
		const urlParams = $page.url.searchParams;
		const currentUuid = urlParams.get('uuid');
        const currentListId = urlParams.get('list'); // Track list ID changes too

		// Update listId if it changes in URL
        if (currentListId && currentListId !== listId) {
            listId = currentListId;
            // Optionally invalidate data related to the list itself if needed
            // invalidate('app:listeData'); // Example invalidation key
        }

		// Update and load exercise if UUID changes
		if (currentUuid && currentUuid !== exerciseUuid) {
			exerciseUuid = currentUuid;
            // Ensure server-loaded data isn't overwritten if navigating back/fwd quickly
            if (data.uuid === currentUuid) {
                exerciseData = data.exercise;
                errorMessage = data.error || '';
                loadingExercise = false;
            } else {
			    loadExerciseData(exerciseUuid);
            }
		} else if (!currentUuid && exerciseUuid) {
            // Handle case where UUID is removed from URL
            exerciseUuid = '';
            exerciseData = null;
            errorMessage = 'Aucun exercice sélectionné';
            loadingExercise = false;
        }
	}

	// --- Handle Selection from <Liste> ---
	function handleSelect(uuid: string) {
		if (uuid !== exerciseUuid) {
			// Keep existing listId in the URL
			const targetUrl = `?list=${listId}&uuid=${uuid}`;
            // Use goto for client-side navigation, which will trigger the reactive block above
			goto(targetUrl, { replaceState: false, noScroll: true });
            // No need to call loadExerciseData here, the reactive block handles it.
		}
	}
</script>

<section class="container">
	<div class="row position-relative"> 
		{#if showList}
			<div class="col-md-4 liste-container">
				<!-- Consider passing listId if Liste needs it -->
				<Liste onSelect={handleSelect} activeExerciseId={exerciseUuid} listId={listId} />
			</div>
		{/if}
		<div class={`${showList ? 'col-md-8' : 'col-12'} position-relative`}>
			<HideColumnsButton bind:showList />

			{#if loadingExercise}
				<div class="alert alert-info mt-3" role="status"> 
                    Chargement de l'exercice {exerciseUuid}...
                </div>
			{:else if errorMessage && !exerciseData}
				<div class="alert alert-danger mt-3" role="alert">{errorMessage}</div>
			{:else if exerciseData}
                <!-- Use UUID as key for transitions/updates -->
				<div key={exerciseData.uuid} class="mt-3">
					<ExerciceRenderer ExerciceData={exerciseData} />
				</div>
			{:else if !loadingExercise && !errorMessage && !exerciseData}
                <div class="alert alert-secondary mt-3" role="alert">
                    Sélectionnez un exercice dans la liste.
                </div>
            {/if}
		</div>
	</div>
</section>

<style>
	.liste-container {
		/* Calculate height based on header/footer if possible, fallback to vh */
		max-height: calc(100vh - var(--header-height, 3.5rem) - 50px); /* Example calculation */
		overflow-y: auto;
		padding-bottom: 20px; /* Space at the bottom */
        /* Add right padding to prevent scrollbar overlap */
        padding-right: 5px;
        position: sticky; /* Make it sticky */
        top: calc(var(--header-height, 3.5rem) + 20px); /* Position below header + margin */
	}

    /* Style scrollbar for the list container */
    .liste-container::-webkit-scrollbar { width: 6px; }
	.liste-container::-webkit-scrollbar-track { background: transparent; margin: 4px 0; }
	.liste-container::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb-color, #ccc); border-radius: 3px; }
	.liste-container::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-thumb-hover-color, #aaa); }


	/* Page specific container spacing */
	.container {
		margin-top: 20px;
	}

    /* These rules target an element not present in this file's markup. */
    /* Keep scoped, but potentially remove if unused. */
	@media (max-width: 768px) {
		.input-container {
			flex-direction: column;
			align-items: stretch;
		}
		.input-container button {
			margin-top: 10px;
			width: 100%;
		}

        /* Adjust sticky positioning on mobile if needed */
        .liste-container {
            position: relative; /* Disable sticky */
            top: auto;
            max-height: 40vh; /* Limit height */
            margin-bottom: 1rem;
        }
	}
</style>