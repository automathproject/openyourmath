<!-- src/routes/exercice/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import Recherche from '../Recherche.svelte';
  import { tick } from 'svelte';
  import { get } from 'svelte/store';
  import ExerciceRenderer from '../../components/ExerciceRenderer.svelte';
  import CustomList from '../../components/CustomList.svelte';
  import AddButton from '../../components/AddButton.svelte';
  
  let inputUuid: string = '';
  let exerciseUuid: string = '';
  let exerciseData: any = null;
  let errorMessage: string = 'Aucun exercice sélectionné';
  let loadingExercise: boolean = false;
  let showList = true;
  let key = 0; // Clé pour forcer le remontage du composant
  
  import { browser } from '$app/environment';

  function isSmallScreen() {
      return browser && window.innerWidth <= 768;
  }

  async function loadExerciseData(uuid: string) {
      if (!uuid) {
          exerciseData = null;
          errorMessage = 'Aucun exercice sélectionné';
          return;
      }

      loadingExercise = true;
      errorMessage = '';

      try {
          // Nettoyer l'ancien contenu avant le chargement
          exerciseData = null;
          // Incrémenter la clé pour forcer le remontage
          key += 1;
          await tick();

          const response = await fetch(`/content/json2/${uuid}.json`);
          
          if (!response.ok) {
              throw new Error(response.statusText);
          }

          const newData = await response.json();
          await tick();
          exerciseData = newData;
          
          if (isSmallScreen()) {
              showList = false;
          }
      } catch (error: any) {
          exerciseData = null;
          errorMessage = `L'exercice ${uuid} n'a pas pu être chargé.`;
          console.error('Erreur de chargement:', error);
      } finally {
          loadingExercise = false;
      }
  }

  onMount(() => {
      const initialUuid = get(page).url.searchParams.get('uuid');
      if (initialUuid) {
          exerciseUuid = initialUuid;
          inputUuid = initialUuid;
          loadExerciseData(exerciseUuid);
      }

      const handleResize = () => {
          if (exerciseData && isSmallScreen()) {
              showList = false;
          }
      };

      if (browser) {
          window.addEventListener('resize', handleResize);
          return () => {
              window.removeEventListener('resize', handleResize);
          };
      }
  });

  function toggleList() {
      showList = !showList;
  }

  $: {
      const currentUuid = $page.url.searchParams.get('uuid');
      if (currentUuid && currentUuid !== exerciseUuid) {
          exerciseUuid = currentUuid;
          inputUuid = currentUuid;
          loadExerciseData(exerciseUuid);
      }
  }
  
  async function handleLoadExercise() {
      if (inputUuid && inputUuid !== exerciseUuid) {
          goto(`?uuid=${inputUuid}`, { replaceState: false });
      }
  }
  
  async function handleSelect(uuid: string) {
      if (uuid !== exerciseUuid) {
          inputUuid = uuid;
          goto(`?uuid=${uuid}`, { replaceState: false });
      }
  }
</script>

<section class="container">
  <div class="row">
      {#if showList}
      <div class="col-md-4 liste-container">
          <h4>Recherche par thème</h4>
          <Recherche onSelect={handleSelect} />
      </div>
      {/if}
      <div class={showList ? "col-md-8" : "col-md-12"}>
          <button on:click={toggleList} class="btn btn-primary mb-3">
              {showList ? '<<<' : '>>>'}
          </button>
          <div class="input-container mb-3">
            <div class="input-group">
                <input
                    type="text"
                    bind:value={inputUuid}
                    class="form-control"
                    placeholder="Ab62,..."
                    on:keydown={(event) => {
                        if (event.key === 'Enter') {
                            handleLoadExercise();
                        }
                    }}
                />
                <button on:click={handleLoadExercise} class="btn btn-primary">
                    Afficher l'exercice
                </button>
                <AddButton uuid={exerciseUuid} />
            </div>
        </div>
          
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
              <div key={key}>
                  <ExerciceRenderer ExerciceData={exerciseData} />
              </div>
          {/if}
      </div>
      <div class="d-none d-md-block col-md-3 col-lg-3">
        <CustomList showMobileButton={false} />
    </div>
  </div>
</section>

<style>
    .input-container {
        margin-bottom: 1rem;
    }
    
    .input-group {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    @media (max-width: 768px) {
        .input-group {
            flex-direction: column;
            align-items: stretch;
        }
    
        .input-group > * {
            margin-top: 0.5rem;
        }
    
        .input-group > :first-child {
            margin-top: 0;
        }
    }
    </style>