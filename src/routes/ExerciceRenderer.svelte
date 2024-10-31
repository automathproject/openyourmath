<!-- src/components/Exercice.svelte -->
<script>
    import { fade, fly, slide, scale } from 'svelte/transition'; // Import de plusieurs transitions
    import MathRenderer from './MathRenderer.svelte';
  
    export let ExerciceData;
    const latexTypes = ['description', 'question', 'reponse'];
  
    // Variable pour contenir le contenu prétraité
    let processedContenu = [];
  
    // Variable d'état pour contrôler la visibilité des réponses
    let showReponses = false;
  
    // Fonction pour basculer la visibilité des réponses
    function toggleReponses() {
      showReponses = !showReponses;
    }
  
    // Instruction réactive pour réinitialiser showReponses lorsqu'ExerciceData change
    $: if (ExerciceData) {
      showReponses = false; // Réinitialiser à masquer les réponses
    }
  
    // Instruction réactive pour prétraiter les données
    $: if (ExerciceData) {
      console.log('ExerciceData reçu:', ExerciceData);
      let counter = 0;
      processedContenu = ExerciceData.contenu.map((item, index) => {
        if (item.type === 'question') {
          counter += 1;
          return { 
            ...item, 
            number: counter, 
            key: `${ExerciceData.uuid}-${index}` // Clé unique générée
          };
        }
        return { 
          ...item, 
          key: `${ExerciceData.uuid}-${index}` // Clé unique générée
        };
      });
      console.log('processedContenu:', processedContenu);
    } else {
      processedContenu = [];
      console.log('ExerciceData est null ou undefined');
    }
  </script>
  
  <div class="exercice">
    <div class="titre-container">
      <div class="titre">{ExerciceData.titre}</div>
      <a
        href={`https://github.com/automathproject/openyourmath/blob/main/static/content/latex/${ExerciceData.uuid}.tex`}
        target="_blank"
        class="tex-link"
      >
      {ExerciceData.uuid}.tex
      </a>
    </div>  <div class="tags"> <span class="tag">{ExerciceData.theme} </span></div>
    <div class="auteur">{ExerciceData.metadata.auteur}</div>
    <div class="date">{ExerciceData.metadata.createdAt}</div>
    <div class="organisation">{ExerciceData.metadata.organisation}</div>
    
    <!-- Bouton pour afficher/masquer les réponses -->
    <button on:click={toggleReponses} class="toggle-button">
      {#if showReponses}
        Masquer les réponses
      {:else}
        Afficher les réponses
      {/if}
    </button>
  
    {#each processedContenu as item, index (item.key)}
      {#if latexTypes.includes(item.type)}
        {#if item.type === 'question'}
          <div class={item.type}>
            <strong>Question {item.number} : </strong>
            <MathRenderer content={item.value.html} />
          </div>
        {:else if item.type === 'reponse'}
          {#if showReponses}
            <div class={item.type} transition:slide={{ duration: 500 }}>
              <MathRenderer content={item.value.html} />
            </div>
          {/if}
        {:else if item.type === 'description'}
          <div class={item.type}>
            <MathRenderer content={item.value.html} />
          </div>
        {/if}    
      {/if}
      {/each}
  </div>
  
  <style>
    .exercice {
      /* Styles pour le conteneur de l'exercice */
      padding: 1rem;
      border: 1px solid #ccc;
      border-radius: 8px;
    }
  
    .titre {
      font-size: 1.5rem;
      font-weight: bold;
      margin-bottom: 0.5rem;
    }
  
    .theme, .auteur, .date, .organisation {
      font-size: 1.2rem;
      margin-bottom: 0.25rem;
    }
  
    .description, .question, .reponse {
      margin-top: 1rem;
      line-height: 1.6;
    }
  
    .question {
      font-weight: normal;
    }
  
    .reponse {
      background-color: #d0ecc9;
      padding: 0.5rem;
      border-left: 4px solid #1eff00;
    }
  
    /* Styles pour le bouton */
    .toggle-button {
      margin: 1rem 0;
      padding: 0.5rem 1rem;
      background-color: #81b87a;
      border: none;
      border-radius: 4px;
      color: white;
      cursor: pointer;
      font-size: 1rem;
    }
  
    .toggle-button:hover {
      background-color: #17c700;
    }
  
    .titre-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .titre {
    flex: 1;
  }
  
  .tex-link {
    text-decoration: none;
    margin-left: 1rem;
    font-size: 0.9rem;
    color: #007bff;
  }
  
  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .tag {
    background-color: #e0e0e0; /* Couleur de fond du tag */
    color: #333; /* Couleur du description du tag */
    padding: 5px 10px; /* Espacement autour du description */
    border-radius: 15px; /* Coins arrondis pour un effet de badge */
    font-size: 14px; /* Taille de la police */
    font-weight: 500; /* Épaisseur du description */
    display: inline-block;
    cursor: pointer;
    transition: background-color 0.3s ease, color 0.3s ease;
  }
  
  .tag:hover {
    background-color: #333; /* Couleur de fond au survol */
    color: #fff; /* Couleur du description au survol */
  }
  
  </style>
  