<!-- src/components/buttons/YouTubeToggleButton.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let youtubeId: string = null;
  
  const dispatch = createEventDispatcher();
  
  function handleClick() {
    dispatch('openVideo', { youtubeId });
  }
</script>

{#if youtubeId}
  <button
    class="youtube-button"
    title="Voir la vidéo"
    on:click={handleClick}
  >
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="16" 
      height="16" 
      viewBox="0 0 24 24" 
      fill="currentColor"
    >
      <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
    </svg>
    <span>Corrigé vidéo</span>
  </button>
{/if}

<style>
  .youtube-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background-color: white;
    color: #282828;
    border: 1px solid #d3d3d3;
    border-radius: 18px;
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.2s ease;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  .youtube-button:hover {
    background-color: #f8f8f8;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .youtube-button svg {
    width: 18px;
    height: 18px;
    color: #ff0000;
  }

  .youtube-button span {
    font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
    font-weight: 600;
  }

  @media (max-width: 640px) {
    .youtube-button span {
      display: none;
    }

    .youtube-button {
      padding: 0.5rem;
    }
  }
</style>