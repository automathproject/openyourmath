<!-- src/routes/exercice/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import Recherche from '../Recherche.svelte';
  import RechercheModules from '../RechercheModules.svelte';
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
  let searchMode: 'themes' | 'modules' = 'themes'; 

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
        <div class="search-sections">
          <div class="search-selector">
            <div class="selector-container">
              <button 
                class="selector-button {searchMode === 'themes' ? 'active' : ''}"
                on:click={() => searchMode = 'themes'}
              >
                Par thèmes
              </button>
              <button 
                class="selector-button {searchMode === 'modules' ? 'active' : ''}"
                on:click={() => searchMode = 'modules'}
              >
                Par modules
              </button>
              <div 
                class="selector-highlight" 
                style="transform: translateX({searchMode === 'themes' ? '0' : '100%'})"
              ></div>
            </div>
          </div>
          
          <div class="search-content" style="min-height: 300px">
            {#if searchMode === 'themes'}
              <Recherche onSelect={handleSelect} />
            {:else}
              <RechercheModules onSelect={handleSelect} />
            {/if}
          </div>
        </div>
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
 /* Styles à mettre dans la balise <style> */
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

.search-sections {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.search-selector {
  margin-bottom: 1rem;
}

.selector-container {
  display: flex;
  position: relative;
  background-color: #f0f0f0;
  padding: 0.25rem;
  border-radius: 8px;
  gap: 0.25rem;
}

.selector-button {
  flex: 1;
  padding: 0.5rem 1rem;
  border: none;
  background: none;
  cursor: pointer;
  position: relative;
  z-index: 1;
  transition: color 0.3s ease;
  border-radius: 6px;
  font-weight: 500;
}

.selector-button.active {
  color: #fff;
}

.selector-highlight {
  position: absolute;
  top: 0.25rem;
  left: 0.25rem;
  width: calc(50% - 0.25rem);
  height: calc(100% - 0.5rem);
  background-color: #007bff;
  border-radius: 6px;
  transition: transform 0.3s ease;
  z-index: 0;
}

.search-content {
  transition: opacity 0.3s ease;
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

  .search-sections {
    padding: 0.5rem;
  }
    
  .selector-button {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
  }
}
</style>
