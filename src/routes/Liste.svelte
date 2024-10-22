<script lang="ts">
  import { onMount } from 'svelte';
  import Exercice from './Exercice.svelte';
  import MathRenderer from './MathRenderer.svelte';

  export let onSelect: (uuid: string) => void;

  type Exercice = {
    uuid: string;
    titre: string;
    theme: string;
  };

  let exercises: Exercice[] = [];
  let filteredExercises: Exercice[] = [];
  let visibleExercises: Exercice[] = [];
  let themes: string[] = [];
  let selectedTheme: string = 'Tous les thèmes';
  let error: string | null = null;
  let loading: boolean = true;
  let limit: number = 6;
  let offset: number = 0;

  onMount(async () => {
    try {
      const response = await fetch('/exercice/list');
      if (response.ok) {
        exercises = await response.json();
        console.log(exercises); // Affiche la structure des exercices récupérés
        themes = Array.from(new Set(exercises.map(ex => ex.theme)));
        themes.unshift('Tous les thèmes'); // Ajouter l'option "tous les thèmes"
        applyFilter();
      } else {
        error = `Erreur lors du chargement des exercices : ${response.statusText}`;
      }
    } catch (err: any) {
      error = `Échec du chargement des exercices : ${err.message}`;
    } finally {
      loading = false;
    }
  });

  function handleClick(uuid: string) {
    if (onSelect) {
      onSelect(uuid);
    }
  }

  function loadMore() {
    offset += limit;
    updateVisibleExercises();
  }

  function applyFilter() {
    // Filtrer les exercices en fonction du thème sélectionné
    filteredExercises = selectedTheme === 'Tous les thèmes'
      ? exercises
      : exercises.filter(ex => ex.theme === selectedTheme);

    // Réinitialiser l'offset et mettre à jour les exercices visibles
    offset = 0;
    updateVisibleExercises();
  }

  function updateVisibleExercises() {
    visibleExercises = filteredExercises.slice(0, offset + limit);
  }

  function selectTheme(theme: string) {
    selectedTheme = theme;
    applyFilter();
  }
</script>

<div class="container d-flex">
  <!-- Colonne des thèmes -->
  <div class="themes-list me-3">
    <ul class="list-group">
      {#each themes as theme}
        <li
          class="list-group-item {selectedTheme === theme ? 'active' : ''}"
          on:click={() => selectTheme(theme)}
          style="cursor: pointer;"
        >
          {theme}
        </li>
      {/each}
    </ul>
  </div>

  <!-- Liste des exercices -->
  <div class="exercise-list flex-fill">
    {#if loading}
      <div class="d-flex justify-content-center align-items-center">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Chargement...</span>
        </div>
      </div>
    {:else if error}
      <div class="alert alert-danger" role="alert">
        {error}
      </div>
    {:else if exercises.length === 0}
      <div class="alert alert-warning" role="alert">
        Aucun exercice disponible.
      </div>
    {:else}
    <div class="list-group">
      {#each visibleExercises as exercise (exercise.uuid)}
        <button
          on:click={() => handleClick(exercise.uuid)}
          class="list-group-item list-group-item-action"
        >
          <div class="exercise-info">
            <div class="exercise-title">
              <MathRenderer content={exercise.titre} />
            </div>
            <div class="exercise-theme">
              <small>{exercise.theme}</small>
            </div>
          </div>
        </button>
      {/each}
    </div>
      {#if visibleExercises.length < filteredExercises.length}
        <button on:click={loadMore} class="btn btn-primary mt-3">
          Charger plus
        </button>
      {/if}
    {/if}
  </div>
</div>




<style>
  .list-group-item {
      cursor: pointer;
  }

  .list-group-item:hover {
      background-color: #f0f0f0;
  }
  .themes-list {
    width: 200px;
  }
  .btn {
      width: 100%;
  }

  .exercise-info {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      font-size: 0.875rem;
  }

  .exercise-uuid {
      font-size: 0.875rem;
      color: #6d0303; /* Couleur grisée pour le texte de l'UUID */
  }

  .exercise-title {
      font-weight: bold;
  }

  .exercise-theme {
      color: #6c757d; /* Couleur grisée pour le texte du thème */
      font-size: 0.875rem; /* Taille de police réduite pour le thème */
      margin-top: 4px;
  }
</style>
