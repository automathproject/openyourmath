<!-- src/routes/exercice/+page.svelte -->
<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import 'katex/dist/katex.min.css';
    import Exercice from '../Exercice.svelte';
    import Liste from '../Liste.svelte';
    
    import { get } from 'svelte/store';
    
    // Variables liées au champ de saisie
    let inputUuid: string = '';
    // Variable représentant l'UUID chargé
    let exerciseUuid: string = '';
    let exerciseData: any = null;
    let errorMessage: string = 'Aucun exercice sélectionné';
    let loadingExercise: boolean = false; // Indicateur de chargement pour l'exercice
    
    // Fonction pour charger les données de l'exercice
    async function loadExerciseData(uuid: string) {
      if (uuid) {
        loadingExercise = true;
        try {
          // Utiliser un chemin absolu pour éviter les problèmes de résolution
          const response = await fetch(`/content/json/${uuid}.json`);
          if (response.ok) {
            exerciseData = await response.json();
            errorMessage = '';
          } else {
            exerciseData = null;
            errorMessage = `Erreur lors du chargement de l'exercice : ${response.statusText}`;
          }
        } catch (error: any) {
          exerciseData = null;
          errorMessage = `L'exercice ${uuid} n'a pas pu être chargé.`;
        } finally {
          loadingExercise = false;
        }
      } else {
        exerciseData = null;
        errorMessage = 'Aucun exercice sélectionné';
      }
    }
    
    // Instruction réactive pour surveiller les changements dans l'URL
    $: {
      const currentUuid = $page.url.searchParams.get('uuid');
      if (currentUuid && currentUuid !== exerciseUuid) {
        exerciseUuid = currentUuid;
        inputUuid = currentUuid; // Synchroniser l'entrée avec l'UUID de l'URL
        loadExerciseData(exerciseUuid);
      }
    }
    
    // Fonction pour gérer le chargement et la mise à jour de l'URL
    function handleLoadExercise() {
      if (inputUuid && inputUuid !== exerciseUuid) {
        // Mettre à jour l'URL avec le paramètre uuid
        goto(`?uuid=${inputUuid}`, { replaceState: false });
        // La logique réactive détectera le changement d'URL et chargera le nouvel exercice
      }
    }
    
    // Fonction pour gérer la sélection dans Liste
    function handleSelect(uuid: string) {
      inputUuid = uuid;
      handleLoadExercise();
    }
    
    // Charger l'exercice initial si l'URL contient un uuid
    onMount(() => {
      const initialUuid = get(page).url.searchParams.get('uuid');
      if (initialUuid) {
        exerciseUuid = initialUuid;
        inputUuid = initialUuid;
        loadExerciseData(exerciseUuid);
      }
    });
  </script>
  
  <section class="container">
    <div class="row">
      <!-- Colonne de la Liste des Exercices -->
      <div class="col-md-4 liste-container">
        <h3>Recherche</h3>
        <Liste onSelect={handleSelect} />
      </div>
      
      <!-- Colonne de l'Exercice -->
      <div class="col-md-8">
        <!-- Input pour saisir l'UUID de l'exercice -->
        <div class="input-container mb-3">
          <input
            type="text"
            bind:value={inputUuid}
            class="form-control"
            placeholder="Ab62"
            on:keydown={(event) => {
              if (event.key === 'Enter') {
                handleLoadExercise();
              }
            }}
          />
          <button on:click={handleLoadExercise} class="btn btn-primary ms-2">
            Afficher l'exercice
          </button>
        </div>
        
        <!-- Indicateur de chargement -->
        {#if loadingExercise}
          <div class="alert alert-info" role="alert">
            Chargement de l'exercice...
          </div>
        {/if}
      
        {#if errorMessage && !exerciseData}
          <div class="alert alert-danger" role="alert">
            {errorMessage}
          </div>
        {/if}
      
        {#if exerciseData}
          <!-- Passer les données de l'exercice au composant Exercice -->
          <Exercice ExerciceData={exerciseData} />
        {/if}
      </div>
    </div>
  </section>
  
  <style>
    /* Optionnel : Styles personnalisés pour améliorer l'apparence */
    .liste-container {
    max-height: calc(100vh - 100px); /* Ajuste la hauteur pour s'adapter à la hauteur de la fenêtre */
    overflow-y: auto; /* Active le défilement vertical si le contenu dépasse la hauteur */
    padding-bottom: 20px; /* Un peu de marge pour l'espacement visuel */
  }
    .input-container {
      display: flex;
      align-items: center;
    }
  
    .input-container input {
      flex: 1;
    }
  
    .input-container button {
      flex-shrink: 0;
    }
  
    .container {
      margin-top: 20px;
    }
  
    @media (max-width: 768px) {
      .input-container {
        flex-direction: column;
        align-items: stretch;
      }
  
      .input-container button {
        margin-top: 10px;
        width: 100%;
      }
    }
  </style>
  