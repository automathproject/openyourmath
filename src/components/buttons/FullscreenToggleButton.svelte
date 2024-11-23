<script lang="ts">
  export let isFullscreen: boolean;
  export let onToggle: () => void;
</script>

<button
  class="control-button fullscreen-button"
  on:click={onToggle}
  title={isFullscreen ? "Quitter le plein écran" : "Passer en plein écran"}>
  {#if !isFullscreen}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path
      d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"
    />
  </svg>
{:else}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path
      d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"
    />
  </svg>
{/if}
</button>

<style>
    .control-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: white;
    color: #4a5568;
    cursor: pointer;
    transition: all 0.2s ease;
    height: 40px;
    width: 40px;
  }

  .control-button:hover {
    background: #f7fafc;
    border-color: #cbd5e0;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .control-button:active {
    transform: translateY(0);
  }

  .control-button.active {
    background: #4a5568;
    color: white;
    border-color: #4a5568;
  }

  .fullscreen-button {
    background: #2d3748;
    color: white;
    border-color: #2d3748;
  }

  .fullscreen-button:hover {
    background: #1a202c;
    border-color: #1a202c;
  }
</style>
