<script lang="ts">
  export let showReponses: boolean;
  export let onToggle: () => void;
</script>

<button
on:click={onToggle}
class="control-button answer-button"
class:active={showReponses}
title={showReponses ? "Masquer les réponses" : "Afficher les réponses"}
>
{#if !showReponses}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
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
      d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
    />
    <line x1="1" y1="1" x2="23" y2="23" />
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



  .answer-button {
    background: #81b87a;
    color: white;
    border-color: #81b87a;
  }

  .answer-button:hover {
    background: #17c700;
    border-color: #17c700;
  }

  .answer-button.active {
    background: #17c700;
    border-color: #17c700;
  }
</style>
