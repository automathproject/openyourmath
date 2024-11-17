<!-- src/components/MathRenderer.svelte -->
<script>
    import { macros } from '../macros';
    import { onMount, afterUpdate } from 'svelte';
    import renderMathInElement from 'katex/contrib/auto-render';
    import 'katex/dist/katex.min.css';
  
    export let content = '';
  
    let mathContainer;

    const renderMath = () => {
      renderMathInElement(mathContainer, {
        delimiters: [
          {left: '$$', right: '$$', display: true},
          {left: '$', right: '$', display: false},
          {left: '\\(', right: '\\)', display: false},
          {left: '\\[', right: '\\]', display: true}
        ],
        throwOnError: false,
        macros: macros
      });
    };
  
    onMount(() => {
      renderMath();
    });
  
    afterUpdate(() => {
      renderMath();
    });
  </script>
  
  <span bind:this={mathContainer}>
    {@html content}
  </span>
  
  <style>
    /* Styles pour les tableaux LaTeX */
    :global(.katex-display) {
        overflow-x: auto;
        overflow-y: hidden;
        padding: 1em 0;
    }

    :global(table) {
        border-collapse: collapse;
        margin: 1em 0;
        min-width: 100%;
    }

    :global(td), :global(th) {
        border: 1px solid #ddd;
        padding: 0.5em;
        text-align: center;
    }

    :global(.array) {
        border: 1px solid #ddd !important;
    }

    :global(.array td), :global(.array th) {
        border: 1px solid #ddd !important;
        padding: 0.3em 0.6em !important;
    }

    /* Style spécifique pour les matrices */
    :global(.matrix) {
        border: none !important;
    }

    :global(.matrix td) {
        padding: 0.2em 0.5em !important;
    }

    /* Style pour les bordures verticales des tableaux */
    :global(.vline) {
        border-left: 1px solid #ddd !important;
    }

    /* Style pour les bordures horizontales des tableaux */
    :global(.hline) {
        border-top: 1px solid #ddd !important;
    }
  </style>