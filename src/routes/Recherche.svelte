<script lang="ts">
  import { onMount } from 'svelte';
  import { slide, fade } from 'svelte/transition';
  import ExerciceRenderer from '../components/ExerciceRenderer.svelte';
  import MathRenderer from '../components/MathRenderer.svelte';

  export let onSelect: (uuid: string) => void;

  interface ThemeTree {
    [key: string]: string[];
  }

  let exercises: ExerciceRenderer[] = [];
  let filteredExercises: ExerciceRenderer[] = [];
  let visibleExercises: ExerciceRenderer[] = [];
  let themeTree: ThemeTree = {};
  let expandedCategories: Set<string> = new Set();
  let selectedTheme: string | null = null;
  let error: string | null = null;
  let loading: boolean = true;
  let limit: number = 6;
  let offset: number = 0;

  onMount(async () => {
    try {
      const exercicesResponse = await fetch('/exercice/recherche');
      const themesResponse = await fetch('/data/list-themes.json');
      
      if (exercicesResponse.ok && themesResponse.ok) {
        exercises = await exercicesResponse.json();
        themeTree = await themesResponse.json();
        applyFilter(null);
        // Ouvrir la première catégorie par défaut
        const firstCategory = Object.keys(themeTree)[0];
        if (firstCategory) {
          expandedCategories.add(firstCategory);
          expandedCategories = expandedCategories;
        }
      } else {
        const status = !exercicesResponse.ok 
          ? `Exercices: ${exercicesResponse.status}` 
          : `Thèmes: ${themesResponse.status}`;
        error = `Erreur lors du chargement des données (${status})`;
      }
    } catch (err: any) {
      error = `Échec du chargement : ${err.message}`;
      console.error('Erreur détaillée:', err);
    } finally {
      loading = false;
    }
  });

  function toggleCategory(category: string) {
    if (expandedCategories.has(category)) {
      expandedCategories.delete(category);
    } else {
      expandedCategories.add(category);
    }
    expandedCategories = expandedCategories;
  }

  function selectTheme(theme: string | null) {
    selectedTheme = theme;
    applyFilter(theme);
  }

  function applyFilter(theme: string | null) {
    if (!theme) {
      filteredExercises = exercises;
    } else {
      filteredExercises = exercises.filter(ex => ex.theme.includes(theme));
    }
    offset = 0;
    updateVisibleExercises();
  }
  let selectedExerciseId: string | null = null;
  let isSelecting = false; // Pour éviter les sélections multiples

  async function handleClick(uuid: string) {
    if (isSelecting) return; // Éviter les clics multiples
    
    try {
      isSelecting = true;
      selectedExerciseId = uuid;
      
      // Attendre que la sélection soit terminée
      await onSelect(uuid);
    } finally {
      isSelecting = false;
    }
  }

  function loadMore() {
    offset += limit;
    updateVisibleExercises();
  }

  function updateVisibleExercises() {
    visibleExercises = filteredExercises.slice(0, offset + limit);
  }

  function getExerciseCount(theme: string | null): number {
    if (!theme) return exercises.length;
    return exercises.filter(ex => ex.theme.includes(theme)).length;
  }
</script>

