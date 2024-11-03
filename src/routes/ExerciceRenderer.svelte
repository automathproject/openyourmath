<!-- src/components/Exercice.svelte -->
<script lang="ts">
  import { fade, fly, slide, scale } from "svelte/transition";
  import { quadOut } from "svelte/easing";
  import MathRenderer from "./MathRenderer.svelte";

  export let ExerciceData;
  const latexTypes = ["description", "question", "reponse"];

  let processedContenu = [];
  let showReponses = false;
  let isFullscreen = false;

  function toggleReponses() {
    showReponses = !showReponses;
  }

  function toggleFullscreen() {
    isFullscreen = !isFullscreen;
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }

  $: if (ExerciceData) {
    showReponses = false;
  }

  $: if (ExerciceData) {
    let counter = 0;
    processedContenu = ExerciceData.contenu.map((item, index) => {
      if (item.type === "question") {
        counter += 1;
        return {
          ...item,
          number: counter,
          key: `${ExerciceData.uuid}-${index}`,
        };
      }
      return {
        ...item,
        key: `${ExerciceData.uuid}-${index}`,
      };
    });
  } else {
    processedContenu = [];
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }
</script>

<div
  class="exercice-wrapper"
  class:fullscreen={isFullscreen}
  transition:fade={{ duration: 200 }}
>
  <div class="exercice" class:fullscreen={isFullscreen}>
    {#key isFullscreen}
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
            <div class="titre">
              <MathRenderer content={ExerciceData.titre} />
            </div>
            <!-- Structure des metadata -->
            <div class="metadata">
              <div class="tags">
                {#each ExerciceData.theme as theme}
                  <span class="tag">{theme}</span>
                {/each}
              </div>

              <div class="metadata-group">
                <span class="metadata-item">{ExerciceData.metadata.auteur}</span
                >
                {#if ExerciceData.metadata.organisation}
                  <span class="metadata-separator">•</span>
                  <span class="metadata-item"
                    >{ExerciceData.metadata.organisation}</span
                  >
                {/if}
                <span class="metadata-separator">•</span>
                <div class="date">
                  {formatDate(ExerciceData.metadata.createdAt)}
                </div>
              </div>
            </div>
          </div>

          <div class="right-section">
            <div class="button-group">
              <button
                on:click={toggleReponses}
                class="control-button answer-button"
                class:active={showReponses}
                title={showReponses
                  ? "Masquer les réponses"
                  : "Afficher les réponses"}
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

              <button
                on:click={toggleFullscreen}
                class="control-button fullscreen-button"
                title={isFullscreen
                  ? "Quitter le plein écran"
                  : "Mode plein écran"}
              >
                {#if !isFullscreen}
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
                      d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"
                    />
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
                      d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"
                    />
                  </svg>
                {/if}
              </button>
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

        <!-- Le reste du contenu -->
        {#each processedContenu as item, index (item.key)}
          {#if latexTypes.includes(item.type)}
            {#if item.type === "question"}
              <div class={item.type}>
                <strong>Question {item.number} : </strong>
                <MathRenderer content={item.value.html} />
              </div>
            {:else if item.type === "reponse"}
              {#if showReponses}
                <div
                  class={item.type}
                  transition:slide={{ duration: 300, easing: quadOut }}
                >
                  <MathRenderer content={item.value.html} />
                </div>
              {/if}
            {:else if item.type === "description"}
              <div class={item.type}>
                <MathRenderer content={item.value.html} />
              </div>
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
    background: rgba(255, 255, 255, 0.98);
    z-index: 1000;
    overflow-y: auto;
    padding: 2rem;
  }

  .exercice {
    padding: 1.5rem;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    background: white;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .exercice.fullscreen {
    max-width: 800px;
    margin: 0 auto;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
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
  .titre {
    font-size: 1.5rem;
    font-weight: bold;
    line-height: 1.3;
    margin-bottom: 0.75rem;
  }

  /* Metadata */
  .metadata {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.metadata-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.metadata-item {
  font-size: 1.2rem;
  color: #4a5568;
}

  .metadata-separator {
    color: #9ca3af;
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
  .reponse {
    margin-top: 1rem;
    line-height: 1.6;
  }

  .reponse {
    background-color: #d0ecc9;
    padding: 0.5rem;
    border-left: 4px solid #1eff00;
  }
</style>
