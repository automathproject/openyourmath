<!-- src/components/Exercice.svelte -->
<script>
  import { macros } from '../macros';
  import MathRenderer from './MathRenderer.svelte';

  export let ExerciceData;
  const latexTypes = ['texte', 'question', 'reponse'];

  // Variable pour contenir le contenu prétraité
  let processedContenu = [];

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

  {#each processedContenu as item, index (item.key)}
      {#if latexTypes.includes(item.type)}
          {#if item.type === 'question'}
              <div class={item.type}>
                  <strong>Question {item.number} : </strong>
                  <MathRenderer content={item.value} />
              </div>
          {:else}
              <div class={item.type}>
                  <MathRenderer content={item.value} />
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
  