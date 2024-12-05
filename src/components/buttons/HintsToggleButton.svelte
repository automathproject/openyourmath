<script lang="ts">
    export let showHints: boolean;
    export let onToggle: () => void;
    </script>
    
    <button
      on:click={onToggle}
      class="control-button hint-button"
      class:active={showHints}
      title={showHints ? "Masquer les indications" : "Afficher les indications"}
    >
      {#if !showHints}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12" y2="8"/>
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
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
          <line x1="12" y1="17" x2="12" y2="17"/>
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
    
    .hint-button {
      background: #f1ee15;
      color: black;
      border-color: #f1ed1573;
    }
    
    .hint-button:hover {
      background: #e6e310;
      border-color: #e6e310;
    }
    
    .hint-button.active {
      background: #e6e310;
      border-color: #e6e310;
    }
    </style>