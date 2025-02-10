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
  import HideColumnsButton from '../../components/buttons/HideColumnsButton.svelte';
  import { Search } from 'lucide-svelte';

  let inputUuid: string = '';
  let exerciseUuid: string = '';
  let exerciseData: any = null;
  let errorMessage: string = 'Aucun exercice sélectionné';
  let loadingExercise: boolean = false;
  let showList = true;
  $: arrowClass = showList ? 'rotate-180' : '';
  let key = 0;

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
      // Réinitialisation des données avant le chargement
      exerciseData = null;
      await tick();

      // Appel à l'endpoint serveur que vous avez créé dans `/exercice/[uuid]/+server.ts`
      const response = await fetch(`/exercice/${uuid}`);
      if (!response.ok) throw new Error(response.statusText);

      const newData = await response.json();
      console.log('Nouvel exercice:', newData);

      // Vérification de cohérence de l'UUID
      if (newData.uuid !== uuid) {
        console.error(`UUID mismatch: attendu ${uuid}, reçu ${newData.uuid}`);
        throw new Error('UUID mismatch');
      }

      await tick();
      exerciseData = newData;
      key += 1;

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
        const timestamp = Date.now();
        goto(`?uuid=${uuid}&t=${timestamp}`, { replaceState: true });
    }
  }

  $: {
      const currentUuid = $page.url.searchParams.get('uuid');
      const timestamp = $page.url.searchParams.get('t');
      if (currentUuid && currentUuid !== exerciseUuid) {
          exerciseUuid = currentUuid;
          inputUuid = currentUuid;
          loadExerciseData(exerciseUuid);
      }
  }
</script>

<section class="container">
  <div class="row position-relative">
    {#if showList}
      <div class="col-md-4 liste-container">
        <h4>Recherche par thème</h4>
        <Recherche onSelect={handleSelect} />
      </div>
    {/if}
    <div class={`${showList ? "col-md-8" : "col-md-12"} position-relative`}>
      <HideColumnsButton bind:showList />  
      <div class="input-container mb-3">
        <div class="input-group">
          <div class="search-group">
            <input
              type="text"
              bind:value={inputUuid}
              class="form-control fixed-width-input"
              maxlength="4"
              placeholder="Ab62"
              on:keydown={(event) => {
                if (event.key === 'Enter') {
                  handleLoadExercise();
                }
              }}
            />
            <button 
              on:click={handleLoadExercise} 
              class="btn btn-primary btn-icon"
              aria-label="Voir l'exercice">
              <Search size={20} />
            </button>
            <AddButton uuid={exerciseUuid} />
          </div>
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
    <div class="col-12 col-md-3 col-lg-3">
      <CustomList showMobileButton={true} />
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

  .search-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
  }

  .fixed-width-input {
    width: 80px !important;
    min-width: 80px !important;
    font-size: 16px;
    text-align: center;
    letter-spacing: 1px;
  }

  .btn-icon {
    padding: 0.375rem 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  @media (max-width: 768px) {
    .input-group {
      width: 100%;
    }

    .search-group {
      flex-direction: row;
      justify-content: center;
    }

    .fixed-width-input {
      width: 100px !important;
      min-width: 100px !important;
    }

    .btn-icon {
      padding: 0.375rem;
    }
  }
</style>
