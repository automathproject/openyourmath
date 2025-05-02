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
  import YouTubeToggleButton from "./buttons/YouTubeToggleButton.svelte";
  import YouTubeOverlay from "./YouTubeOverlay.svelte";

  export let ExerciceData;
  const latexTypes = ["description", "question", "reponse", "indication"];

  let isLargeFont = false;
  let processedContenu = [];
  let showReponses = false;
  let showHints = false;
  let isFullscreen = false;
  let showMetadata = true;
  let contentKey = 0;
  let showYoutubeOverlay = false;
  let currentYoutubeId = "";
  
  // État pour les boutons individuels
  let questionStates = new Map<string, { showReponse: boolean; showIndication: boolean }>();

  function resetState() {
    showReponses = false;
    showHints = false;
    questionStates.clear();
    contentKey++;
  }

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
  
  function openYoutubeOverlay(event) {
    currentYoutubeId = event.detail.youtubeId;
    showYoutubeOverlay = true;
    document.body.style.overflow = "hidden";
  }
  
  function closeYoutubeOverlay() {
    showYoutubeOverlay = false;
    if (!isFullscreen) {
      document.body.style.overflow = "auto";
    }
  }

  function toggleQuestionReponse(questionNumber: number) {
    const key = `q${questionNumber}`;
    const current = questionStates.get(key) || { showReponse: false, showIndication: false };
    questionStates.set(key, { ...current, showReponse: !current.showReponse });
    questionStates = new Map(questionStates);
  }

  function toggleQuestionIndication(questionNumber: number) {
    const key = `q${questionNumber}`;
    const current = questionStates.get(key) || { showReponse: false, showIndication: false };
    questionStates.set(key, { ...current, showIndication: !current.showIndication });
    questionStates = new Map(questionStates);
  }

  function isAlreadyDisplayedWithQuestion(item, contents) {
    // Cherche si cet élément est déjà associé à une question
    for (let i = 0; i < contents.length; i++) {
      const content = contents[i];
      if (content.type === "question") {
        if (content.reponse?.key === item.key || content.indication?.key === item.key) {
          return true;
        }
      }
    }
    return false;
  }

  $: if (ExerciceData) {
    let counter = 0;
    processedContenu = ExerciceData.contenu.map((item, index) => {
      if (item.type === "question") {
        counter += 1;
        
        // Chercher la réponse et l'indication associées
        let nextIndex = index + 1;
        let nextReponse = null;
        let nextIndication = null;
        
        while (nextIndex < ExerciceData.contenu.length) {
          const nextItem = ExerciceData.contenu[nextIndex];
          if (nextItem.type === "question") {
            break; // On a atteint une nouvelle question
          }
          if (nextItem.type === "reponse" && !nextReponse) {
            nextReponse = { ...nextItem, key: `${ExerciceData.uuid}-${nextIndex}-${contentKey}` };
          }
          if (nextItem.type === "indication" && !nextIndication) {
            nextIndication = { ...nextItem, key: `${ExerciceData.uuid}-${nextIndex}-${contentKey}` };
          }
          nextIndex++;
        }
        
        return {
          ...item,
          number: counter,
          key: `${ExerciceData.uuid}-${index}-${contentKey}`,
          reponse: nextReponse,
          indication: nextIndication
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
          <!-- Section titre et métadonnées -->
          <div class="left-section">
            <div class="titre-container">
              <div class="titre">
                {#key contentKey}
                {#if ExerciceData.titre}
                <MathRenderer content={ExerciceData.titre} />
              {:else}
                Exo7 : {ExerciceData.metadata.exo7id}
              {/if}
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
          </div>

          <!-- Section droite avec les boutons plein écran et taille de police -->
          <div class="right-section">
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
        </div>

        <!-- Nouvelle section pour les métadonnées et les boutons de contrôle -->
        {#if showMetadata}
        <div class="metadata-section">
          <div class="metadata-content">
            <ExerciceHeader metadata={ExerciceData.metadata} themes={ExerciceData.metadata.mots_cles} uuid={ExerciceData.uuid}/>
          </div>
          <div class="control-buttons">
            <YouTubeToggleButton 
              youtubeId={ExerciceData.metadata?.youtube}
              on:openVideo={openYoutubeOverlay}
            />
            <HintsToggleButton
              showHints={showHints}
              onToggle={toggleHints}
            />
            <ReponsesToggleButton
              showReponses={showReponses}
              onToggle={toggleReponses} 
            />
          </div>
        </div>
        {/if}

        <!-- Contenu de l'exercice -->
        {#each processedContenu as item (item.key)}
          {#if latexTypes.includes(item.type)}
            {#if item.type === "question"}
              <div class="question-wrapper">
                <div class="question">
                  <div class="question-content">
                    <strong>Question {item.number} : </strong>
                    {#key item.key}
                      <MathRenderer content={item.value.html} />
                    {/key}
                  </div>
                  
                  <div class="question-buttons">
                    {#if item.reponse}
                      <button 
                        class="toggle-btn" 
                        class:active={questionStates.get(`q${item.number}`)?.showReponse}
                        on:click={() => toggleQuestionReponse(item.number)}
                      >
                        {questionStates.get(`q${item.number}`)?.showReponse ? "Masquer" : "Afficher"} réponse
                      </button>
                    {/if}
                    
                    {#if item.indication}
                      <button 
                        class="toggle-btn indication-btn" 
                        class:active={questionStates.get(`q${item.number}`)?.showIndication}
                        on:click={() => toggleQuestionIndication(item.number)}
                      >
                        {questionStates.get(`q${item.number}`)?.showIndication ? "Masquer" : "Afficher"} indication
                      </button>
                    {/if}
                  </div>
                </div>

                {#if item.reponse && (showReponses || questionStates.get(`q${item.number}`)?.showReponse)}
                  <div
                    class="reponse"
                    transition:slide={{ duration: 300, easing: quadOut }}
                  >
                    {#key item.reponse.key}
                      <MathRenderer content={item.reponse.value.html} />
                    {/key}
                  </div>
                {/if}

                {#if item.indication && (showHints || questionStates.get(`q${item.number}`)?.showIndication)}
                  <div
                    class="indication"
                    transition:slide={{ duration: 300, easing: quadOut }}
                  >
                    {#key item.indication.key}
                      <MathRenderer content={item.indication.value.html} />
                    {/key}
                  </div>
                {/if}
              </div>
            {:else if item.type === "description"}
              <div class={item.type}>
                {#key item.key}
                  <MathRenderer content={item.value.html} />
                {/key}
              </div>
            {:else}
              {#if (item.type === "reponse" || item.type === "indication") && !isAlreadyDisplayedWithQuestion(item, processedContenu)}
                {#if item.type === "reponse" && showReponses}
                  <div
                    class={item.type}
                    transition:slide={{ duration: 300, easing: quadOut }}
                  >
                    {#key item.key}
                      <MathRenderer content={item.value.html} />
                    {/key}
                  </div>
                {/if}
                {#if item.type === "indication" && showHints}
                  <div class={item.type} transition:slide={{ duration: 300, easing: quadOut}} >
                    {#key item.key}
                      <MathRenderer content={item.value.html} />
                    {/key}
                  </div>
                {/if}
              {/if}
            {/if}
          {/if}
        {/each}
      </div>
    {/key}
  </div>
</div>

{#if showYoutubeOverlay && currentYoutubeId}
  <YouTubeOverlay youtubeId={currentYoutubeId} onClose={closeYoutubeOverlay} />
{/if}

<style>
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
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(8px);
    z-index: 1000;
    overflow-y: auto;
    padding: clamp(1rem, 5vw, 3rem);
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
    max-width: 750px;
    margin: 0 auto;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
    padding: clamp(1.5rem, 3vw, 2.5rem);
    border-radius: 16px;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
    gap: 2rem;
  }

  .metadata-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e2e8f0;
    margin-bottom: 1.5rem;
  }

  .metadata-content {
    flex: 1;
  }

  .control-buttons {
    display: flex;
    gap: 0.5rem;
    margin-left: 1rem;
  }

  .left-section {
    flex: 1;
  }

  .right-section {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

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

  /* Responsive styles */
  @media screen and (max-width: 640px) {
    .exercice.fullscreen {
      max-width: 100%;
      margin: 0;
      padding: 1rem;
      border: none;
      border-radius: 0;
      box-shadow: none;
    }
    
    .metadata-section {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .control-buttons {
      margin-left: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .right-section {
      flex-wrap: wrap;
    }
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
    margin-top: 0.25rem;
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

  .content {
    transform-origin: center top;
  }

  .description,
  .question-wrapper,
  .indication,
  .reponse {
    margin-top: 1rem;
    line-height: 1.6;
  }

  .question-wrapper {
    background-color: rgba(0, 0, 0, 0.01);
    border-radius: 8px;
    padding: 1rem;
    margin-top: 1.5rem;
  }

  .question {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }

  .question-content {
    flex: 1;
  }

  .question-buttons {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .toggle-btn {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    border: 1px solid #ddd;
    background: white;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.9rem;
  }

  .toggle-btn:hover {
    background: #f3f4f6;
  }

  .toggle-btn.active {
    background: #d0ecc9;
    border-color: #1eff00;
  }

  .toggle-btn.indication-btn.active {
    background: #f1ed153b;
    border-color: #f1ee15;
  }

  .reponse {
    background-color: #d0ecc9;
    padding: 0.5rem;
    border-left: 4px solid #1eff00;
    margin-top: 0.5rem;
  }

  .indication {
    background-color: #f1ed153b;
    padding: 0.5rem;
    border-left: 4px solid #f1ee15;
    margin-top: 0.5rem;
  }

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

  @media screen and (max-width: 640px) {
    .question {
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .question-buttons {
      width: 100%;
      justify-content: flex-start;
      flex-wrap: wrap;
    }
  }
</style>