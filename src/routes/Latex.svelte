<!-- src/components/Latex.svelte -->
<script>
    import { onMount } from 'svelte';
    import katex from 'katex';
    import 'katex/dist/katex.min.css';
  
    export let content = '';
  
    let html = '';
  
    onMount(async () => {
      try {
        // Importer DOMPurify dynamiquement uniquement côté client
        const DOMPurify = (await import('dompurify')).default;
  
        // Déterminer si le contenu doit être rendu en mode display
        const isDisplayMode = content.trim().startsWith('$$');
        
        // Extraire le contenu LaTeX sans les délimiteurs $$ si en mode display
        const latexContent = isDisplayMode
          ? content.trim().slice(2, -2)
          : content;
        
        // Rendre le LaTeX en HTML avec KaTeX
        const rawHtml = katex.renderToString(latexContent, {
          throwOnError: false,
          displayMode: isDisplayMode
        });
        
        // Purifier le HTML généré avec DOMPurify
        html = DOMPurify.sanitize(rawHtml);
      } catch (error) {
        console.error('Erreur de rendu KaTeX:', error);
        html = content; // Afficher le contenu brut en cas d'erreur
      }
    });
  </script>
  
  <span>{@html html}</span>
  