/**
 * Utilitaires pour l'extraction des commandes LaTeX
 */
import { generateUniqueId } from './FileUtils.js';
import { 
  preprocessLatex, 
  stripComments, 
  wrapAlignWithDollar, 
  isCommandCommented,
  convertLaTeXToHTML 
} from './Tex2HtmlUtils.js';
import { 
  extractAndConvertTikzBlocks,
  checkDependencies 
} from './Tikz2SvgUtils.js';
import { generatePreview } from './PreviewUtils.js';

/**
 * Fonction pour extraire et remplacer les blocs TikZ par des identifiants uniques
 * @param {string} latex - Contenu LaTeX
 * @returns {Promise<{modifiedLatex: string, tikzMap: Map<string, string>}>}
 */
async function preprocessTikzBlocks(latex) {
  try {
    const blocks = await extractAndConvertTikzBlocks(latex);
    let modifiedLatex = latex;
    const tikzMap = new Map();

    for (const block of blocks) {
      if (block && block.original) {
        const id = `__TIKZ_${generateUniqueId()}__`;
        tikzMap.set(id, block.svg);
        modifiedLatex = modifiedLatex.replace(block.original, id);
      }
    }

    return { modifiedLatex, tikzMap };
  } catch (error) {
    console.error('Erreur lors du prétraitement des blocs TikZ:', error);
    // En cas d'erreur, retourner le LaTeX original sans modification
    return { modifiedLatex: latex, tikzMap: new Map() };
  }
}

/**
 * Fonction pour restaurer les SVGs dans le HTML
 * @param {string} html - Contenu HTML
 * @param {Map<string, string>} tikzMap - Map des identifiants vers les SVGs
 * @returns {string}
 */
function restoreTikzSvg(html, tikzMap) {
  let result = html;
  for (const [id, svg] of tikzMap.entries()) {
    result = result.replace(id, svg);
  }
  return result;
}

/**
 * Fonction principale pour extraire les commandes LaTeX
 * @param {string} latex - Contenu LaTeX
 * @param {Array} commands - Liste des commandes à extraire
 * @param {string} [fileName="fichier inconnu"] - Nom complet du fichier LaTeX (pour la gestion des erreurs)
 */
async function extractLaTeXCommands(latex, commands, fileName = "fichier inconnu") {
  const extracted = {
    uuid: "",
    titre: "",
    theme: [],
    niveau: "",
    metadata: {},
    contenu: []
  };

  // Vérifier les dépendances TikZ
  const deps = await checkDependencies();
  if (!deps.success) {
    console.warn('Attention: Support TikZ désactivé -', deps.error);
  }

  // Prétraiter les blocs TikZ si les dépendances sont disponibles
  let modifiedLatex = latex;
  let tikzMap = new Map();

  if (deps.success) {
    const { modifiedLatex: processed, tikzMap: blocks } = await preprocessTikzBlocks(latex);
    modifiedLatex = processed;
    tikzMap = blocks;
  }

  // Initialiser les champs uniques
  commands.filter(cmd => !cmd.isContent).forEach(cmd => {
    const keys = cmd.jsonKey.split('.');
    let obj = extracted;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in obj)) {
        obj[keys[i]] = {};
      }
      obj = obj[keys[i]];
    }
    const lastKey = keys[keys.length - 1];
    obj[lastKey] = "";
  });

  // Créer une regex pour toutes les commandes à extraire
  const allCommandNames = commands.map(cmd => cmd.name).join('|');
  const regex = new RegExp(`(?<!\\\\)\\\\(${allCommandNames})\\s*\\{`, 'g');

  let match;
  while ((match = regex.exec(modifiedLatex)) !== null) {
    const commandName = match[1];
    const commandObj = commands.find(cmd => cmd.name === commandName);
    if (!commandObj) continue;

    const matchStart = match.index;
    const lineStart = modifiedLatex.lastIndexOf('\n', matchStart) + 1;
    const lineEnd = modifiedLatex.indexOf('\n', matchStart);
    const line = modifiedLatex.substring(lineStart, lineEnd === -1 ? modifiedLatex.length : lineEnd);
    const commandPosInLine = match.index - lineStart;

    if (isCommandCommented(line, commandPosInLine)) {
      continue;
    }

    let startIndex = match.index + match[0].length;
    let index = startIndex;
    let braceCount = 1;
    let content = '';

    while (braceCount > 0 && index < modifiedLatex.length) {
      const char = modifiedLatex[index];
      if (char === '\\') {
        content += char;
        index++;
        if (index < modifiedLatex.length) {
          content += modifiedLatex[index];
        }
      } else if (char === '{') {
        braceCount++;
        content += char;
      } else if (char === '}') {
        braceCount--;
        if (braceCount > 0) {
          content += char;
        }
      } else {
        content += char;
      }
      index++;
    }

    let finalContent = commandObj.isVerbatim ? content.trim() : stripComments(content.trim());
    if (commandObj.isContent) {
      finalContent = wrapAlignWithDollar(finalContent);
    }

    if (commandObj.isContent) {
      let htmlContent = "";
      // Encapsulation de l'appel à Pandoc pour capter d'éventuelles erreurs
      try {
        htmlContent = await convertLaTeXToHTML(finalContent);
      } catch (error) {
        console.error(`Erreur lors de la conversion LaTeX -> HTML avec pandoc pour le fichier ${fileName} : ${error.message}`);
        // Vous pouvez choisir de renvoyer un contenu d'erreur ou de laisser une chaîne vide
        htmlContent = `<div class="error">Erreur de conversion pour le fichier ${fileName} : ${error.message}</div>`;
      }

      // Restaurer les SVGs dans le HTML si nécessaire
      if (deps.success) {
        htmlContent = restoreTikzSvg(htmlContent, tikzMap);
      }

      const id = generateUniqueId();
      extracted.contenu.push({
        id: id,
        type: commandName === 'texte' ? 'description' : commandName,
        value: {
          latex: finalContent,
          html: htmlContent
        }
      });
    } else {
      const keys = commandObj.jsonKey.split('.');
      let obj = extracted;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in obj)) {
          obj[keys[i]] = {};
        }
        obj = obj[keys[i]];
      }
      const lastKey = keys[keys.length - 1];

      if (lastKey === 'theme') {
        obj[lastKey] = finalContent.split(',').map(s => s.trim());
      } else {
        obj[lastKey] = preprocessLatex(finalContent);
      }
    }
  }

  // Ajouter les timestamps dans metadata
  const now = new Date().toISOString();
  if (!extracted.metadata.createdAt) {
    extracted.metadata.createdAt = now;
  }
  extracted.metadata.updatedAt = now;

  // Générer UUID s'il n'existe pas
  if (!extracted.uuid) {
    extracted.uuid = generateUniqueId();
  }

  // Générer la preview
  extracted.preview = generatePreview(extracted);

  return extracted;
}

// Exporter les fonctions publiques
export {
  extractLaTeXCommands,
  preprocessTikzBlocks,
  restoreTikzSvg
};