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
		</div>
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

</style>