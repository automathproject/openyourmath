<!-- src/components/ExerciceHeader.svelte -->
<script lang="ts">
	import { slide } from 'svelte/transition';
	import { quadOut } from 'svelte/easing';
	import { onMount } from 'svelte';

	export let metadata;
	export let themes: string[] = []; // Default to empty array
	export let uuid;
	let texFileUrl: string = '';
	let isLoadingUrl = true; // Track loading state
	let showExtraMetadata = false; // Control expanded view

	function formatDate(dateString: string): string {
		if (!dateString) return ''; // Handle undefined/null date
		try {
			const date = new Date(dateString);
			// Check if date is valid
			if (isNaN(date.getTime())) {
				return dateString; // Return original string if invalid
			}
			return date.toLocaleDateString('fr-FR', {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			});
		} catch (e) {
			console.error('Error formatting date:', dateString, e);
			return dateString; // Return original string on error
		}
	}

	// Fetch the URL index
	onMount(async () => {
		isLoadingUrl = true;
		try {
			const response = await fetch('/content/json2/index-tex.json');
			if (response.ok) {
				const texUrls = await response.json();
				if (texUrls && texUrls[uuid]) {
					// Construct absolute URL correctly
					texFileUrl = `${texUrls[uuid]}`;
				} else {
					// Fallback if UUID not found or index is malformed
					texFileUrl = `https://github.com/automathproject/exobase/blob/main/src/amscc/${uuid}.tex`;
				}
			} else {
				// Fallback if fetch fails
				console.warn(`Failed to load index-tex.json (status: ${response.status}), using fallback URL.`);
				texFileUrl = `https://github.com/automathproject/exobase/blob/main/src/amscc/${uuid}.tex`;
			}
		} catch (error) {
			console.error("Error loading or parsing index-tex.json:", error);
			// Fallback on any error
			texFileUrl = `https://github.com/automathproject/exobase/blob/main/src/amscc/${uuid}.tex`;
		} finally {
			isLoadingUrl = false;
		}
	});

	// Check if additional metadata is available
	$: hasAdditionalMetadata = !!(
		(metadata?.competences && metadata.competences.length > 0) ||
		(metadata?.concepts_fondamentaux && metadata.concepts_fondamentaux.length > 0) ||
		(metadata?.prerequis && metadata.prerequis.length > 0) ||
		metadata?.type_exercice ||
		metadata?.niveau_difficulte
	);
</script>

