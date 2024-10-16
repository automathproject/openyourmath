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
  
  <div bind:this={mathContainer}>
    {@html content}
  </div>
  
  <style>
    /* Styles spécifiques si nécessaire */
  </style>
  