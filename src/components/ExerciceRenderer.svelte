<!-- src/components/ExerciceRenderer.svelte -->
<script lang="ts">
  import { fade, fly, slide, scale } from "svelte/transition";
  import { quadOut } from "svelte/easing";
  import MathRenderer from "./MathRenderer.svelte";
  import ExerciceHeader from "./ExerciceHeader.svelte";
  import ReponsesToggleButton from "./buttons/ReponsesToggleButton.svelte";
  import HintsToggleButton from "./buttons/HintsToggleButton.svelte";
  import FullscreenToggleButton from "./buttons/FullscreenToggleButton.svelte";
  import FontSizeToggleButton from "./buttons/FontSizeToggleButton.svelte";

  export let ExerciceData;
  const latexTypes = ["description", "question", "reponse", "indication"];

  let isLargeFont = false;
  let processedContenu = [];
  let showReponses = false;
  let showHints = false;
  let isFullscreen = false;
  let showMetadata = true;
  let contentKey = 0; // Nouvelle clé pour forcer le remontage

  function resetState() {
    showReponses = false;
    showHints = false;
    contentKey++; // Incrémenter la clé pour forcer le remontage
  }

  // Reset l'état quand ExerciceData change
  $: if (ExerciceData) {
    resetState();
  }

  function toggleMetadata() {
    showMetadata = !showMetadata;
  }

  function toggleReponses() {
    showReponses = !showReponses;
  }

  function toggleHints() {
    showHints = !showHints;
  }

  function toggleFullscreen() {
    isFullscreen = !isFullscreen;
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
      isLargeFont = false;
    }
  }

  function toggleFontSize() {
    isLargeFont = !isLargeFont;
  }

  $: if (ExerciceData) {
    let counter = 0;
    processedContenu = ExerciceData.contenu.map((item, index) => {
      if (item.type === "question") {
        counter += 1;
        return {
          ...item,
          number: counter,
          key: `${ExerciceData.uuid}-${index}-${contentKey}`,
        };
      }
      return {
        ...item,
        key: `${ExerciceData.uuid}-${index}-${contentKey}`,
      };
    });
  } else {
    processedContenu = [];
  }
</script>

<div
  class="exercice-wrapper"
  class:fullscreen={isFullscreen}
  class:large-font={isLargeFont}
  transition:fade={{ duration: 200 }}
