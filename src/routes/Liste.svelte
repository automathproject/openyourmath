<script lang="ts">
  import { onMount } from 'svelte';
  import type { Exercise } from './types';

  export let onSelect: (uuid: string) => void;

  let exercises: Exercise[] = [];
  let error: string | null = null;
  let loading: boolean = true;
  let visibleExercises: Exercise[] = [];
  let limit: number = 10; // Nombre initial d'exercices à afficher
  let offset: number = 0;

  onMount(async () => {
    try {
      const response = await fetch('/exercice/list');
      if (response.ok) {
        exercises = await response.json();
        visibleExercises = exercises.slice(0, limit); // Charge les premiers éléments
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
    visibleExercises = exercises.slice(0, offset + limit);
  }
</script>

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
    {#each visibleExercises as exercise}
      <button
        on:click={() => handleClick(exercise.uuid)}
        class="list-group-item list-group-item-action"
      >
        <strong>{exercise.uuid}</strong> : {exercise.titre}
      </button>
    {/each}
  </div>
  {#if visibleExercises.length < exercises.length}
    <button on:click={loadMore} class="btn btn-primary mt-3">
      Charger plus
    </button>
  {/if}
{/if}

<style>
  .list-group-item {
      cursor: pointer;
  }

  .list-group-item:hover {
      background-color: #f0f0f0;
  }

  .btn {
      width: 100%;
  }
</style>
