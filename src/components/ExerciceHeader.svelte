<!-- src/components/ExerciceHeader.svelte -->
<script lang="ts">
    import { slide } from 'svelte/transition';
    import { quadOut } from 'svelte/easing';

    export let metadata;
    export let themes;
    export let uuid;
  
    function formatDate(dateString: string): string {
      const date = new Date(dateString);
      return date.toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
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
  
    <!-- Autres métadonnées -->
    <div class="metadata-group">
      <a
      href={`https://github.com/automathproject/openyourmath/blob/main/static/content/latex/${uuid}.tex`}
      target="_blank"
      class="tex-link"
    >
      {uuid}.tex
    </a>
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
  </style>
  