<!-- src/components/Modal.svelte -->
<script lang="ts">
    import { scale } from 'svelte/transition';
    import { createEventDispatcher } from 'svelte';
    
    const dispatch = createEventDispatcher();
    
    export let showModal: boolean = false;
    
    function closeModal() {
      dispatch('close');
    }
  
    // Empêcher la propagation du clic depuis le contenu du modal
    function handleModalContentClick(e: MouseEvent) {
      e.stopPropagation();
    }
  </script>
  
  {#if showModal}
    <div 
      class="modal-backdrop" 
      on:click={closeModal}
      transition:scale={{duration: 200}}
    >
      <div 
        class="modal-content"
        on:click={handleModalContentClick}
      >
        <button class="close-button" on:click={closeModal}>×</button>
        <div class="modal-body">
          <slot />
        </div>
      </div>
    </div>
  {/if}
  
  <style>
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }
  
    .modal-content {
      background-color: white;
      padding: 2rem;
      border-radius: 8px;
      max-width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      position: relative;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
  
    .close-button {
      position: absolute;
      top: 1rem;
      right: 1rem;
      font-size: 1.5rem;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.5rem;
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s;
    }
  
    .close-button:hover {
      background-color: rgba(0, 0, 0, 0.1);
    }
  
    .modal-body {
      margin-top: 1rem;
    }
  </style>