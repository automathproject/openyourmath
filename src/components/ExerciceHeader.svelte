<!-- src/components/ExerciceHeader.svelte -->
<script lang="ts">
  import { slide } from 'svelte/transition';
  import { quadOut } from 'svelte/easing';
  import { onMount } from 'svelte';
  
  export let metadata;
  export let themes;
  export let uuid;
  let texFileUrl: string = '';
  
  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  
  // Fonction qui détermine l'URL du fichier .tex
  onMount(async () => {
    try {
      // Essayer de récupérer index.json via une requête fetch
      const response = await fetch('/content/latex/index.json');
      if (response.ok) {
        const texUrls = await response.json();
        // Si l'UUID existe dans l'index, utiliser l'URL correspondante
        if (texUrls[uuid]) {
          texFileUrl = texUrls[uuid];
        } else {
          // Fallback: utiliser le format d'URL alternatif
          texFileUrl = `https://github.com/automathproject/exobase/blob/main/src/amscc/${uuid}.tex`;
        }
      } else {
        // En cas d'erreur lors du chargement du JSON, utiliser le format d'URL alternatif
        texFileUrl = `https://github.com/automathproject/exobase/blob/main/src/amscc/${uuid}.tex`;
      }
    } catch (error) {
      console.error("Erreur lors du chargement de l'index des fichiers LaTeX:", error);
      // Fallback en cas d'erreur
      texFileUrl = `https://github.com/automathproject/exobase/blob/main/src/amscc/${uuid}.tex`;
    }
  });
  </script>
  
  <div class="metadata" transition:slide={{ duration: 100, easing: quadOut }}>
    <!-- Ligne des thèmes -->
    <div class="themes-row">
      <div class="tags">
        {#each themes as theme}
          <span class="tag">{theme}</span>
        {/each}
      </div>
    </div>
  
    <!-- Chapitre et sous-chapitre (si présents) -->
    {#if metadata.chapitre || metadata.sousChapitre}
      <div class="chapter-info">
        {#if metadata.chapitre}
          <span class="chapter-item">{metadata.chapitre}</span>
        {/if}
        {#if metadata.chapitre && metadata.sousChapitre}
          <span class="metadata-separator">•</span>
        {/if}
        {#if metadata.sousChapitre}
          <span class="chapter-item">{metadata.sousChapitre}</span>
        {/if}
      </div>
    {/if}
  
    <!-- Autres métadonnées -->
    <div class="metadata-group">
      <a
        href={texFileUrl || `https://github.com/automathproject/exobase/blob/main/src/amscc/${uuid}.tex`}
        target="_blank"
        class="tex-link"
      >
        {uuid}.tex
      </a> <span class="metadata-separator">•</span>
      <span class="metadata-item">{metadata.auteur}</span>
      {#if metadata.organisation}
        <span class="metadata-separator">•</span>
        <span class="metadata-item">{metadata.organisation}</span>
      {/if}
      <span class="metadata-separator">•</span>
      <span class="metadata-item">{formatDate(metadata.createdAt)}</span>
    </div>
  </div>
  
  <style>
  .metadata {
    font-size: 0.9rem;
    color: #555;
  }
  .metadata-group {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .metadata-item {
    font-weight: bold;
  }
  .metadata-separator {
    color: #aaa;
  }
  .tag {
    padding: 0.2rem 0.5rem;
    font-size: 0.65rem;
  }
  .themes-row {
    display: flex;
    flex-wrap: wrap; /* Permet de gérer plusieurs thèmes sur une même ligne */
    gap: 0.5rem; /* Espacement entre les tags */
  }
  .chapter-info {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  .chapter-item {
    font-weight: 500;
    font-style: italic;
  }
  </style>