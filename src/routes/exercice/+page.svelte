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
  $: arrowClass = showList ? 'rotate-180' : '';
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
    <div class="row position-relative">
      {#if showList}
        <div class="col-md-4 liste-container">
          <h4>Recherche par thème</h4>
          <Recherche onSelect={handleSelect} />
        </div>
      {/if}
      <div class={showList ? "col-md-8" : "col-md-12"}>
        <!-- Bouton toggle repositionné -->
        <div class="toggle-button-container">
          <button
            on:click={toggleList}
            class="btn btn-primary btn-sm toggle-button"
            aria-label={showList ? "Masquer la colonne" : "Afficher la colonne"}
          >
            <i class="bi bi-chevron-{showList ? 'left' : 'right'} transition"></i>
          </button>
        </div>
  
        <div class="input-container mb-3">
            <div class="input-group">
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
              <button on:click={handleLoadExercise} class="btn btn-primary btn-sm">
                Voir l'exercice
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
      <div class="col-12 col-md-3 col-lg-3">
        <CustomList showMobileButton={true} />
      </div>
    </div>
  </section>
  
  <style>
    .toggle-button-container {
      position: absolute;
      left: -12px;
      top: 50%;
      transform: translateY(-50%);
      z-index: 10;
    }
  
    .toggle-button {
      border-radius: 50%;
      width: 24px;
      height: 24px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--bs-primary);
      border: none;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
  
    .toggle-button:hover {
      box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
    }
  
    .toggle-button i {
      font-size: 14px;
      line-height: 1;
      transition: transform 0.3s ease;
    }
  
    .toggle-button:hover i {
      transform: translateX(var(--translate-x, 0));
    }
  
    .input-container {
      margin-bottom: 1rem;
    }
  
    .input-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
  
    @media (max-width: 768px) {
      .toggle-button-container {
        left: 0;
        top: 0;
        transform: none;
        position: relative;
        margin-bottom: 1rem;
      }
  
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

    .fixed-width-input {
    width: 80px !important;
    min-width: 80px !important;
    font-size: 16px; /* Empêche le zoom automatique sur iOS */
    text-align: center;
    letter-spacing: 1px;
  }

  @media (max-width: 768px) {
    .input-group {
      flex-direction: column;
      align-items: stretch;
      gap: 0.5rem;
    }

    .fixed-width-input {
      width: 100px !important;
      min-width: 100px !important;
      margin: 0 auto;
    }
  }
  
    .transition {
      transition: all 0.3s ease;
    }
  </style>
  