// src/script/PreviewUtils.js

/**
 * Génère une preview d'un contenu en respectant la syntaxe LaTeX
 * @param {string} content - Le contenu à tronquer
 * @param {number} maxLength - La longueur maximale souhaitée
 * @returns {string} La preview tronquée
 */
function getPreview(content, maxLength = 150) {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    
    const truncated = content.slice(0, maxLength);
    const lastDoubleDollar = truncated.lastIndexOf('$$');
    const lastSingleDollar = truncated.lastIndexOf('$');
    const lastBracketOpen = truncated.lastIndexOf('\\[');
    const lastParenOpen = truncated.lastIndexOf('\\(');
    const lastBracketClose = truncated.lastIndexOf('\\]');
    const lastParenClose = truncated.lastIndexOf('\\)');
    
    let safeEnd = maxLength;
    
    // Gestion des double dollars
    if (lastDoubleDollar !== -1) {
      const doubleDollarMatches = truncated.match(/\$\$/g) || [];
      if (doubleDollarMatches.length % 2 !== 0) {
        safeEnd = Math.min(safeEnd, lastDoubleDollar);
      }
    }
    
    // Gestion des dollars simples
    if (lastSingleDollar !== -1) {
      const contentWithoutDoubleDollar = truncated.replace(/\$\$/g, '##');
      const singleDollarCount = (contentWithoutDoubleDollar.match(/\$/g) || []).length;
      if (singleDollarCount % 2 !== 0) {
        safeEnd = Math.min(safeEnd, lastSingleDollar);
      }
    }
    
    // Gestion des crochets
    if (lastBracketOpen !== -1 && (lastBracketClose === -1 || lastBracketClose < lastBracketOpen)) {
      safeEnd = Math.min(safeEnd, lastBracketOpen);
    }
    
    // Gestion des parenthèses
    if (lastParenOpen !== -1 && (lastParenClose === -1 || lastParenClose < lastParenOpen)) {
      safeEnd = Math.min(safeEnd, lastParenOpen);
    }
    
    return content.slice(0, safeEnd) + ' ...';
  }
  
  /**
   * Génère une preview pour un exercice
   * @param {Object} exercise - L'exercice complet
   * @returns {string} La preview générée
   */
  function generatePreview(exercise) {
    const firstContent = exercise.contenu.find(item => 
      (item.type === 'description' || item.type === 'question') && 
      item.value.html?.trim()
    );
    
    if (firstContent) {
      return getPreview(firstContent.value.html);
    }
    
    return '';
  }
  
  export {
    getPreview,
    generatePreview
  };