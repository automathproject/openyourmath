<!-- src/components/CustomList.svelte -->
<script lang="ts">
    import { customList, removeFromCustomList } from '$lib/stores/customList';
    import MathRenderer from './MathRenderer.svelte';
    import ListViewButton from './buttons/ListViewButton.svelte';
    import { slide, fade } from 'svelte/transition';
    import { flip } from 'svelte/animate';
    import { ArrowUp, ArrowDown } from 'lucide-svelte';
    import { quintOut } from 'svelte/easing';

    export let showMobileButton = false;
    let showCustomListModal = false;
    let copyConfirmation = false;

    function copyUUIDs() {
        const uuids = $customList.map(ex => ex.uuid).join(', ');
        navigator.clipboard.writeText(uuids).then(() => {
            copyConfirmation = true;
            setTimeout(() => {
                copyConfirmation = false;
            }, 2000);
        });
    }

    let movingItems = new Set();

    // Configuration de l'animation
    const slideConfig = {
    duration: 400, // Un peu plus long pour mieux voir l'effet
    easing: quintOut,
    axis: 'y' // Pour forcer l'animation verticale
};

    // Fonction pour déplacer un élément vers le haut
    function moveUp(index: number) {
    if (index > 0) {
        customList.update(list => {
            const newList = [...list];
            const current = newList[index];
            newList.splice(index, 1);  // Retire l'élément de sa position actuelle
            newList.splice(index - 1, 0, current);  // L'insère à sa nouvelle position
            return newList;
        });
    }
}

function moveDown(index: number) {
    customList.update(list => {
        if (index < list.length - 1) {
            const newList = [...list];
            const current = newList[index];
            newList.splice(index, 1);  // Retire l'élément de sa position actuelle
            newList.splice(index + 1, 0, current);  // L'insère à sa nouvelle position
            return newList;
        }
        return list;
    });
}

    // Variables pour gérer le swipe
    let touchStart = 0;
    let touchY = 0;
    let modalTranslateY = 0;
    
    function handleTouchStart(e: TouchEvent) {
        touchStart = e.touches[0].clientY;
        touchY = e.touches[0].clientY;
    }
    
    function handleTouchMove(e: TouchEvent) {
        touchY = e.touches[0].clientY;
        const delta = touchY - touchStart;
        
        if (delta > 0) {
            modalTranslateY = delta;
            e.preventDefault();
        }
    }
    
    function handleTouchEnd() {
        const delta = touchY - touchStart;
        
        if (delta > 100) {
            showCustomListModal = false;
        }
        
        modalTranslateY = 0;
        touchStart = 0;
        touchY = 0;
    }
</script>

