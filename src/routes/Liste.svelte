<script lang="ts">
    import MathRenderer from '../components/MathRenderer.svelte';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import type { Exercice } from './types'; // Assurez-vous d'avoir un type Exercice défini
    import { get } from 'svelte/store';
  
    export let onSelect: (uuid: string) => void;
  
    let uuidInput: string = '';
    let exercises: Exercice[] = [];
    let error: string | null = null;
    let loading: boolean = false;
  
    // Charger la liste d'UUIDs depuis l'URL au montage du composant
    onMount(() => {
      const currentList = get(page).url.searchParams.get('list');
      if (currentList) {
        uuidInput = currentList;
        loadExercises();
      }
    });
  
    // Fonction pour charger les exercices à partir de la liste
    async function loadExercises() {
      if (!uuidInput) {
        error = 'Veuillez entrer au moins un UUID.';
        exercises = [];
        return;
      }
  
      loading = true;
      error = null;
      exercises = [];
      try {
        const uuids = uuidInput.split(',').map(u => u.trim()).filter(u => u !== '');
        if (uuids.length === 0) {
          error = 'Aucun UUID valide trouvé.';
          return;
        }
  
        // Supprimer les doublons
        const uniqueUUIDs = Array.from(new Set(uuids));
        uuidInput = uniqueUUIDs.join(','); // Mettre à jour l'entrée sans doublons
  
        // Mettre à jour l'URL avec la liste des UUIDs
        goto(`?list=${uuidInput}`, { replaceState: true });
  
        const fetchPromises = uniqueUUIDs.map(uuid =>
          fetch(`/exercice/${uuid}`)
            .then(response => {
              if (response.ok) {
                return response.json().then(ex => ({ ...ex, uuid }));
              } else {
                throw new Error(`Erreur pour UUID ${uuid}: ${response.statusText}`);
              }
            })
            .catch(err => {
              console.error(`Erreur lors de la récupération de l'exercice ${uuid}:`, err);
              return null;
            })
        );
  
        const results = await Promise.all(fetchPromises);
        exercises = results.filter(ex => ex !== null);
  
        if (exercises.length === 0) {
          error = 'Aucun exercice trouvé pour les UUIDs fournis.';
        }
      } catch (err: any) {
        error = `Erreur lors du chargement de la liste : ${err.message}`;
      } finally {
        loading = false;
      }
    }
  
    function handleInputChange(event: Event) {
      const target = event.target as HTMLInputElement;
      uuidInput = target.value;
    }
  
    function handleSelect(uuid: string) {
      if (onSelect) {
        onSelect(uuid);
      }
    }
  </script>
  
  <div>
    <!-- Champ de saisie pour les UUIDs -->
    <div class="input-container mb-3">
      <input
        type="text"
        bind:value={uuidInput}
        class="form-control"
        placeholder="Entrez des UUIDs séparés par des virgules"
        on:input={handleInputChange}
        on:keydown={(event) => {
          if (event.key === 'Enter') {
            loadExercises();
          }
        }}
      
      />
      <button on:click={loadExercises} class="btn btn-primary mt-2">
        Charger la Liste
      </button>
    </div>
  
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
    {:else}
      <div class="list-group">
        {#each exercises as exercise, index (exercise.uuid)}
          <button
            on:click={() => handleSelect(exercise.uuid)}
            class="list-group-item list-group-item-action"
          >
            <div class="exercise-info">
              <div class="exercise-title">
                {index + 1}. <MathRenderer content={exercise.titre} />
              </div>
              <div class="exercise-theme">
                <small>{exercise.theme}</small>
              </div>
            </div>
          </button>
        {/each}
      </div>
    {/if}
  </div>
  
  <style>
    .list-group-item {
      cursor: pointer;
    }
  
    .list-group-item:hover {
      background-color: #f0f0f0;
    }
  
    .exercise-info {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      font-size: 0.875rem;
    }
  
    .exercise-title {
      font-weight: bold;
    }
  
    .exercise-theme {
      color: #6c757d;
      font-size: 0.875rem;
      margin-top: 4px;
    }
  
    .input-container {
      display: flex;
      flex-direction: column;
    }
  
    .form-control {
      width: 100%;
    }
  
    .btn {
      align-self: flex-start;
    }
  </style>
  