<!-- src/components/CustomList.svelte -->
<script lang="ts">
	import { customList, removeFromCustomList, moveInCustomList } from '$lib/stores/customList'; // Added moveInCustomList
	import MathRenderer from './MathRenderer.svelte';
	import ListViewButton from './buttons/ListViewButton.svelte';
	import { slide, fade } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import { ArrowUp, ArrowDown, Copy, Check } from 'lucide-svelte'; // Added icons
	import { quintOut } from 'svelte/easing';
	import { onDestroy } from 'svelte';

	export let showMobileButton = false; // Prop to control mobile button visibility

	// --- State ---
	let showCustomListModal = false; // Mobile modal visibility
	let copyConfirmation = false; // Feedback for copy action
	let copyTimeout: NodeJS.Timeout | null = null; // Timeout for copy feedback

	// --- Cleanup ---
	onDestroy(() => {
		if (copyTimeout) clearTimeout(copyTimeout); // Clear timeout on destroy
	});

	// --- Functions ---
	function copyUUIDs() {
		if (copyTimeout) clearTimeout(copyTimeout); // Clear previous timeout
		const uuids = $customList.map((ex) => ex.uuid).join(','); // Join without space
		navigator.clipboard.writeText(uuids).then(
			() => {
				// Success
				copyConfirmation = true;
				copyTimeout = setTimeout(() => {
					copyConfirmation = false;
				}, 2000); // Show confirmation for 2 seconds
			},
			(err) => {
				// Error
				console.error('Failed to copy UUIDs:', err);
				// Optionally show an error message to the user
			}
		);
	}

	// Use imported move function from store
	function moveUp(index: number) {
		moveInCustomList(index, index - 1);
	}
	function moveDown(index: number) {
		moveInCustomList(index, index + 1);
	}

	// --- Mobile Swipe Gesture Handling ---
	let touchStartY = 0;
	let currentTranslateY = 0;
	let isDragging = false;
	const dragThreshold = 50; // Pixels to drag before closing

	function handleTouchStart(e: TouchEvent) {
		if (e.target instanceof HTMLElement && e.target.closest('.custom-list-modal-body')) {
			// If touch starts inside the scrollable body, don't initiate drag
			isDragging = false;
			return;
		}
		isDragging = true;
		touchStartY = e.touches[0].clientY;
		currentTranslateY = 0; // Reset translate on new touch
        // Add class to disable transition during drag? Maybe not needed.
	}

	function handleTouchMove(e: TouchEvent) {
		if (!isDragging) return;

		const currentY = e.touches[0].clientY;
		const deltaY = currentY - touchStartY;

		// Only allow dragging downwards
		if (deltaY > 0) {
			currentTranslateY = deltaY;
            // Prevent page scroll while dragging modal down
			e.preventDefault();
		} else {
            // Reset if user tries to drag up
            currentTranslateY = 0;
        }
	}

	function handleTouchEnd() {
		if (!isDragging) return;
		isDragging = false;

		if (currentTranslateY > dragThreshold) {
			showCustomListModal = false; // Close modal if dragged enough
		}
		// Reset translateY smoothly via CSS transition (remove inline style)
        currentTranslateY = 0; // Reset state variable
        touchStartY = 0;
	}

    function handleModalClose() {
        showCustomListModal = false;
        currentTranslateY = 0; // Ensure translate is reset if closed via button
    }

</script>

