<script lang="ts">
  export let showMetadata: boolean;
  export let onToggle: () => void;
</script>

<button
  class="metadata-toggle"
  on:click={onToggle}
  title={showMetadata ? "Masquer les métadonnées" : "Afficher les métadonnées"}>
  {showMetadata ? "Masquer les métadonnées" : "Afficher les métadonnées"}
</button>

<style>
  .metadata-toggle {
    background-color: #f5f5f5;
    border: none;
    padding: 0.5rem 1rem;
    cursor: pointer;
    font-size: 0.9rem;
  }
  .metadata-toggle:hover {
    background-color: #e0e0e0;
  }
</style>
