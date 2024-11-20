<script lang="ts">
  export let isFullscreen: boolean;
  export let onToggle: () => void;
</script>

<button
  class="fullscreen-toggle"
  on:click={onToggle}
  title={isFullscreen ? "Quitter le plein écran" : "Mode plein écran"}>
  {isFullscreen ? "Quitter le plein écran" : "Mode plein écran"}
</button>

<style>
  .fullscreen-toggle {
    background-color: #f5f5f5;
    border: none;
    padding: 0.5rem 1rem;
    cursor: pointer;
    font-size: 0.9rem;
  }
  .fullscreen-toggle:hover {
    background-color: #e0e0e0;
  }
</style>
