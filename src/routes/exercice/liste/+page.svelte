<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import Liste from '../../Liste.svelte';
    import { get } from 'svelte/store';
    import ExerciceRenderer from '../../../components/ExerciceRenderer.svelte';
    import HideColumnsButton from '../../../components/buttons/HideColumnsButton.svelte';

    // Variable représentant l'UUID chargé
    let exerciseUuid: string = '';
    let exerciseData: any = null;
    let errorMessage: string = 'Aucun exercice sélectionné';
    let loadingExercise: boolean = false; // Indicateur de chargement pour l'exercice
    let showList = true; // Variable pour contrôler l'affichage de la liste

    // Fonction pour charger les données de l'exercice
    async function loadExerciseData(uuid: string) {
      if (uuid) {
        loadingExercise = true;
        try {
          const response = await fetch(`/exercice/${uuid}`);
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

    function toggleList() {
        showList = !showList;
    }

    // Instruction réactive pour surveiller les changements dans l'URL
    $: {
  const currentUuid = $page.url.searchParams.get('uuid');
  if (currentUuid && currentUuid !== exerciseUuid) {
    exerciseUuid = currentUuid;
    loadExerciseData(exerciseUuid);
  }
}

    // Fonction pour gérer la sélection dans Liste
    function handleSelect(uuid: string) {
  if (uuid !== exerciseUuid) {
    exerciseUuid = uuid; // Met à jour l'UUID localement
    goto(`?list=${$page.url.searchParams.get('list')}&uuid=${uuid}`, { replaceState: false })
      .then(() => {
        // Assurez-vous que la logique réactive détecte le changement d'URL
        loadExerciseData(uuid);
      });
  }
}


    // Charger l'exercice initial si l'URL contient un uuid
    onMount(() => {
      const initialUuid = get(page).url.searchParams.get('uuid');
      if (initialUuid) {
        exerciseUuid = initialUuid;
        loadExerciseData(exerciseUuid);
      }
    });
</script>

<section class="container">
  <div class="row">
    {#if showList}
    <div class="col-md-4 liste-container">
      <h3>Liste des Exercices</h3>
      <Liste 
      onSelect={handleSelect}
      activeExerciseId={exerciseUuid} 
      />
    </div>
    {/if}
    <div class={`${showList ? "col-md-8" : "col-md-12"} position-relative`}>
    <HideColumnsButton bind:showList />
      
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
        <ExerciceRenderer ExerciceData={exerciseData} />
      {/if}
    </div>
  </div>
</section>

<style>
  .liste-container {
    max-height: calc(100vh - 100px);
    overflow-y: auto;
    padding-bottom: 20px;
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
