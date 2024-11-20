<script lang="ts">
    export let metadata;
  
    function formatDate(dateString: string): string {
      const date = new Date(dateString);
      return date.toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
  </script>
  
  <div class="metadata">
    <div class="metadata-group">
      <span class="metadata-item">{metadata.auteur}</span>
      {#if metadata.organisation}
        <span class="metadata-separator">•</span>
        <span class="metadata-item">{metadata.organisation}</span>
      {/if}
      <span class="metadata-separator">•</span>
      <span class="metadata-item">{formatDate(metadata.createdAt)}</span>
    </div>
  </div>
  
  <style>
    .metadata {
      font-size: 0.9rem;
      color: #555;
    }
    .metadata-group {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .metadata-item {
      font-weight: bold;
    }
    .metadata-separator {
      color: #aaa;
    }
  </style>
  