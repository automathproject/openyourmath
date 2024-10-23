<script lang="ts">
    import { onMount } from 'svelte';
    import MathRenderer from './MathRenderer.svelte';
  
    export let onSelect: (uuid: string) => void;
  
    let uuidInput: string = '';
    let exercises: Exercice[] = [];
    let error: string | null = null;
    let loading: boolean = false;
  
    function validateUUIDs(uuids: string[]): { valid: boolean; errorMessage: string | null } {
      const uniqueUUIDs = new Set(uuids);
      if (uniqueUUIDs.size !== uuids.length) {
        return {
          valid: false,
          errorMessage: 'La liste contient des doublons. Les doublons ont été supprimés.',
        };
      }
      // Vous pouvez ajouter d'autres validations ici (par exemple, vérifier le format des UUIDs).
      return { valid: true, errorMessage: null };
    }
  
    async function fetchExercises() {
      loading = true;
      error = null;
      exercises = [];
      try {
        const uuids = uuidInput.split(',').map(s => s.trim()).filter(s => s !== '');
        console.log('Parsed UUIDs:', uuids);
  
        // Valider la liste des UUIDs
        const { valid, errorMessage } = validateUUIDs(uuids);
  
        if (!valid) {
          error = errorMessage;
          // Supprimer les doublons
          const uniqueUUIDs = Array.from(new Set(uuids));
          uuidInput = uniqueUUIDs.join(', ');
          loading = false;
          return;
        }
  
        if (uuids.length === 0) {
          error = 'Veuillez entrer au moins un UUID.';
        } else {
          const fetchPromises = uuids.map(uuid => {
            console.log(`Fetching exercice with UUID: ${uuid}`);
            return fetch(`/exercice/${uuid}`)
              .then(response => {
                if (response.ok) {
                  return response.json().then(exercise => {
                    exercise.uuid = uuid;
                    return exercise;
                  });
                } else if (response.status === 404) {
                  console.error(`Exercice non trouvé pour UUID ${uuid}`);
                  return null;
                } else {
                  throw new Error(`Erreur pour UUID ${uuid}: ${response.statusText}`);
                }
              })
              .catch(err => {
                console.error(`Erreur lors de la requête pour UUID ${uuid}:`, err);
                return null;
              });
          });
  
          const results = await Promise.all(fetchPromises);
          exercises = results.filter(exercise => exercise !== null);
          console.log('Exercices après filtrage:', exercises);
  
          if (exercises.length === 0) {
            error = 'Aucun exercice trouvé pour les UUID fournis.';
          }
        }
      } catch (err: any) {
        error = `Échec du chargement des exercices : ${err.message}`;
        console.error('Erreur dans fetchExercises:', err);
      } finally {
        loading = false;
      }
    }
  
    function handleClick(uuid: string) {
      console.log('Exercice cliqué:', uuid);
      if (onSelect) {
        onSelect(uuid);
      }
    }
  </script>
  
  <div>
    <div class="input-group mb-3">
      <input
        type="text"
        class="form-control"
        bind:value={uuidInput}
        placeholder="Entrez des UUID séparés par des virgules"
      />
      <button class="btn btn-primary" on:click={fetchExercises}>Charger</button>
    </div>
  
    {#if error}
      <div class="alert alert-danger" role="alert">
        {error}
      </div>
    {/if}
  
    {#if loading}
      <div class="d-flex justify-content-center align-items-center">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Chargement...</span>
        </div>
      </div>
    {:else if exercises.length > 0}
      <div class="list-group">
        {#each exercises as exercise (exercise.uuid)}
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
  
    .input-group .form-control {
      flex: 1 1 auto;
    }
  
    .input-group .btn {
      flex: 0 0 auto;
    }
  </style>
  