<!-- src/components/AddButton.svelte -->
<!-- bouton d'ajout d'exercice à la liste personnalisée -->
<script lang="ts">
    import { customList, addToCustomList, removeFromCustomList } from '$lib/stores/customList';
    import type { Exercice } from '$lib/types/types';
    import { FilePlus2, FileMinus2 } from 'lucide-svelte';    
    export let uuid: string;
    let exercicesInList: Set<string>;
    
    customList.subscribe(list => {
        exercicesInList = new Set(list.map(ex => ex.uuid));
    });
    
    async function toggleCustomList(event: MouseEvent) {
        event.stopPropagation();
        
        if (exercicesInList.has(uuid)) {
            // Pour retirer, on crée un objet minimal avec juste l'uuid
            removeFromCustomList({ uuid } as Exercice);
        } else {
            const exercise = await getExerciseByUuid(uuid);
            if (exercise) {
                addToCustomList(exercise);
            }
        }
    }
    
    async function getExerciseByUuid(uuid: string): Promise<Exercice | null> {
        try {
            const response = await fetch(`/exercice/${uuid}`);
            if (!response.ok) {
                if (response.status === 404) {
                    console.error(`Exercice ${uuid} non trouvé`);
                    return null;
                }
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            const exercise = await response.json();
            return exercise;
        } catch (error) {
            console.error(`Erreur lors de la récupération de l'exercice ${uuid}:`, error);
            return null;
        }
    }
    </script>
    
    <button
    class="btn-add"
    on:click={toggleCustomList}
    title={exercicesInList.has(uuid) ? "Retirer de ma liste" : "Ajouter à ma liste"}
  >
    {#if exercicesInList.has(uuid)}
      <FileMinus2 size={20} />
    {:else}
      <FilePlus2 size={20} />
    {/if}
  </button>
    
    <style>
    .btn-add {
        position: relative;
        margin-left: 0.5rem;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background-color: #e0e0e0;
        border: none;
        color: #333;
        font-size: 20px;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
        z-index: 1;
    }
    
    .btn-add:hover {
        background-color: #d0d0d0;
        transform: scale(1.1);
    }
    
    .btn-add.added {
        background-color: #333;
        color: #fff;
    }
    </style>