<script lang="ts">
  export let isLargeFont: boolean;
  export let onToggle: () => void;
</script>

<button
  class="font-size-toggle"
  on:click={onToggle}
  title={isLargeFont ? "Taille normale" : "Agrandir le texte"}>
  {isLargeFont ? "Taille normale" : "Agrandir le texte"}
</button>

<style>
  .font-size-toggle {
    background-color: #f5f5f5;
    border: none;
    padding: 0.5rem 1rem;
    cursor: pointer;
    font-size: 0.9rem;
  }
  .font-size-toggle:hover {
    background-color: #e0e0e0;
  }
</style>
