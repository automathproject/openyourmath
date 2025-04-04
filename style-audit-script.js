/**
 * Script d'audit des styles pour projet SvelteKit
 * 
 * Ce script parcourt récursivement le répertoire du projet pour identifier
 * tous les fichiers contenant du CSS et extraire leur contenu.
 * Il génère un rapport détaillé au format JSON et HTML.
 */

// Import des modules ES
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtient le répertoire actuel en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration - à personnaliser selon votre projet
const CONFIG = {
  rootDir: './src', // Répertoire racine du projet (à ajuster)
  outputFile: './style-audit.json', // Fichier de sortie JSON
  outputHtml: './style-audit.html', // Rapport HTML
  extensions: ['.css', '.scss', '.svelte'], // Extensions à rechercher
  excludeDirs: ['node_modules', '.svelte-kit', 'build', '.git'], // Dossiers à exclure
  // Regex pour extraire les styles des fichiers Svelte
  styleRegex: {
    svelte: /<style[^>]*>([\s\S]*?)<\/style>/g,
    inlineStyle: /style=["']([^"']*)["']/g
  }
};

// Structure pour stocker les résultats
const results = {
  files: [], // Liste des fichiers avec styles
  styleStats: {
    totalFiles: 0,
    totalStyleRules: 0, 
    byExtension: {}
  }
};

/**
 * Analyse un fichier pour en extraire les styles
 */
async function analyzeFile(filePath) {
  const extension = path.extname(filePath);
  const fileContent = await fs.readFile(filePath, 'utf8');
  let styleContent = '';
  let styleCount = 0;
  
  // Traitement selon le type de fichier
  if (extension === '.svelte') {
    // Extraction du style depuis les blocs <style>
    const styleMatches = [...fileContent.matchAll(CONFIG.styleRegex.svelte)];
    if (styleMatches.length > 0) {
      styleContent = styleMatches.map(match => match[1]).join('\n\n/* --- Nouveau bloc style --- */\n\n');
      styleCount = styleMatches.length;
    }
    
    // Recherche styles inline
    const inlineStyles = [...fileContent.matchAll(CONFIG.styleRegex.inlineStyle)];
    if (inlineStyles.length > 0) {
      const inlineStyleContent = inlineStyles.map(match => 
        `/* Style inline trouvé */\n.inline-style {\n  ${match[1].split(';').join(';\n  ')}\n}`
      ).join('\n\n');
      
      styleContent += inlineStyleContent ? '\n\n/* --- Styles inline --- */\n\n' + inlineStyleContent : '';
      styleCount += inlineStyles.length;
    }
  } else {
    // Fichiers CSS/SCSS
    styleContent = fileContent;
    // Estimation approximative du nombre de règles
    styleCount = (fileContent.match(/{/g) || []).length;
  }
  
  if (styleContent.trim()) {
    // Ajouter ce fichier aux résultats
    results.files.push({
      path: filePath,
      extension,
      styleCount,
      content: styleContent
    });
    
    // Mettre à jour les statistiques
    results.styleStats.totalFiles++;
    results.styleStats.totalStyleRules += styleCount;
    
    // Stats par extension
    if (!results.styleStats.byExtension[extension]) {
      results.styleStats.byExtension[extension] = { files: 0, styleRules: 0 };
    }
    results.styleStats.byExtension[extension].files++;
    results.styleStats.byExtension[extension].styleRules += styleCount;
  }
}

/**
 * Parcours récursif du répertoire
 */
async function scanDirectory(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    
    if (entry.isDirectory()) {
      // Ignorer les répertoires exclus
      if (!CONFIG.excludeDirs.includes(entry.name)) {
        await scanDirectory(fullPath);
      }
    } else if (entry.isFile()) {
      const extension = path.extname(entry.name);
      
      if (CONFIG.extensions.includes(extension)) {
        await analyzeFile(fullPath);
      }
    }
  }
}

/**
 * Génère un rapport HTML
 */
