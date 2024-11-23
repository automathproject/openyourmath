<script lang="ts">
  export let isLargeFont: boolean;
  export let onToggle: () => void;
</script>

<button
on:click={onToggle}
class="control-button font-size-button"
class:active={isLargeFont}
title={isLargeFont ? "Taille normale" : "Agrandir le texte"}
>
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="20"
  height="20"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
>
  <text x="4" y="18" font-size="18" font-family="sans-serif">A</text>
  <text x="12" y="18" font-size="12" font-family="sans-serif">A</text>
</svg>
</button>

<style>
/* Style pour le bouton de taille de police */
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
.font-size-button {
  background: #4a5568;
  color: white;
  border-color: #4a5568;
}

.font-size-button:hover {
  background: #2d3748;
  border-color: #2d3748;
}

.font-size-button.active {
  background: #2d3748;
  border-color: #2d3748;
}
</style>