{#if metadata}
	<!-- Use UUID as key for transition reactivity -->
	<div class="metadata" key={uuid} transition:slide|local={{ duration: 200, easing: quadOut }}>

		<!-- Ligne des thèmes -->
		{#if themes && themes.length > 0}
			<div class="themes-row">
				<!-- The global .tags class provides flex/gap -->
				<div class="tags">
					{#each themes as theme}
						<!-- This now uses the GLOBAL .tag style from app.css -->
						<span class="tag">{theme}</span>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Chapitre et sous-chapitre (si présents) -->
		{#if metadata.chapitre || metadata.sousChapitre}
			<div class="chapter-info">
				{#if metadata.chapitre}
					<span class="chapter-item">{metadata.chapitre}</span>
				{/if}
				{#if metadata.chapitre && metadata.sousChapitre}
					<span class="metadata-separator" aria-hidden="true">•</span>
				{/if}
				{#if metadata.sousChapitre}
					<span class="chapter-item">{metadata.sousChapitre}</span>
				{/if}
			</div>
		{/if}

		<!-- Niveau et Type d'exercice sur la même ligne -->
		{#if metadata.niveau_difficulte || metadata.type_exercice}
			<div class="metadata-row">
				{#if metadata.niveau_difficulte}
					<div class="metadata-chip difficulty">
						<span class="metadata-label">Niveau :</span>
						<span class="metadata-value">{metadata.niveau_difficulte}</span>
					</div>
				{/if}
				
				{#if metadata.type_exercice}
					<div class="metadata-chip exercise-type">
						<span class="metadata-value">{metadata.type_exercice}</span>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Autres métadonnées -->
		<div class="metadata-group">
			{#if !isLoadingUrl && texFileUrl}
				<a href={texFileUrl} target="_blank" class="tex-link" rel="noopener noreferrer">
					{uuid}.tex
				</a>
				<span class="metadata-separator" aria-hidden="true">•</span>
			{:else if isLoadingUrl}
				<span class="tex-link-loading">Loading link...</span>
				<span class="metadata-separator" aria-hidden="true">•</span>
			{/if}

			{#if metadata.auteur}
				<span class="metadata-item">{metadata.auteur}</span>
				{#if metadata.organisation || metadata.createdAt}
				<span class="metadata-separator" aria-hidden="true">•</span>
				{/if}
			{/if}

			{#if metadata.organisation}
				<span class="metadata-item">{metadata.organisation}</span>
				{#if metadata.createdAt}
				<span class="metadata-separator" aria-hidden="true">•</span>
				{/if}
			{/if}

			{#if metadata.createdAt}
				<span class="metadata-item">{formatDate(metadata.createdAt)}</span>
			{/if}

			{#if hasAdditionalMetadata}
				<button class="toggle-metadata" on:click={() => showExtraMetadata = !showExtraMetadata}>
					{showExtraMetadata ? 'Moins de détails' : 'Plus de détails'}
				</button>
			{/if}
		</div>

		<!-- Section de métadonnées supplémentaires - s'affiche uniquement lorsqu'elle est développée -->
		{#if hasAdditionalMetadata && showExtraMetadata}
			<div class="extra-metadata" transition:slide|local={{ duration: 150, easing: quadOut }}>
				{#if metadata.competences && metadata.competences.length > 0}
					<div class="extra-metadata-section">
						<h4 class="section-title">Compétences</h4>
						<div class="tags">
							{#each metadata.competences as competence}
								<span class="tag competence-tag">{competence}</span>
							{/each}
						</div>
					</div>
				{/if}

				{#if metadata.concepts_fondamentaux && metadata.concepts_fondamentaux.length > 0}
					<div class="extra-metadata-section">
						<h4 class="section-title">Concepts fondamentaux</h4>
						<div class="tags">
							{#each metadata.concepts_fondamentaux as concept}
								<span class="tag concept-tag">{concept}</span>
							{/each}
						</div>
					</div>
				{/if}

				{#if metadata.prerequis && metadata.prerequis.length > 0}
					<div class="extra-metadata-section">
						<h4 class="section-title">Prérequis</h4>
						<div class="tags">
							{#each metadata.prerequis as prerequis}
								<span class="tag prerequis-tag">{prerequis}</span>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
	.metadata {
		font-size: 0.85rem; /* Slightly smaller base */
		color: var(--color-text-secondary, #555);
		line-height: 1.5;
	}

	.metadata-group {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem 0.5rem; /* Vertical and horizontal gap */
	}

	.metadata-item {
		font-weight: 500; /* Medium weight */
        white-space: nowrap; /* Prevent wrapping within an item */
	}

	.metadata-separator {
		color: var(--color-text-separator, #ccc); /* Lighter separator */
        user-select: none; /* Not selectable */
	}

	/* Removed the scoped .tag style override */
	/* Tags will now use the global style from app.css */

    /* Ensure global .tags class styles (flex, gap) apply if needed */
    .tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem; /* Adjust gap if needed */
    }

	.themes-row {
		margin-bottom: 0.5rem; /* Space below the tags row */
	}

	.chapter-info {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem 0.5rem;
		margin-bottom: 0.5rem;
		font-style: italic;
        color: var(--color-text-tertiary, #777); /* Slightly dimmer */
	}

	.chapter-item {
        white-space: nowrap;
	}

    .tex-link, .tex-link-loading {
        font-family: var(--font-mono, monospace);
        font-size: 0.8rem;
        color: var(--bs-primary, #49B2B2); /* Use theme primary color */
        text-decoration: none;
        background-color: var(--color-bg-code, #f8f8f8);
        padding: 0.1rem 0.3rem;
        border-radius: 3px;
        border: 1px solid var(--border-color-light, #eee);
        transition: background-color 0.2s ease;
        white-space: nowrap;
    }
    .tex-link:hover {
        background-color: var(--color-bg-code-hover, #efefef);
        text-decoration: none;
    }
    .tex-link-loading {
        color: var(--color-text-muted, #6b7280);
        cursor: default;
    }

	/* Nouveaux styles pour les métadonnées améliorées */
	.metadata-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.metadata-chip {
		display: inline-flex;
		align-items: center;
		padding: 0.15rem 0.5rem;
		border-radius: 4px;
		font-size: 0.8rem;
		white-space: nowrap;
		background: var(--color-bg-chip, #f0f0f0);
		border: 1px solid var(--color-border-chip, #e0e0e0);
	}

	.difficulty {
		background-color: var(--color-bg-difficulty, #f8f4ff);
		border-color: var(--color-border-difficulty, #e6d8ff);
	}

	.exercise-type {
		background-color: var(--color-bg-exercise-type, #f0f8ff);
		border-color: var(--color-border-exercise-type, #d0e8ff);
	}

	.metadata-label {
		font-weight: 600;
		margin-right: 0.25rem;
		color: var(--color-text-label, #666);
	}

	.metadata-value {
		color: var(--color-text-value, #444);
	}

	.toggle-metadata {
		background: none;
		border: none;
		padding: 0.1rem 0.3rem;
		font-size: 0.8rem;
		color: var(--bs-primary, #49B2B2);
		cursor: pointer;
		text-decoration: underline;
		margin-left: 0.5rem;
	}

	.toggle-metadata:hover {
		color: var(--bs-primary-dark, #3a8f8f);
	}

	.extra-metadata {
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--color-border-light, #eee);
	}

	.extra-metadata-section {
		margin-bottom: 0.75rem;
	}

	.extra-metadata-section:last-child {
		margin-bottom: 0;
	}

	.section-title {
		font-size: 0.8rem;
		font-weight: 600;
		margin: 0 0 0.3rem 0;
		color: var(--color-text-section-title, #555);
	}

	.competence-tag {
		background-color: var(--color-bg-competence, #edf9f0);
		border-color: var(--color-border-competence, #c5e8ce);
	}

	.concept-tag {
		background-color: var(--color-bg-concept, #fff4e6);
		border-color: var(--color-border-concept, #ffe0b2);
	}

	.prerequis-tag {
		background-color: var(--color-bg-prerequis, #f9f2f4);
		border-color: var(--color-border-prerequis, #e9d8de);
	}
</style>