<!-- src/components/AddButton.svelte -->
<!-- bouton d'ajout d'exercice à la liste personnalisée -->
<script lang="ts">
    import { customList, addToCustomList, removeFromCustomList } from '$lib/stores/customList';
    import type { Exercice } from '$lib/types/types';
    
    export let exercise: Exercice;
    
    let exercicesInList: Set<string>;
    
    customList.subscribe(list => {
        exercicesInList = new Set(list.map(ex => ex.uuid));
    });

    function toggleCustomList(event: MouseEvent) {
        event.stopPropagation();
        if (exercicesInList.has(exercise.uuid)) {
            removeFromCustomList(exercise);
        } else {
            addToCustomList(exercise);
        }
    }
</script>

<button 
    class="btn-add {exercicesInList.has(exercise.uuid) ? 'added' : ''}"
    on:click={toggleCustomList}
    title={exercicesInList.has(exercise.uuid) ? "Retirer de ma liste" : "Ajouter à ma liste"}
>
    {exercicesInList.has(exercise.uuid) ? '−' : '+'}
</button>

<style>
    .btn-add {
        position: absolute;
        right: 1rem;
        top: 1rem;
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