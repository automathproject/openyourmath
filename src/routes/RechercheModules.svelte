<!-- src/routes/RechercheModules.svelte -->
<script lang="ts">
    import { onMount } from 'svelte';
    import { slide } from 'svelte/transition';
    import MathRenderer from '../components/MathRenderer.svelte';
  
    export let onSelect: (uuid: string) => void;
  
    interface SousChapitreType {
      code: string;
      description: string;
    }
  
    interface ChapitreType {
      id: number;
      description: string;
      sousChapitres: SousChapitreType[];
    }
  
    interface ModuleType {
      id: number;
      niveau: string;
      description: string;
      chapitres: ChapitreType[];
    }
  
    let exercises: {
      uuid: string;
      titre: string;
      metadata: {
        chapitre?: string;
        sousChapitre?: string;
        [key: string]: any;
      };
      [key: string]: any;
    }[] = [];
    
    let modules: ModuleType[] = [];
    let expandedModules: Set<number> = new Set();
    let expandedChapitres: Set<number> = new Set();
    let expandedSousChapitres: Set<string> = new Set();
    let error: string | null = null;
    let loading: boolean = true;
    let selectedExerciseId: string | null = null;
    let isSelecting = false;
    let moduleChapitreMap = new Map<string, string>();
  
    onMount(async () => {
      try {
        const exercicesResponse = await fetch('/exercice/recherche');
        const modulesResponse = await fetch('/data/modules-chapitres.json');
        
        if (!exercicesResponse.ok || !modulesResponse.ok) {
          const status = !exercicesResponse.ok 
            ? `Exercices: ${exercicesResponse.status}` 
            : `Modules: ${modulesResponse.status}`;
          error = `Erreur lors du chargement des données (${status})`;
          return;
        }
  
        exercises = await exercicesResponse.json();
        modules = await modulesResponse.json();
        
        console.log('Exercices reçus:', exercises);
        // Afficher les chapitres/sous-chapitres uniques dans les exercices
        const chapitresUniques = new Set();
        const sousChapitresUniques = new Set();
        exercises.forEach(ex => {
          if (ex.metadata?.chapitre) chapitresUniques.add(ex.metadata.chapitre);
          if (ex.metadata?.sousChapitre) sousChapitresUniques.add(ex.metadata.sousChapitre);
        });
        console.log('Chapitres uniques dans les exercices:', [...chapitresUniques]);
        console.log('Sous-chapitres uniques dans les exercices:', [...sousChapitresUniques]);
        
        // Afficher les chapitres/sous-chapitres dans modules
        const chapitresModules = new Set();
        const sousChapitresModules = new Set();
        modules.forEach(module => {
          module.chapitres.forEach(chapitre => {
            chapitresModules.add(chapitre.description);
            chapitre.sousChapitres.forEach(sc => {
              sousChapitresModules.add(sc.description);
            });
          });
        });
        console.log('Chapitres dans modules:', [...chapitresModules]);
        console.log('Sous-chapitres dans modules:', [...sousChapitresModules]);
        
        console.log('Exercices reçus:', exercises);
        console.log('Modules reçus:', modules);
        
        // Créer une map des chapitres pour faciliter la correspondance
        modules.forEach(module => {
          module.chapitres.forEach(chapitre => {
            chapitre.sousChapitres.forEach(sousChapitre => {
              moduleChapitreMap.set(sousChapitre.description, sousChapitre.code);
            });
          });
        });
        
        console.log('Map des sous-chapitres:', moduleChapitreMap);
      } catch (err: any) {
        error = `Échec du chargement : ${err.message}`;
        console.error('Erreur détaillée:', err);
      } finally {
        loading = false;
      }
    });
  
    function toggleModule(moduleId: number) {
      if (expandedModules.has(moduleId)) {
        expandedModules.delete(moduleId);
      } else {
        expandedModules.add(moduleId);
      }
      expandedModules = expandedModules;
    }
  
    function toggleChapitre(chapitreId: number) {
      if (expandedChapitres.has(chapitreId)) {
        expandedChapitres.delete(chapitreId);
      } else {
        expandedChapitres.add(chapitreId);
      }
      expandedChapitres = expandedChapitres;
    }
  
    function toggleSousChapitre(code: string) {
      if (expandedSousChapitres.has(code)) {
        expandedSousChapitres.delete(code);
      } else {
        expandedSousChapitres.add(code);
      }
      expandedSousChapitres = expandedSousChapitres;
    }
  
    function getExercicesForSousChapitre(code: string): any[] {
    console.log(`Recherche exercices pour le code ${code}`);
    
    // Trouver le chapitre et le sous-chapitre correspondant au code
    let sousChapitreTrouve = null;
    let chapitreTrouve = null;

    // Recherche dans les modules
    for (const module of modules) {
        for (const chapitre of module.chapitres) {
            const sousChapitre = chapitre.sousChapitres.find(sc => sc.code === code);
            if (sousChapitre) {
                sousChapitreTrouve = sousChapitre;
                chapitreTrouve = chapitre;
                break;
            }
        }
        if (chapitreTrouve) break;
    }

    if (!sousChapitreTrouve || !chapitreTrouve) {
        console.log(`Aucune correspondance trouvée pour le code ${code}`);
        return [];
    }

    // Log des critères de recherche
    console.log('Critères de recherche:', {
        chapitre: chapitreTrouve.description,
        sousChapitre: sousChapitreTrouve.description
    });

    // Filtrer les exercices
    const exercicesTrouves = exercises.filter(ex => {
        if (!ex.metadata?.chapitre || !ex.metadata?.sousChapitre) {
            return false;
        }

        // Log pour le débogage de chaque exercice
        console.log('Comparaison avec exercice:', {
            uuid: ex.uuid,
            chapitreExercice: ex.metadata.chapitre,
            sousChapitrExercice: ex.metadata.sousChapitre,
            matchChapitre: ex.metadata.chapitre === chapitreTrouve.description,
            matchSousChapitre: ex.metadata.sousChapitre === sousChapitreTrouve.description
        });

        return (
            ex.metadata.chapitre === chapitreTrouve.description && 
            ex.metadata.sousChapitre === sousChapitreTrouve.description
        );
    });

    console.log(`${exercicesTrouves.length} exercices trouvés pour ${sousChapitreTrouve.description}`);
    return exercicesTrouves;
}
  
    async function handleClick(uuid: string) {
      if (isSelecting) return;
      try {
        isSelecting = true;
        selectedExerciseId = uuid;
        await onSelect(uuid);
      } finally {
        isSelecting = false;
      }
    }
  </script>
  
  <div class="theme-explorer">
    {#if loading}
      <div class="loading-spinner">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Chargement...</span>
        </div>
      </div>
    {:else if error}
      <div class="alert alert-danger" role="alert">
        {error}
      </div>
    {:else}
      <div class="themes-tree">
        <div class="themes-list">
          {#each modules as module}
            <div class="module-group">
              <button class="theme-button module-button" on:click={() => toggleModule(module.id)}>
                <span class="module-name">{module.niveau} - {module.description}</span>
                <div class="icon-wrapper chevron" class:rotated={expandedModules.has(module.id)}>
                  <svg class="icon-small" viewBox="0 0 24 24">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                  </svg>
                </div>
              </button>
  
              {#if expandedModules.has(module.id)}
                <div class="chapitres" transition:slide|local>
                  {#each module.chapitres as chapitre}
                    <div class="chapitre-group">
                      <button class="theme-button chapitre-button" on:click={() => toggleChapitre(chapitre.id)}>
                        <span class="chapitre-name">{chapitre.description}</span>
                        <div class="theme-right">
                          <span class="badge">{chapitre.sousChapitres.length}</span>
                          <div class="icon-wrapper chevron" class:rotated={expandedChapitres.has(chapitre.id)}>
                            <svg class="icon-small" viewBox="0 0 24 24">
                              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                            </svg>
                          </div>
                        </div>
                      </button>
  
                      {#if expandedChapitres.has(chapitre.id)}
                        <div class="sous-chapitres" transition:slide|local>
                          {#each chapitre.sousChapitres as sousChapitre}
                            <div class="sous-chapitre-group">
                              <button class="theme-button sous-chapitre-button" on:click={() => toggleSousChapitre(sousChapitre.code)}>
                                <span class="sous-chapitre-name">{sousChapitre.description}</span>
                                <div class="theme-right">
                                  <span class="badge">{getExercicesForSousChapitre(sousChapitre.code).length}</span>
                                  <div class="icon-wrapper chevron" class:rotated={expandedSousChapitres.has(sousChapitre.code)}>
                                    <svg class="icon-small" viewBox="0 0 24 24">
                                      <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                                    </svg>
                                  </div>
                                </div>
                              </button>
  
                              {#if expandedSousChapitres.has(sousChapitre.code)}
                                <div class="exercises-list" transition:slide|local>
                                  {#each getExercicesForSousChapitre(sousChapitre.code) as exercise}
                                    <button
                                      class="exercise-item"
                                      class:selected={selectedExerciseId === exercise.uuid}
                                      class:selecting={isSelecting && selectedExerciseId === exercise.uuid}
                                      disabled={isSelecting}
                                      on:click={() => handleClick(exercise.uuid)}
                                    >
                                      <div class="exercise-title">
                                        <MathRenderer content={exercise.titre} />
                                      </div>
                                    </button>
                                  {/each}
                                </div>
                              {/if}
                            </div>
                          {/each}
                        </div>
                      {/if}
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
  
  <style>
    .theme-explorer {
      display: flex;
      flex-direction: column;
      height: 100%;
      max-height: calc(100vh - 200px);
    }
  
    .themes-tree {
      background: #f8f9fa;
      border-radius: 6px;
      border: 1px solid #dee2e6;
      overflow: hidden;
    }
  
    .themes-list {
      max-height: 100%;
      overflow-y: auto;
    }
  
    .theme-button {
      width: 100%;
      text-align: left;
      background: none;
      border: none;
      padding: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      color: #495057;
      font-size: 0.875rem;
      gap: 0.5rem;
    }
  
    .theme-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
  
    .module-button {
      font-weight: 600;
      background-color: #e9ecef;
    }
  
    .chapitre-button {
      padding-left: 1.5rem;
      font-weight: 500;
    }
  
    .sous-chapitre-button {
      padding-left: 3rem;
    }
  
    .module-name, .chapitre-name, .sous-chapitre-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  
    .chevron {
      transition: transform 0.2s ease;
    }
  
    .chevron.rotated {
      transform: rotate(90deg);
    }
  
    .icon-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 16px;
    }
  
    .icon-small {
      width: 16px;
      height: 16px;
      fill: currentColor;
    }
  
    .badge {
      background-color: #e9ecef;
      color: #495057;
      padding: 0.2rem 0.4rem;
      border-radius: 3px;
      font-size: 0.75rem;
      min-width: 2rem;
      text-align: center;
    }
  
    .exercises-list {
      display: flex;
      flex-direction: column;
      padding-left: 4.5rem;
    }
  
    .exercise-item {
      text-align: left;
      background: none;
      border: none;
      padding: 0.5rem;
      color: #495057;
      font-size: 0.875rem;
      cursor: pointer;
      border-radius: 4px;
      width: 100%;
    }
  
    .exercise-item:hover {
      background-color: #e9ecef;
    }
  
    .exercise-item.selected {
      background-color: #e7f1ff;
      color: #0d6efd;
    }
  
    .exercise-item.selecting {
      opacity: 0.7;
      cursor: wait;
    }
  
    .exercise-item:disabled {
      cursor: wait;
    }
  
    .loading-spinner {
      display: flex;
      justify-content: center;
      padding: 2rem;
    }
  
    .themes-list::-webkit-scrollbar {
      width: 4px;
    }
  
    .themes-list::-webkit-scrollbar-track {
      background: #f1f1f1;
    }
  
    .themes-list::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 2px;
    }
  </style>