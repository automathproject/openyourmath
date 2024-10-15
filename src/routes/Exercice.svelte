<!-- src/components/Exercice.svelte -->
<script>
  import MathRenderer from './MathRenderer.svelte';

  export let ExerciceData;
  const latexTypes = ['texte', 'question', 'reponse'];

  // Nouvelle variable pour contenir le contenu prétraité
  let processedContenu = [];

  // Instruction réactive pour prétraiter les données
  $: if (ExerciceData) {
      let counter = 0;
      processedContenu = ExerciceData.contenu.map(item => {
          if (item.type === 'question') {
              counter += 1;
              return { ...item, number: counter };
          }
          return item;
      });
  }
</script>

<div class="exercice">
  <div class="titre">{ExerciceData.titre}</div>
  <div class="theme">{ExerciceData.theme}</div>
  <div class="auteur">{ExerciceData.auteur}</div>
  <div class="date">{ExerciceData.date}</div>
  <div class="organisation">{ExerciceData.organisation}</div>

  {#each processedContenu as item, index (index)}
      {#if latexTypes.includes(item.type)}
          {#if item.type === 'question'}
              <div class={item.type}>
                  <strong>Question {item.number} : </strong>
                  <MathRenderer content="{item.value}" />
              </div>
          {:else}
              <div class={item.type}>
                  <MathRenderer content="{item.value}" />
              </div>
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
  </style>
  