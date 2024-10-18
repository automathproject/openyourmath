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
    
    // Fonction pour charger les données de l'exercice
    async function loadExerciseData(uuid: string) {
      if (uuid) {
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
        } catch (error) {
          exerciseData = null;
          errorMessage = `L'exercice ${uuid} n'a pas pu être chargé.`;
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
  
  <section>
    <!-- Input pour saisir l'UUID de l'exercice -->
    <input
      type="text"
      bind:value={inputUuid}
      placeholder="Ab62"
      on:keydown={(event) => {
        if (event.key === 'Enter') {
          handleLoadExercise();
        }
      }}
    />
    <button on:click={handleLoadExercise}>Afficher l'exercice</button>
    
    <!-- Inclure la Liste des exercices -->
    <Liste onSelect={handleSelect} />
    
    {#if errorMessage && !exerciseData}
      <p class="error">{errorMessage}</p>
    {/if}
  
    {#if exerciseData}
      <!-- Passer les données de l'exercice au composant Exercice -->
      <Exercice ExerciceData={exerciseData} />
    {/if}
  </section>
  
  <style>
    .error {
      color: red;
      margin-top: 1rem;
    }
    section {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      flex: 0.6;
      padding: 1rem;
    }
  
    input {
      padding: 0.5rem;
      font-size: 1rem;
      margin-bottom: 0.5rem;
      border: 1px solid #ccc;
      border-radius: 4px;
      width: 200px; /* Ajustez la largeur selon vos besoins */
    }
  
    button {
      padding: 0.5rem 1rem;
      background-color: #1eff00;
      border: none;
      border-radius: 4px;
      color: white;
      cursor: pointer;
      font-size: 1rem;
      margin-bottom: 1rem;
    }
  
    button:hover {
      background-color: #17c700;
    }
  
    .error {
      color: red;
      margin-top: 1rem;
    }
  </style>
  