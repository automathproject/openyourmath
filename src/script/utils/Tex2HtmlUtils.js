import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import os from 'os';

const execPromise = util.promisify(exec);

/**
 * Remplace les caractères accentués LaTeX par leurs équivalents Unicode
 * @param {string} latex - Chaîne de caractères LaTeX à prétraiter
 * @returns {string} - Chaîne prétraitée
 */
function preprocessLatex(latex) {
  const replacements = {
    "\\'E": 'É',
    "\\'e": 'é',
    "\\'a": 'á',
    "\\'i": 'í',
    "\\'o": 'ó',
    "\\'u": 'ú',
    "\\'A": 'Á',
    "\\'I": 'Í',
    "\\'O": 'Ó',
    "\\'U": 'Ú'
  };

  let processed = latex;
  for (const [pattern, replacement] of Object.entries(replacements)) {
    const regex = new RegExp(pattern.replace(/[\\]/g, '\\\\'), 'g');
    processed = processed.replace(regex, replacement);
  }
  
  return processed;
}

/**
 * Supprime les commentaires d'une chaîne de caractères LaTeX.
 * Les commentaires commencent par % et s'étendent jusqu'à la fin de la ligne.
 * Les % échappés (e.g., \%) ne sont pas considérés comme des débuts de commentaires.
 * @param {string} str - Chaîne de caractères LaTeX.
 * @returns {string} - Chaîne sans les commentaires non échappés.
 */
function stripComments(str) {
  return str.replace(/(?<!\\)%.*$/gm, '');
}

/**
 * Enveloppe les blocs align* avec des doubles $$.
 * @param {string} content - Le contenu à traiter
 * @returns {string} - Le contenu avec les blocs align* enveloppés de $$
 */
function wrapAlignWithDollar(content) {
  return content.replace(
    /\\begin\{align\*\}([\s\S]*?)\\end\{align\*\}/g, 
    '$$$\\begin{align*}$1\\end{align*}$$$'
  );
}

/**
 * Vérifie si une commande est commentée sur la même ligne.
 * @param {string} line - La ligne de texte LaTeX
 * @param {number} commandPosInLine - Position du début de la commande dans la ligne
 * @returns {boolean} - True si la commande est commentée
 */
function isCommandCommented(line, commandPosInLine) {
  for (let i = 0; i < commandPosInLine; i++) {
    if (line[i] === '%' && (i === 0 || line[i - 1] !== '\\')) {
      return true;
    }
  }
  return false;
}

/**
 * Convertit du LaTeX en HTML en utilisant Pandoc.
 * @param {string} latex - Chaîne de caractères en LaTeX
 * @returns {Promise<string>} - Chaîne de caractères en HTML
 */
async function convertLaTeXToHTML(latex) {
  try {
    const latexPreprocessed = preprocessLatex(latex);
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'latex-convert-'));
    const tempInputPath = path.join(tempDir, 'temp_input.tex');
    const tempOutputPath = path.join(tempDir, 'temp_output.html');

    // Écrire le LaTeX dans un fichier temporaire
    fs.writeFileSync(tempInputPath, latexPreprocessed, 'utf8');

    // Exécuter Pandoc pour convertir le LaTeX en HTML
    const command = `pandoc "${tempInputPath}" -f latex+smart -t html --css=styles.css --mathjax -o "${tempOutputPath}"`;
    await execPromise(command);

    // Lire le fichier HTML généré
    const html = fs.readFileSync(tempOutputPath, 'utf8');

    // Nettoyer les fichiers temporaires
    fs.unlinkSync(tempInputPath);
    fs.unlinkSync(tempOutputPath);
    fs.rmdirSync(tempDir);

    return html;
  } catch (error) {
    console.error('Erreur lors de la conversion avec Pandoc :', error);
    return ''; 
  }
}

export {
  preprocessLatex,
  stripComments,
  wrapAlignWithDollar,
  isCommandCommented,
  convertLaTeXToHTML
};