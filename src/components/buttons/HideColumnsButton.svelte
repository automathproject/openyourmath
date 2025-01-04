<script>
    export let showList = false;
  </script>
  
  <div class="toggle-button-container">
    <button
      on:click={() => showList = !showList}
      class="btn btn-primary btn-sm toggle-button"
      aria-label={showList ? "Masquer la colonne" : "Afficher la colonne"}
    >
      <i class="bi bi-chevron-{showList ? 'left' : 'right'} transition"></i>
    </button>
  </div>
  
  <style>
    .toggle-button-container {
      position: absolute;
      left: -12px;
      top: 0;  /* Modifié pour s'adapter au nouveau contexte */
      z-index: 10;
    }
  
    .toggle-button {
      border-radius: 50%;
      width: 24px;
      height: 24px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--bs-primary);
      border: none;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
  
    .toggle-button:hover {
      box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
    }
  
    .toggle-button i {
      font-size: 14px;
      line-height: 1;
      transition: transform 0.3s ease;
    }
  
    .toggle-button:hover i {
      transform: translateX(2px);
    }
  
    @media (max-width: 768px) {
      .toggle-button-container {
        position: static;
        margin-bottom: 1rem;
      }
    }
  </style>