<!-- Container principal sans padding superflu -->
<div class="theme-explorer">
  <!-- Arborescence compacte -->
  <div class="themes-tree" transition:fade>
    <div class="search-header">
      <button
        class="theme-button root-button"
        class:selected={selectedTheme === null}
        on:click={() => selectTheme(null)}
      >
        <div class="icon-wrapper">
          <svg class="icon" viewBox="0 0 24 24">
            <path d="M3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2z"/>
          </svg>
        </div>
        <span>Tous ({exercises.length})</span>
      </button>
    </div>

    <div class="themes-list">
      {#each Object.entries(themeTree) as [category, themes]}
        <div class="category-group">
          <button
            class="theme-button category-button"
            class:expanded={expandedCategories.has(category)}
            on:click={() => toggleCategory(category)}
          >
            <div class="button-content">
              <div class="icon-wrapper chevron" class:rotated={expandedCategories.has(category)}>
                <svg class="icon-small" viewBox="0 0 24 24">
                  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                </svg>
              </div>
              <span class="category-name">{category}</span>
            </div>
          </button>

          {#if expandedCategories.has(category)}
            <div class="subthemes" transition:slide|local>
              {#each themes as theme}
                <button
                  class="theme-button subtheme-button"
                  class:selected={selectedTheme === theme}
                  on:click={() => selectTheme(theme)}
                >
                  <span class="theme-name">{theme}</span>
                  <span class="badge">{getExerciseCount(theme)}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <!-- Liste des exercices avec scroll indépendant -->
  <div class="exercises-container">
    {#if loading}
      <div class="loading-spinner">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Chargement...</span>
        </div>
      </div>
    {:else if error}
      <div class="alert alert-danger" role="alert">
        {error}
      </div>
    {:else if visibleExercises.length === 0}
      <div class="alert alert-warning" role="alert">
        Aucun exercice disponible.
      </div>
    {:else}
      <div class="exercises-list">
        {#each visibleExercises as exercise (exercise.uuid)}
          <button
            on:click={() => handleClick(exercise.uuid)}
            class="exercise-item"
            class:selected={selectedExerciseId === exercise.uuid}
            class:selecting={isSelecting && selectedExerciseId === exercise.uuid}
            disabled={isSelecting}
          >
            <div class="exercise-content">
              <div class="exercise-title">
                <MathRenderer content={exercise.titre} />
              </div>
              <small class="exercise-theme">{exercise.theme}</small>
            </div>
          </button>
        {/each}
      </div>
      
      <!-- Bouton "Charger plus" -->
      {#if visibleExercises.length < filteredExercises.length}
        <button 
          on:click={loadMore} 
          class="load-more-button mt-3"
          disabled={isSelecting}
        >
          Charger plus d'exercices ({visibleExercises.length} / {filteredExercises.length})
        </button>
      {/if}
    {/if}
  </div>
</div>

<style>
  .theme-explorer {
    display: flex;
    flex-direction: column;
    height: 100%;
    max-height: calc(100vh - 200px);
    gap: 1rem;
  }

  .themes-tree {
    background: #f8f9fa;
    border-radius: 6px;
    border: 1px solid #dee2e6;
    overflow: hidden;
  }

  .search-header {
    border-bottom: 1px solid #dee2e6;
  }

  .themes-list {
    max-height: 300px;
    overflow-y: auto;
  }

  .theme-button {
    width: 100%;
    text-align: left;
    background: none;
    border: none;
    padding: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    color: #495057;
    font-size: 0.875rem;
  }

  .theme-button:hover {
    background-color: #e9ecef;
  }

  .theme-button.selected {
    background-color: #e7f1ff;
    color: #0d6efd;
  }

  .button-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .category-button {
    font-weight: 500;
  }

  .subtheme-button {
    padding-left: 2rem;
    font-weight: normal;
  }

  .chevron {
    transition: transform 0.2s ease;
  }

  .chevron.rotated {
    transform: rotate(90deg);
  }

  .icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-small {
    width: 16px;
    height: 16px;
    fill: currentColor;
  }

  .badge {
    background-color: #e9ecef;
    color: #495057;
    padding: 0.2rem 0.4rem;
    border-radius: 3px;
    font-size: 0.75rem;
  }

  .theme-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .exercises-container {
    flex: 1;
    overflow-y: auto;
    min-height: 200px;
  }

  .exercises-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .exercise-item {
    width: 100%;
    text-align: left;
    background: white;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    padding: 0.75rem;
    cursor: pointer;
  }

  .exercise-item:hover {
    background-color: #f8f9fa;
    transition: all 0.2s ease;
  }

  .exercise-item.selected {
    background-color: #e7f1ff;
    border-color: #0d6efd;
  }

  .exercise-item.selecting {
    opacity: 0.7;
    cursor: wait;
  }

  .exercise-item:disabled {
    cursor: wait;
  }

  .exercise-content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .exercise-title {
    font-weight: 500;
    font-size: 0.875rem;
  }

  .exercise-theme {
    color: #6c757d;
  }

  .load-more-button {
    width: 100%;
    padding: 0.5rem;
    background-color: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    color: #495057;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-top: 1rem;
  }

  .load-more-button:hover:not(:disabled) {
    background-color: #e9ecef;
    border-color: #ced4da;
  }

  .load-more-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .mt-3 {
    margin-top: 1rem;
  }

  .loading-spinner {
    display: flex;
    justify-content: center;
    padding: 2rem;
  }

  /* Customisation de la barre de défilement */
  .themes-list::-webkit-scrollbar,
  .exercises-container::-webkit-scrollbar {
    width: 4px;
  }

  .themes-list::-webkit-scrollbar-track,
  .exercises-container::-webkit-scrollbar-track {
    background: #f1f1f1;
  }

  .themes-list::-webkit-scrollbar-thumb,
  .exercises-container::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 2px;
  }

  @media (max-width: 768px) {
    .theme-explorer {
      max-height: none;
    }

    .themes-list {
      max-height: 200px;
    }
  }
</style>