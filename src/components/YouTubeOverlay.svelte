<!-- src/components/YouTubeOverlay.svelte -->
<script lang="ts">
  import { fade, scale } from "svelte/transition";
  import { quadOut } from "svelte/easing";

  export let youtubeId: string;
  export let onClose: () => void;
</script>

<div class="overlay" transition:fade={{ duration: 300 }}>
  <div class="overlay-content" transition:scale={{ duration: 300, start: 0.8, opacity: 0, easing: quadOut }}>
    <div class="header">
      <button class="close-button" on:click={onClose} title="Fermer la vidéo">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          stroke-width="2" 
          stroke-linecap="round" 
          stroke-linejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <div class="video-container">
      <iframe
        src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
        title="YouTube video player"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.9);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
    backdrop-filter: blur(8px);
  }

  .overlay-content {
    width: 90%;
    max-width: 900px;
    background-color: #0f0f0f;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
  }

  .header {
    display: flex;
    justify-content: flex-end;
    padding: 0.75rem;
    background-color: #0f0f0f;
  }

  .close-button {
    background: transparent;
    border: none;
    color: #aaaaaa;
    cursor: pointer;
    padding: 0.4rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s ease;
  }

  .close-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: white;
  }

  .video-container {
    position: relative;
    padding-bottom: 56.25%; /* Ratio 16:9 */
    height: 0;
    overflow: hidden;
  }

  .video-container iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: none;
  }

  /* Animation plus fluide pour l'overlay */
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes scaleIn {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
</style>