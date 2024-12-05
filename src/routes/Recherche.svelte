<script lang="ts">
  import { onMount } from 'svelte';
  import { slide } from 'svelte/transition';
  import ExerciceRenderer from '../components/ExerciceRenderer.svelte';
  import MathRenderer from '../components/MathRenderer.svelte';

  export let onSelect: (uuid: string) => void;

  interface ThemeTree {
    [key: string]: string[];
  }

  let exercises: ExerciceRenderer[] = [];
  let themeTree: ThemeTree = {};
  let expandedCategories: Set<string> = new Set();
  let expandedThemes: Set<string> = new Set();
  let selectedTheme: string | null = null;
  let error: string | null = null;
  let loading: boolean = true;
  let selectedExerciseId: string | null = null;
  let isSelecting = false;

  onMount(async () => {
    try {
      const exercicesResponse = await fetch('/exercice/recherche');
      const themesResponse = await fetch('/data/list-themes.json');
      
      if (exercicesResponse.ok && themesResponse.ok) {
        exercises = await exercicesResponse.json();
        themeTree = await themesResponse.json();
        // Ouvrir la première catégorie par défaut
        //const firstCategory = Object.keys(themeTree)[0];
        //if (firstCategory) {
        //  expandedCategories.add(firstCategory);
        //  expandedCategories = expandedCategories;
        //}
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

  function toggleTheme(theme: string) {
    if (expandedThemes.has(theme)) {
      expandedThemes.delete(theme);
    } else {
      expandedThemes.add(theme);
    }
    expandedThemes = expandedThemes;
  }

  function getExercicesForTheme(theme: string): ExerciceRenderer[] {
    return exercises.filter(ex => ex.theme.includes(theme));
  }

  async function handleClick(uuid: string) {
    if (isSelecting) return;
    try {
      isSelecting = true;
      selectedExerciseId = uuid;
      await onSelect(uuid);
    } finally {
      isSelecting = false;
    }
  }
</script>

<div class="theme-explorer">
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
  {:else}
    <div class="themes-tree">
      <div class="themes-list">
        {#each Object.entries(themeTree) as [category, themes]}
          <div class="category-group">
            <button class="theme-button category-button" on:click={() => toggleCategory(category)}>
              <span class="category-name">{category}</span>
              <div class="icon-wrapper chevron" class:rotated={expandedCategories.has(category)}>
                <svg class="icon-small" viewBox="0 0 24 24">
                  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                </svg>
              </div>
            </button>

            {#if expandedCategories.has(category)}
              <div class="subthemes" transition:slide|local>
                {#each themes as theme}
                  <div class="theme-group">
                    <button class="theme-button subtheme-button" on:click={() => toggleTheme(theme)}>
                      <span class="theme-name">{theme}</span>
                      <div class="theme-right">
                        <span class="badge">{getExercicesForTheme(theme).length}</span>
                        <div class="icon-wrapper chevron" class:rotated={expandedThemes.has(theme)}>
                          <svg class="icon-small" viewBox="0 0 24 24">
                            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                          </svg>
                        </div>
                      </div>
                    </button>

                    {#if expandedThemes.has(theme)}
                      <div class="exercises-list" transition:slide|local>
                        {#each getExercicesForTheme(theme) as exercise}
                          <button
                            class="exercise-item"
                            class:selected={selectedExerciseId === exercise.uuid}
                            class:selecting={isSelecting && selectedExerciseId === exercise.uuid}
                            disabled={isSelecting}
                            on:click={() => handleClick(exercise.uuid)}
                          >
                            <div class="exercise-title">
                              <MathRenderer content={exercise.titre} />
                            </div>
                          </button>
                        {/each}
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .theme-explorer {
    display: flex;
    flex-direction: column;
    height: 100%;
    max-height: calc(100vh - 200px);
  }

  .themes-tree {
    background: #f8f9fa;
    border-radius: 6px;
    border: 1px solid #dee2e6;
    overflow: hidden;
  }

  .themes-list {
    max-height: 100%;
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
  gap: 0.5rem;
}

.theme-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.category-name {
  font-weight: 500;
}

.theme-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

  .theme-button:hover {
    background-color: #e9ecef;
  }

  .category-button {
    font-weight: 500;
  }

  .subtheme-button {
    padding-left: 2rem;
  }

  .category-name, .theme-name {
  font-weight: 600; /* Remplacer par 600 pour plus de gras ou 700 pour du bold */
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
    min-width: 16px;
  }

  .icon-small {
    width: 16px;
    height: 16px;
    fill: currentColor;
  }

  .theme-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .badge {
    background-color: #e9ecef;
    color: #495057;
    padding: 0.2rem 0.4rem;
    border-radius: 3px;
    font-size: 0.75rem;
    min-width: 2rem;
    text-align: center;
  }

  .exercises-list {
    display: flex;
    flex-direction: column;
    padding-left: 3rem;
  }

  .exercise-item {
    text-align: left;
    background: none;
    border: none;
    padding: 0.5rem;
    color: #495057;
    font-size: 0.875rem;
    cursor: pointer;
    border-radius: 4px;
    width: 100%;
  }

  .exercise-item:hover {
    background-color: #e9ecef;
  }

  .exercise-item.selected {
    background-color: #e7f1ff;
    color: #0d6efd;
  }

  .exercise-item.selecting {
    opacity: 0.7;
    cursor: wait;
  }

  .exercise-item:disabled {
    cursor: wait;
  }

  .loading-spinner {
    display: flex;
    justify-content: center;
    padding: 2rem;
  }

  .themes-list::-webkit-scrollbar {
    width: 4px;
  }

  .themes-list::-webkit-scrollbar-track {
    background: #f1f1f1;
  }

  .themes-list::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 2px;
  }
</style>