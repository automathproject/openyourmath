<!-- src/components/Exercice.svelte -->
<script>
  import { fade } from 'svelte/transition'; // Import de la transition fade
  import MathRenderer from './MathRenderer.svelte';

  export let ExerciceData;
  const latexTypes = ['texte', 'question', 'reponse'];

  // Variable pour contenir le contenu prétraité
  let processedContenu = [];

  // Variable d'état pour contrôler la visibilité des réponses
  let showReponses = false;

  // Fonction pour basculer la visibilité des réponses
  function toggleReponses() {
    showReponses = !showReponses;
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
  <div class="titre">{ExerciceData.titre}</div>
  <div class="theme">{ExerciceData.theme}</div>
  <div class="auteur">{ExerciceData.auteur}</div>
  <div class="date">{ExerciceData.date}</div>
  <div class="organisation">{ExerciceData.organisation}</div>
  
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
                  <MathRenderer content={item.value} />
              </div>
          {:else if item.type === 'reponse'}
              {#if showReponses}
                  <div class={item.type} transition:fade={{ duration: 500 }}>
                      <MathRenderer content={item.value} />
                  </div>
              {/if}
          {/if}
      {:else}
          <div class={item.type}>
              {item.value}
          </div>
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

  .texte, .question, .reponse {
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
    background-color: #1eff00;
    border: none;
    border-radius: 4px;
    color: white;
    cursor: pointer;
    font-size: 1rem;
  }

  .toggle-button:hover {
    background-color: #17c700;
  }
</style>
