<!-- src/components/Liste.svelte -->
<script lang="ts">
    import { onMount } from 'svelte';
    import type { Exercise } from './types'; // Facultatif : définir un type pour plus de clarté
  
    export let onSelect: (uuid: string) => void; // Callback lorsqu'un élément est cliqué
  
    let exercises: Exercise[] = [];
    let error: string | null = null;
    let loading: boolean = true;
  
    onMount(async () => {
      try {
        const response = await fetch('/exercice/list');
        if (response.ok) {
          exercises = await response.json();
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
      {#each exercises as exercise}
        <button
          on:click={() => handleClick(exercise.uuid)}
          class="list-group-item list-group-item-action"
        >
          <strong>{exercise.uuid}</strong> : {exercise.titre}
        </button>
      {/each}
    </div>
  {/if}
  
  <style>
    .list-group-item {
      cursor: pointer;
    }
  
    .list-group-item:hover {
      background-color: #f0f0f0;
    }
  </style>
  