>
  <div class="exercice" class:fullscreen={isFullscreen}>
    {#key `${isFullscreen}-${contentKey}`}
      <div
        class="content"
        transition:scale|local={{
          duration: 300,
          start: 0.95,
          opacity: 0,
          easing: quadOut,
        }}
      >
        <div class="header">
          <div class="left-section">
            <div class="titre-container">
              <div class="titre">
                {#key contentKey}
                  <MathRenderer content={ExerciceData.titre} />
                {/key}
              </div>
              <button 
                class="metadata-toggle"
                on:click={toggleMetadata}
                title={showMetadata ? "Masquer les métadonnées" : "Afficher les métadonnées"}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  class:rotated={!showMetadata}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>
      
          {#if showMetadata}
          <ExerciceHeader metadata={ExerciceData.metadata} themes={ExerciceData.theme}/>
          {/if} 
          </div>

          <div class="right-section">
            <div class="button-group">
              <HintsToggleButton
                showHints={showHints}
                onToggle={toggleHints}
              />
              <ReponsesToggleButton
                showReponses={showReponses}
                onToggle={toggleReponses} 
              />
            
              {#if isFullscreen}
                <FontSizeToggleButton
                  isLargeFont={isLargeFont}
                  onToggle={toggleFontSize}
                />
              {/if}
            
              <FullscreenToggleButton
                isFullscreen={isFullscreen}
                onToggle={toggleFullscreen}
              />
            </div>

            <a
              href={`https://github.com/automathproject/openyourmath/blob/main/static/content/latex/${ExerciceData.uuid}.tex`}
              target="_blank"
              class="tex-link"
            >
              {ExerciceData.uuid}.tex
            </a>
          </div>
        </div>

        <!-- Contenu de l'exercice -->
        {#each processedContenu as item (item.key)}
          {#if latexTypes.includes(item.type)}
            {#if item.type === "question"}
              <div class={item.type}>
                <strong>Question {item.number} : </strong>
                {#key item.key}
                  <MathRenderer content={item.value.html} />
                {/key}
              </div>
            {:else if item.type === "reponse"}
              {#if showReponses}
                <div
                  class={item.type}
                  transition:slide={{ duration: 300, easing: quadOut }}
                >
                  {#key item.key}
                    <MathRenderer content={item.value.html} />
                  {/key}
                </div>
              {/if}
            {:else if item.type === "description"}
              <div class={item.type}>
                {#key item.key}
                  <MathRenderer content={item.value.html} />
                {/key}
              </div>
            {:else if item.type === "indication"}
              {#if showHints}
              <div class={item.type} transition:slide={{ duration: 300, easing: quadOut}} >
                {#key item.key}
                  <MathRenderer content={item.value.html} />
                {/key}
              </div>
              {/if}
            {/if}
          {/if}
        {/each}
      </div>
    {/key}
  </div>
</div>

<style>
  /* Layout de base */
  .exercice-wrapper {
    position: relative;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .exercice-wrapper.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  /* Fond avec flou */
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  z-index: 1000;
  overflow-y: auto;
  /* Padding adaptatif */
  padding: clamp(1rem, 5vw, 3rem);
  /* Transition douce */
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.exercice {
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: white;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.exercice.fullscreen {
  max-width: min(900px, 90vw);
  margin: 0 auto;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
  padding: clamp(1.5rem, 3vw, 2.5rem);
  border-radius: 16px;
}

/* Ajout des styles pour petit écran */
@media screen and (max-width: 640px) {
  .exercice.fullscreen {
    max-width: 100%;
    margin: 0;
    padding: 1rem;
    border: none;
    border-radius: 0;
    box-shadow: none;
  }

  .exercice-wrapper.fullscreen {
    padding: 0;
  }
  
}

  /* Header et sections */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.5rem;
    gap: 2rem;
  }

  .left-section {
    flex: 1;
  }

  .right-section {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
  }

  /* Titre */
  .titre-container {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.titre {
  flex: 1;
  font-size: 1.5rem;
  font-weight: bold;
  line-height: 1.3;
}


  /* Metadata */
  .metadata {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.75rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.metadata-toggle {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  color: #6b7280;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  margin-top: 0.25rem; /* Alignement vertical avec le titre */
}

.metadata-toggle:hover {
  color: #374151;
  background-color: #f3f4f6;
}

.metadata-toggle svg {
  transition: transform 0.3s ease;
}

.metadata-toggle svg.rotated {
  transform: rotate(-180deg);
}

/* Groupe de metadata */
.metadata-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.metadata-item {
  color: #4b5563;
  font-weight: 500;
}

.metadata-separator {
  color: #9ca3af;
}

/* Responsive */
@media screen and (max-width: 640px) {
  .metadata {
    gap: 0.5rem;
    padding-bottom: 0.75rem;
  }
  

  
  .metadata-group {
    font-size: 0.75rem;
    gap: 0.5rem;
  }
}

  .theme,
  .auteur,
  .organisation {
    font-size: 1.2rem;
  }

  .date {
    font-size: 1rem;
    font-weight: 500;
    color: #555;
    font-style: italic;
  }

  /* Boutons */
  .button-group {
    display: flex;
    gap: 0.5rem;
  }

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

  .fullscreen-button {
    background: #2d3748;
    color: white;
    border-color: #2d3748;
  }

  .fullscreen-button:hover {
    background: #1a202c;
    border-color: #1a202c;
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

  /* Liens */
  .tex-link {
    text-decoration: none;
    font-size: 0.9rem;
    color: #007bff;
    padding: 0.25rem 0;
  }

  /* Contenu */
  .content {
    transform-origin: center top;
  }

  .description,
  .question,
  .indication,
  .reponse {
    margin-top: 1rem;
    line-height: 1.6;
  }

  .reponse {
    background-color: #d0ecc9;
    padding: 0.5rem;
    border-left: 4px solid #1eff00;
  }

  .indication {
    background-color: #f1ed153b;
    padding: 0.5rem;
    border-left: 4px solid #f1ee15;
  }

/* Nouveau style pour la grande police */
.large-font {
  font-size: 150%;
}

.large-font :global(.titre) {
  font-size: 2.25rem;
}

.large-font :global(.metadata-group) {
  font-size: 1.3rem;
}

.large-font :global(.tag) {
  font-size: 1.3rem;
}




</style>