function generateHtmlReport() {
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Audit des styles - Projet SvelteKit</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1, h2, h3 { margin-top: 2em; }
    .stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; margin: 2em 0; }
    .stat-card { background: #f5f5f5; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .file-list { margin: 2em 0; }
    .file-card { border: 1px solid #ddd; border-radius: 8px; margin-bottom: 20px; overflow: hidden; }
    .file-header { background: #eee; padding: 10px 15px; cursor: pointer; display: flex; justify-content: space-between; }
    .file-content { height: 0; overflow: hidden; transition: height 0.3s ease-out; }
    .file-content pre { margin: 0; padding: 15px; background: #f8f8f8; overflow-x: auto; }
    .file-content.open { height: auto; max-height: 500px; overflow-y: auto; }
    .toggle-all { margin: 1em 0; padding: 10px 15px; background: #4a5568; color: white; border: none; border-radius: 4px; cursor: pointer; }
    .path { font-family: monospace; word-break: break-all; }
    .count { font-weight: bold; }
  </style>
</head>
<body>
  <h1>Audit des styles - Projet SvelteKit</h1>
  
  <div class="stats">
    <div class="stat-card">
      <h3>Fichiers avec styles</h3>
      <div class="count">${results.styleStats.totalFiles}</div>
    </div>
    <div class="stat-card">
      <h3>Règles CSS estimées</h3>
      <div class="count">${results.styleStats.totalStyleRules}</div>
    </div>
    ${Object.entries(results.styleStats.byExtension).map(([ext, stats]) => `
      <div class="stat-card">
        <h3>Fichiers ${ext}</h3>
        <div class="count">${stats.files}</div>
        <div>${stats.styleRules} règles</div>
      </div>
    `).join('')}
  </div>
  
  <h2>Liste des fichiers (${results.files.length})</h2>
  <button class="toggle-all" id="toggleAll">Afficher/Masquer tous les styles</button>
  
  <div class="file-list">
    ${results.files.map((file, index) => `
      <div class="file-card">
        <div class="file-header" data-index="${index}">
          <div class="path">${file.path}</div>
          <div>${file.styleCount} règles</div>
        </div>
        <div class="file-content" id="content-${index}">
          <pre>${file.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
        </div>
      </div>
    `).join('')}
  </div>
  
  <script>
    document.querySelectorAll('.file-header').forEach(header => {
      header.addEventListener('click', () => {
        const index = header.getAttribute('data-index');
        const content = document.getElementById('content-' + index);
        content.classList.toggle('open');
      });
    });
    
    document.getElementById('toggleAll').addEventListener('click', () => {
      const allContents = document.querySelectorAll('.file-content');
      const shouldOpen = !allContents[0].classList.contains('open');
      
      allContents.forEach(content => {
        if (shouldOpen) {
          content.classList.add('open');
        } else {
          content.classList.remove('open');
        }
      });
    });
  </script>
</body>
</html>
  `;
  
  return html;
}

/**
 * Fonction principale
 */
async function main() {
  console.log(`Démarrage de l'audit des styles dans ${CONFIG.rootDir}...`);
  
  try {
    // Vérifier que le répertoire racine existe
    await fs.stat(CONFIG.rootDir);
    
    // Parcourir les fichiers
    await scanDirectory(CONFIG.rootDir);
    
    // Trier les résultats par chemin
    results.files.sort((a, b) => a.path.localeCompare(b.path));
    
    // Écrire le rapport JSON
    await fs.writeFile(CONFIG.outputFile, JSON.stringify(results, null, 2), 'utf8');
    console.log(`Rapport JSON généré : ${CONFIG.outputFile}`);
    
    // Générer et écrire le rapport HTML
    const htmlReport = generateHtmlReport();
    await fs.writeFile(CONFIG.outputHtml, htmlReport, 'utf8');
    console.log(`Rapport HTML généré : ${CONFIG.outputHtml}`);
    
    // Afficher un résumé
    console.log('\nRésumé:');
    console.log(`- Fichiers avec styles trouvés: ${results.styleStats.totalFiles}`);
    console.log(`- Règles CSS estimées: ${results.styleStats.totalStyleRules}`);
    
    console.log('\nRépartition par extension:');
    Object.entries(results.styleStats.byExtension).forEach(([ext, stats]) => {
      console.log(`- ${ext}: ${stats.files} fichiers, ${stats.styleRules} règles`);
    });
    
    console.log('\nAudit terminé avec succès!');
    
  } catch (error) {
    console.error('Erreur lors de l\'audit:', error);
  }
}

// Exécution
main();