<div class="custom-list-container">
	{#if !showMobileButton}
		<!-- ==================== -->
		<!-- Desktop Sticky View  -->
		<!-- ==================== -->
		<div class="card custom-list-sticky shadow-sm"> 
			<div class="card-body d-flex flex-column"> 
				<h5 class="card-title mb-3">Ma liste</h5>
				<div class="uuid-container mb-3">
					<div class="uuids-list flex-grow-1">
						<span class="font-monospace">
							{$customList.length > 0 ? $customList.map((ex) => ex.uuid).join(',') : '(vide)'}
						</span>
					</div>
					<button
						class="btn-copy"
						on:click={copyUUIDs}
						title="Copier les UUIDs"
						disabled={$customList.length === 0}
                        aria-label="Copier les identifiants uniques de la liste"
					>
						{#if copyConfirmation}
							<Check size={16} />
						{:else}
							<Copy size={16} />
						{/if}
					</button>
				</div>

				{#if $customList.length > 0}
					<a
						href="/exercice/liste?list={$customList.map((ex) => ex.uuid).join(',')}"
						class="btn btn-primary btn-sm mb-3"
					>
						Visualiser la liste
					</a>
				{/if}

				<div class="custom-list-content flex-grow-1"> 
					{#if $customList.length === 0}
						<p class="text-muted small mt-2 text-center">
							Ajoutez des exercices via le <span class="add-icon-example">+</span>.
						</p>
					{:else}
						<div class="d-flex flex-column gap-2">
							{#each $customList as exercise, index (exercise.uuid)}
								<div class="custom-list-item" animate:flip={{ duration: 300 }}>
									<div class="exercise-info">
										<div class="exercise-title">
											<MathRenderer content={exercise.titre} displayMode={false}/>
										</div>
                                        {#if exercise.preview}
										<div class="preview-html">
											<MathRenderer content={exercise.preview} displayMode={false}/>
										</div>
                                        {/if}
									</div>
									<div class="item-controls">
										<div class="move-buttons">
											{#if index > 0}
												<button
													class="btn-move"
													on:click={() => moveUp(index)}
													title="Déplacer vers le haut"
                                                    aria-label="Monter l'exercice {index + 1}"
												>
													<ArrowUp size={16} />
												</button>
											{/if}
											{#if index < $customList.length - 1}
												<button
													class="btn-move"
													on:click={() => moveDown(index)}
													title="Déplacer vers le bas"
                                                     aria-label="Descendre l'exercice {index + 1}"
												>
													<ArrowDown size={16} />
												</button>
											{/if}
										</div>
										<button
											class="btn-remove"
											on:click={() => removeFromCustomList(exercise)}
                                            title="Retirer de la liste"
                                            aria-label="Retirer l'exercice {index + 1}"
										>
											×
										</button>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>
	{:else}
		<!-- ============================ -->
		<!-- Mobile Floating Button & Modal -->
		<!-- ============================ -->
		{#if $customList.length > 0}
			<button
				class="floating-list-button"
				on:click={() => showCustomListModal = true}
                aria-label="Ouvrir ma liste d'exercices ({$customList.length} éléments)"
			>
				<span class="list-count">{$customList.length}</span>
				<span class="list-label">Ma liste</span>
			</button>
		{/if}

		{#if showCustomListModal}
            <div class="modal-backdrop" on:click={handleModalClose} transition:fade={{duration: 200}}></div>

			<div
				class="custom-list-modal"
				transition:slide={{ duration: 300, axis: 'y' }}
				on:touchstart={handleTouchStart}
				on:touchmove={handleTouchMove}
				on:touchend={handleTouchEnd}
                role="dialog"
                aria-modal="true"
                aria-labelledby="customListModalTitle"
                style="transform: translateY({currentTranslateY}px); transition: {isDragging ? 'none' : 'transform 0.3s ease-out'};"
			>
                <div class="swipe-indicator" aria-hidden="true"></div>

				<div class="custom-list-modal-content">
					<div class="custom-list-modal-header">
                        <h5 id="customListModalTitle">Ma liste d'exercices</h5>
						<ListViewButton
                            class="me-auto ms-3" 
							href="/exercice/liste?list={$customList.map((ex) => ex.uuid).join(',')}"
							size="sm"
                            disabled={$customList.length === 0}
                            aria-label="Visualiser la liste complète"
						/>
						<button
							type="button" 
							class="btn-close"
							on:click={handleModalClose}
                            aria-label="Fermer la liste"
						></button>
					</div>

					<div class="custom-list-modal-body">
						{#if $customList.length === 0}
							<p class="text-muted text-center mt-3">
								La liste est vide.
							</p>
						{:else}
							<div class="d-flex flex-column gap-2">
								{#each $customList as exercise, index (exercise.uuid)}
									<div class="custom-list-item mobile" animate:flip={{ duration: 300 }}>
										<div class="exercise-info">
											<div class="exercise-title">
												<MathRenderer content={exercise.titre} displayMode={false}/>
											</div>
                                            {#if exercise.preview}
											<div class="preview-html">
												<MathRenderer content={exercise.preview} displayMode={false}/>
											</div>
                                            {/if}
											<div class="exercise-uuid">{exercise.uuid}</div>
										</div>
										<div class="item-controls mobile">
											<div class="move-buttons mobile">
												{#if index > 0}
													<button
														class="btn-move"
														on:click={() => moveUp(index)}
														title="Déplacer vers le haut"
                                                        aria-label="Monter l'exercice {index + 1}"
													>
														<ArrowUp size={18} />
													</button>
												{/if}
												{#if index < $customList.length - 1}
													<button
														class="btn-move"
														on:click={() => moveDown(index)}
														title="Déplacer vers le bas"
                                                        aria-label="Descendre l'exercice {index + 1}"
													>
														<ArrowDown size={18} />
													</button>
												{/if}
											</div>
											<button
												class="btn-remove"
												on:click={() => removeFromCustomList(exercise)}
                                                title="Retirer de la liste"
                                                aria-label="Retirer l'exercice {index + 1}"
											>
												×
											</button>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	{/if}
</div>

<style>
    /* Styles are scoped to CustomList.svelte */

	/* --- Base Layout & Desktop Sticky View --- */
	.custom-list-container {
		position: relative;
		height: 100%;
	}
	.custom-list-sticky {
		position: sticky;
        /* Adjust top based on actual header height */
		top: calc(var(--header-height, 3.5rem) + 1rem);
		max-height: calc(100vh - var(--header-height, 3.5rem) - 2rem);
		/* Let card-body handle overflow */
		/* overflow-y: auto; */
		z-index: 1010; /* Below potential modals */
	}
    /* Ensure card body takes full height within sticky container */
    .custom-list-sticky > .card-body {
        height: 100%;
        max-height: inherit; /* Respect parent max-height */
        overflow: hidden; /* Prevent body overflow, let content scroll */
    }

	.custom-list-content {
		overflow-y: auto; /* Scrollable area for exercises */
		padding-right: 0.5rem; /* Space for scrollbar */
        margin-right: -0.5rem; /* Counteract padding for full width */
        overscroll-behavior: contain; /* Prevent scroll chaining */
	}
	.custom-list-content::-webkit-scrollbar { width: 6px; }
	.custom-list-content::-webkit-scrollbar-track { background: transparent; margin: 4px 0; }
	.custom-list-content::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb-color, #ccc); border-radius: 3px; }
	.custom-list-content::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-thumb-hover-color, #aaa); }

    /* Example + icon style for help text */
    .add-icon-example {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.2em;
        height: 1.2em;
        border-radius: 50%;
        background-color: var(--bs-primary-bg-subtle, #cfe2ff);
        color: var(--bs-primary-text-emphasis, #052c65);
        font-weight: bold;
        font-size: 0.9em;
        margin: 0 0.1em;
        vertical-align: middle;
    }

	/* --- List Item Styling --- */
	.custom-list-item {
		padding: 0.5rem;
		background-color: var(--list-item-bg, #f8f9fa);
		border-radius: 4px;
		border: 1px solid var(--list-item-border-color, #eee);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		transition: background-color 0.2s ease, border-color 0.2s ease;
		transform-origin: center;
		position: relative;
	}
	.custom-list-item:hover {
		background-color: var(--list-item-hover-bg, #e9ecef);
		border-color: var(--list-item-hover-border, #dee2e6);
	}

	/* --- Content within List Items --- */
	.exercise-info {
		flex: 1;
		min-width: 0;
		overflow: hidden;
	}
	.exercise-title {
		margin-bottom: 0.1rem; /* Reduced margin */
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
        line-height: 1.3; /* Adjust line height */
        display: block; /* Ensure block display */
	}
    .exercise-title :global(.katex) {
        vertical-align: baseline; /* Align math better */
    }

	.exercise-uuid {
		font-size: 0.75rem;
		color: var(--color-text-muted, #6c757d);
		font-family: var(--font-mono, monospace);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* --- Item Controls (Remove, Move) --- */
	.item-controls {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-shrink: 0;
	}
	.move-buttons {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}
	.move-buttons.mobile {
		flex-direction: row;
		gap: 0.25rem;
	}
	.btn-move {
		background: none;
		border: 1px solid transparent;
		color: var(--color-icon, #6c757d);
		padding: 0.15rem;
		width: 28px;
		height: 28px;
		cursor: pointer;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
	}
	.btn-move:hover:not(:disabled) {
		background-color: var(--color-bg-hover, #e9ecef);
		color: var(--bs-primary, #0d6efd);
	}
	.btn-move:focus-visible {
		outline: none;
		border-color: var(--bs-primary);
		box-shadow: 0 0 0 1px var(--bs-primary);
	}
    .btn-move:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }


	.btn-remove {
		background: none;
		border: none;
		color: var(--bs-danger, #dc3545);
		font-size: 20px;
		font-weight: bold;
		padding: 0 6px;
		line-height: 1;
		cursor: pointer;
		opacity: 0.6;
		transition: opacity 0.2s ease, color 0.2s ease;
		border-radius: 4px;
	}
	.btn-remove:hover {
		opacity: 1;
		color: #a30f1d; /* Darker red */
	}
	.btn-remove:focus-visible {
		outline: 2px solid var(--bs-danger);
		outline-offset: 1px;
		opacity: 1;
	}

	/* --- UUID Display Area (Desktop) --- */
	.uuid-container {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		border: 1px solid var(--border-color-light, #eee);
		padding: 0.5rem;
		border-radius: 4px;
		background-color: var(--color-bg-subtle, #f8f9fa);
		/* margin-bottom handled by parent flex gap */
	}
	.uuids-list {
		flex: 1;
		font-size: 0.75rem;
		color: var(--color-text-secondary, #6c757d);
		word-break: break-all;
		line-height: 1.3;
		max-height: 5em;
		overflow-y: auto;
		padding-right: 5px;
	}
	.uuids-list::-webkit-scrollbar { width: 4px; }
	.uuids-list::-webkit-scrollbar-track { background: transparent; }
	.uuids-list::-webkit-scrollbar-thumb { background: #ccc; border-radius: 2px; }

	.btn-copy {
		background: none;
		border: 1px solid transparent;
		color: var(--color-icon, #6c757d);
		padding: 0.25rem 0.5rem;
		font-size: 1rem;
		cursor: pointer;
		border-radius: 4px;
		transition: all 0.2s ease;
		flex-shrink: 0;
	}
	.btn-copy:hover:not(:disabled) {
		background-color: var(--color-bg-hover, #e9ecef);
		color: var(--color-text, #212529);
	}
	.btn-copy:focus-visible {
		outline: none;
		border-color: var(--bs-primary);
		box-shadow: 0 0 0 1px var(--bs-primary);
	}
    .btn-copy:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    .btn-copy svg {
        display: block; /* Ensure icon renders correctly */
    }


	/* --- Mobile Floating Button --- */
	.floating-list-button {
		position: fixed;
		bottom: 1rem;
		right: 1rem;
		background: var(--bs-primary, #0d6efd);
		color: white;
		border: none;
		border-radius: 50px;
		padding: 0.6rem 1.2rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
		z-index: 1030;
		cursor: pointer;
		transition: transform 0.2s ease-out;
	}
	.floating-list-button:hover {
		transform: scale(1.05);
	}
	.list-count {
		font-size: 1rem;
		font-weight: bold;
		background-color: rgba(255, 255, 255, 0.2);
		border-radius: 50%;
		width: 24px;
		height: 24px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
	}
	.list-label {
		font-size: 0.9rem;
		font-weight: 500;
	}

	/* --- Mobile Modal --- */
    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: rgba(0, 0, 0, 0.4);
        z-index: 2000; /* Below modal */
    }

	.custom-list-modal {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: var(--card-bg, white); /* Use theme variable */
		border-top-left-radius: 1rem;
		border-top-right-radius: 1rem;
		max-height: 85vh;
		box-shadow: 0 -4px 15px rgba(0, 0, 0, 0.15);
		z-index: 2001;
		display: flex;
		flex-direction: column;
		/* Transition applied inline for drag interaction */
        /* transition: transform 0.3s ease-out; */
	}
	.custom-list-modal-content {
		display: flex;
		flex-direction: column;
		flex-grow: 1;
		overflow: hidden;
	}
	.swipe-indicator {
		width: 50px;
		height: 5px;
		background-color: var(--border-color-light, #e0e0e0);
		border-radius: 2.5px;
		margin: 0.5rem auto 0.25rem auto;
		flex-shrink: 0;
        cursor: grab;
	}
	.custom-list-modal-header {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--border-color, #dee2e6);
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: var(--color-bg-0, #f8f9fa);
		flex-shrink: 0;
	}
	.custom-list-modal-header h5 {
		margin-bottom: 0;
		font-size: 1rem;
        /* Allow title to shrink if needed */
        min-width: 0;
        margin-right: auto; /* Push buttons to right */
        padding-right: 1rem; /* Space before visualize button */
	}
    /* Ensure close button uses Bootstrap style */
    .custom-list-modal-header .btn-close {
        padding: 0.5rem; /* Adjust hit area */
        margin: -0.5rem -0.5rem -0.5rem 0.5rem; /* Adjust alignment */
    }
    .custom-list-modal-header :global(.btn) {
        flex-shrink: 0; /* Prevent visualize button shrinking */
    }

	.custom-list-modal-body {
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 0.5rem 1rem 1rem 1rem;
		flex-grow: 1;
	}

	.custom-list-item.mobile {
		padding: 0.75rem;
		background-color: white;
		border: 1px solid var(--border-color, #dee2e6);
		border-radius: 4px;
		margin-bottom: 0.5rem;
	}
    .custom-list-item.mobile:last-child {
        margin-bottom: 0;
    }


	/* --- Preview HTML Override (Scoped) --- */
	.preview-html {
		font-size: 0.75rem;
		color: var(--color-text-muted, #6c757d);
		line-height: 1.3;
        margin-top: 0.25rem; /* Add space above preview */
	}
	.preview-html :global(p:first-child) { margin-top: 0; }
	.preview-html :global(p:last-child) { margin-bottom: 0; }
    .preview-html :global(.katex) {
        font-size: 0.9em; /* Make math slightly smaller in preview */
    }

</style>