<div class="custom-list-container">
    {#if !showMobileButton}
        <!-- Version desktop -->
        <div class="card custom-list-sticky">
            <div class="card-body">
                <h5 class="card-title">Ma liste d'exercices</h5>
                <div class="d-flex flex-column gap-2 mb-3">
                    <div class="uuid-container">
                        <div class="uuids-list text-muted small">
                            <span class="font-monospace">
                                {$customList.map(ex => ex.uuid).join(', ')}
                            </span>
                        </div>
                        <button 
                            class="btn-copy"
                            on:click={copyUUIDs}
                            title="Copier les UUIDs"
                        >
                            {#if copyConfirmation}
                                ✓
                            {:else}
                                📋
                            {/if}
                        </button>
                    </div>
                    {#if $customList.length > 0}
                        <a 
                            href="/exercice/liste?list={$customList.map(ex => ex.uuid).join(',')}" 
                            class="btn btn-primary btn-sm"
                        >
                            Visualiser la liste personnalisée
                        </a>
                    {/if}
                </div>
                <div class="custom-list-content">
                    {#if $customList.length === 0}
                        <p class="text-muted">
                            Ajoutez des exercices à votre liste en cliquant sur le bouton + à côté de chaque exercice.
                        </p>
                    {:else}
                        <div class="d-flex flex-column gap-2">
                            {#each $customList as exercise, index (exercise.uuid)}
                            <div class="custom-list-item"
                                animate:flip={{
                                    duration: 300,
                                    delay: 0
                                }}>
                                <div class="exercise-content">
                                    <MathRenderer content={exercise.titre}/>
                                </div>
                                <div class="item-controls">
                                    <div class="move-buttons">
                                        {#if index > 0}
                                            <button
                                                class="btn-move"
                                                on:click={() => moveUp(index)}
                                                title="Déplacer vers le haut"
                                            >
                                                <ArrowUp size={16} />
                                            </button>
                                        {/if}
                                        {#if index < $customList.length - 1}
                                            <button
                                                class="btn-move"
                                                on:click={() => moveDown(index)}
                                                title="Déplacer vers le bas"
                                            >
                                                <ArrowDown size={16} />
                                            </button>
                                        {/if}
                                    </div>
                                    <button
                                        class="btn-remove"
                                        on:click={() => removeFromCustomList(exercise)}
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                        {/each}
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    {:else}
        <!-- Version mobile -->
    {#if $customList.length > 0}
        <button 
            class="floating-list-button"
            on:click={() => showCustomListModal = true}
        >
            <span class="list-count">{$customList.length}</span>
            <span class="list-label">Ma liste</span>
        </button>
    {/if}

    <!-- Modal mobile avec gestion du swipe -->
    {#if showCustomListModal}
        <div 
            class="custom-list-modal"
            transition:slide={{duration: 300}}
            on:touchstart={handleTouchStart}
            on:touchmove={handleTouchMove}
            on:touchend={handleTouchEnd}
            style="transform: translateY({modalTranslateY}px);"
        >
            <div class="custom-list-modal-content">
                <!-- Indicateur de swipe -->
                <div class="swipe-indicator"></div>
                
                <div class="custom-list-modal-header">
                    <ListViewButton 
                        href="/exercice/liste?list={$customList.map(ex => ex.uuid).join(',')}"
                        size="md"
                    />
                    <h5>Ma liste d'exercices</h5>
                    <button 
                        class="btn-close"
                        on:click={() => showCustomListModal = false}
                    ></button>
                </div>

                <div class="custom-list-modal-body">
                    {#if $customList.length === 0}
                        <p class="text-muted">
                            Ajoutez des exercices à votre liste en cliquant sur le bouton + à côté de chaque exercice.
                        </p>
                    {:else}
                    <div class="d-flex flex-column gap-2">
                        {#each $customList as exercise, index (exercise.uuid)}
                            <div class="custom-list-item mobile"
                                animate:flip={{
                                    duration: 300,
                                    delay: 0
                                }}>
                                <div class="exercise-info">
                                    <div class="exercise-title">
                                        <MathRenderer content={exercise.titre}/>
                                    </div>
                                    <div class="exercise-uuid">
                                        {exercise.uuid}
                                    </div>
                                </div>
                                <div class="item-controls mobile">
                                    <div class="move-buttons mobile">
                                        {#if index > 0}
                                            <button
                                                class="btn-move"
                                                on:click={() => moveUp(index)}
                                                title="Déplacer vers le haut"
                                            >
                                                <ArrowUp size={18} />
                                            </button>
                                        {/if}
                                        {#if index < $customList.length - 1}
                                            <button
                                                class="btn-move"
                                                on:click={() => moveDown(index)}
                                                title="Déplacer vers le bas"
                                            >
                                                <ArrowDown size={18} />
                                            </button>
                                        {/if}
                                    </div>
                                    <button
                                        class="btn-remove"
                                        on:click={() => removeFromCustomList(exercise)}
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                        {/each}
                    </div>
                    {/if}
                </div>
            </div>
        </div>
    {/if}
    {/if}
</div>


<style>
    /* Layout de base */
    .custom-list-container {
        position: relative;
        height: 100%;
    }

    .custom-list-content {
        max-height: calc(100vh - 240px);
        overflow-y: auto;
        padding-right: 0.5rem;
    }

    .custom-list-sticky {
        position: sticky;
        top: 1rem;
        max-height: calc(100vh - 2rem);
        overflow-y: auto;
        z-index: 1040;
    }

    /* Items de la liste */
    .custom-list-item {
        padding: 0.5rem;
        background-color: #f8f9fa;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        transition: all 0.3s ease;
        transform-origin: center;
        position: relative;
    }

    .custom-list-item:hover {
        background-color: #e9ecef;
    }

    .exercise-content,
    .exercise-info {
        flex: 1;
        min-width: 0;
    }

    .exercise-title {
        margin-bottom: 0.25rem;
    }

    .exercise-uuid {
        font-size: 0.75rem;
        color: #6c757d;
        font-family: monospace;
    }

    /* Contrôles et boutons */
    .item-controls {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .move-buttons {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .move-buttons.mobile {
        flex-direction: row;
    }

    .btn-move {
        background: none;
        border: none;
        color: #6c757d;
        padding: 0.25rem;
        width: 32px;
        height: 32px;
        cursor: pointer;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
    }

    .btn-move:hover {
        background-color: #e9ecef;
        color: #0d6efd;
        transform: scale(1.1);
    }

    .btn-remove {
        background: none;
        border: none;
        color: #dc3545;
        font-size: 20px;
        font-weight: bold;
        padding: 0 6px;
        cursor: pointer;
        opacity: 0.7;
        transition: opacity 0.2s ease;
    }

    .btn-remove:hover {
        opacity: 1;
    }

    /* UUID container */
    .uuid-container {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
    }

    .uuids-list {
        flex: 1;
        font-size: 0.75rem;
        color: #6c757d;
        word-wrap: break-word;
        line-height: 1.2;
        margin-bottom: 1rem;
    }

    .btn-copy {
        background: none;
        border: none;
        color: #6c757d;
        padding: 0.25rem 0.5rem;
        font-size: 1rem;
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.2s ease;
        flex-shrink: 0;
    }

    .btn-copy:hover {
        background-color: #a3bad1;
        color: #212529;
    }

    /* Version mobile */
    .floating-list-button {
        position: fixed;
        bottom: 1rem;
        right: 1rem;
        background: #0d6efd;
        color: white;
        border: none;
        border-radius: 1rem;
        padding: 0.5rem 1rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 1030;
    }

    .list-count {
        font-size: 1.2rem;
        font-weight: bold;
    }

    .list-label {
        font-size: 0.8rem;
    }

    /* Modal mobile */
    .custom-list-modal {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: white;
        border-top-left-radius: 1rem;
        border-top-right-radius: 1rem;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
        z-index: 2001;
    }

    .custom-list-item.mobile {
        padding: 0.75rem;
        background-color: white;
        border: 1px solid #dee2e6;
        margin: 0 -1rem;
        border-left: none;
        border-right: none;
        border-radius: 0;
    }

    .swipe-indicator {
        width: 40px;
        height: 4px;
        background-color: #e0e0e0;
        border-radius: 2px;
        margin: 0.5rem auto;
    }

    .custom-list-modal-content {
        padding-top: 0.5rem;
        background-color: #f8f9fa;
    }

    .custom-list-modal-body {
        max-height: calc(80vh - 100px);
        overflow-y: auto;
        overscroll-behavior: contain;
        padding: 1rem;
        background-color: white;
    }

    .custom-list-modal-header {
        padding: 1rem;
        border-bottom: 1px solid #dee2e6;
        display: flex;
        justify-content: space-between;
        align-items: center;
        position: sticky;
        top: 0;
        background: white;
    }
</style>