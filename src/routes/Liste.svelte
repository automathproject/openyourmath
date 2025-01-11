<!-- src/routes/Liste.svelte-->
<script lang="ts">
  import MathRenderer from '../components/MathRenderer.svelte';
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import type { Exercice } from '$lib/types/types'
  import { get } from 'svelte/store';
  import { customList } from '$lib/stores/customList';
  import { derived, writable } from 'svelte/store';

  export let onSelect: (uuid: string) => void;
  export let activeExerciseId: string | null = null;

  const uuidInput = writable('');
  const error = writable<string | null>(null);
  const loading = writable(false);
  
  // Store dérivé pour les exercices filtrés
  const exercises = derived(
    [customList, uuidInput],
    ([$customList, $uuidInput]) => {
      const uuids = new Set($uuidInput.split(',').map(u => u.trim()).filter(Boolean));
      return $customList.filter(ex => uuids.has(ex.uuid));
    }
  );

  let abortController: AbortController | null = null;

  onMount(() => {
    const currentList = get(page).url.searchParams.get('list');
    if (currentList) {
      uuidInput.set(currentList);
      loadExercises();
    }
  });

  onDestroy(() => {
    if (abortController) {
      abortController.abort();
    }
  });

  async function loadExercises() {
    if (!get(uuidInput)) {
      error.set('Veuillez entrer au moins un UUID.');
      return;
    }

    // Annuler toute requête en cours
    if (abortController) {
      abortController.abort();
    }
    abortController = new AbortController();

    loading.set(true);
    error.set(null);

    try {
      const uuids = get(uuidInput)
        .split(',')
        .map(u => u.trim())
        .filter(u => u !== '');

      if (uuids.length === 0) {
        error.set('Aucun UUID valide trouvé.');
        return;
      }

      const uniqueUUIDs = Array.from(new Set(uuids));
      uuidInput.set(uniqueUUIDs.join(','));
      
      await goto(`?list=${get(uuidInput)}`, { replaceState: true });

      const fetchPromises = uniqueUUIDs.map(async uuid => {
        // Vérifier si l'exercice est déjà dans le store
        const existingExercise = get(customList).find(ex => ex.uuid === uuid);
        if (existingExercise) {
          return existingExercise;
        }

        try {
          const response = await fetch(`/exercice/${uuid}`, {
            signal: abortController?.signal
          });
          
          if (response.ok) {
            const exerciseData = await response.json();
            const exercise = { ...exerciseData, uuid };
            customList.update(list => {
              if (!list.some(ex => ex.uuid === uuid)) {
                return [...list, exercise];
              }
              return list;
            });
            return exercise;
          }
          throw new Error(`Erreur pour UUID ${uuid}: ${response.statusText}`);
        } catch (err) {
          if (err.name === 'AbortError') throw err;
          console.error(`Erreur lors de la récupération de l'exercice ${uuid}:`, err);
          return null;
        }
      });

      const results = await Promise.all(fetchPromises);
      const validResults = results.filter((ex): ex is Exercice => ex !== null);

      if (validResults.length === 0) {
        error.set('Aucun exercice trouvé pour les UUIDs fournis.');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        error.set(`Erreur lors du chargement de la liste : ${err.message}`);
      }
    } finally {
      loading.set(false);
    }
  }

  // Protection contre les doubles clics
  let isSelecting = false;
  async function handleSelect(uuid: string) {
    if (isSelecting || uuid === activeExerciseId) return;
    
    isSelecting = true;
    try {
      await onSelect(uuid);
    } finally {
      isSelecting = false;
    }
  }

  // Debounce pour l'input
  let inputTimeout: NodeJS.Timeout;
  function handleInputChange(event: Event) {
    const target = event.target as HTMLInputElement;
    clearTimeout(inputTimeout);
    inputTimeout = setTimeout(() => {
      uuidInput.set(target.value);
    }, 300);
  }
</script>

<div>
  <div class="input-container mb-3">
    <input
      type="text"
      value={$uuidInput}
      class="form-control"
      placeholder="Entrez des UUIDs séparés par des virgules"
      on:input={handleInputChange}
      on:keydown={(event) => {
        if (event.key === 'Enter') {
          loadExercises();
        }
      }}
    />
    <button 
      on:click={loadExercises} 
      class="btn btn-primary mt-2"
      disabled={$loading}
    >
      {$loading ? 'Chargement...' : 'Charger la Liste'}
    </button>
  </div>

  {#if $loading}
    <div class="d-flex justify-content-center align-items-center">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Chargement...</span>
      </div>
    </div>
  {:else if $error}
    <div class="alert alert-danger" role="alert">
      {$error}
    </div>
  {:else}
    <div class="list-group">
      {#each $exercises as exercise, index (exercise.uuid)}
        <button
          type="button"
          on:click={() => handleSelect(exercise.uuid)}
          class="list-group-item list-group-item-action"
          class:active={exercise.uuid === activeExerciseId}
          disabled={$loading}
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
  
  /* Style pour l'exercice actif */
  .list-group-item.active {
    background-color: #e9ecef;
    border-color: #dee2e6;
    color: inherit;
  }
  
  .list-group-item.active:hover {
    background-color: #dde1e5;
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