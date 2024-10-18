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
      } catch (err) {
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
    <p>Chargement des exercices...</p>
  {:else if error}
    <p class="error">{error}</p>
  {:else}
    <table class="exercise-list">
      <thead>
        <tr>
          <th>UUID</th>
          <th>Titre</th>
        </tr>
      </thead>
      <tbody>
        {#each exercises as exercise}
          <tr on:click={() => handleClick(exercise.uuid)} class="exercise-row">
            <td>{exercise.uuid}</td>
            <td>{exercise.titre}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
  
  <style>
    .exercise-list {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
    }
  
    .exercise-list th,
    .exercise-list td {
      border: 1px solid #ccc;
      padding: 0.5rem;
      text-align: left;
    }
  
    .exercise-row {
      cursor: pointer;
    }
  
    .exercise-row:hover {
      background-color: #f0f0f0;
    }
  
    .error {
      color: red;
    }
  </style>
  