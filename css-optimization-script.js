/**
 * Script d'optimisation CSS pour projet SvelteKit
 * 
 * Ce script analyse tous les styles du projet et les réorganise selon une architecture
 * plus maintenable en extrayant les variables, les styles communs, et en créant une
 * structure CSS cohérente.
 */

import { promises as fs } from 'fs';
import path from 'path';

// Charger le fichier d'audit des styles
async function loadStyleAudit() {
  try {
    const data = await fs.readFile('style-audit.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Erreur lors du chargement du fichier d\'audit:', error);
    process.exit(1);
  }
}

// Structure pour la nouvelle organisation CSS
const cssStructure = {
  variables: {
    filename: 'src/lib/styles/variables.css',
    content: '/* Variables globales */\n:root {\n'
  },
  base: {
    filename: 'src/lib/styles/base.css',
    content: '/* Styles de base */\n'
  },
  components: {
    path: 'src/lib/styles/components',
    files: {}
  },
  utilities: {
    filename: 'src/lib/styles/utilities.css',
    content: '/* Classes utilitaires */\n'
  },
  layouts: {
    filename: 'src/lib/styles/layouts.css',
    content: '/* Styles de mise en page */\n'
  }
};

// Patterns pour extraire et classer les styles
const patterns = {
  variables: [
    /--([a-zA-Z0-9-_]+):\s*([^;]+);/g,
    /:root\s*{([^}]+)}/g
  ],
  colors: [
    /#[0-9a-fA-F]{3,8}/g,
    /rgba?\([^)]+\)/g,
    /var\(--([a-zA-Z0-9-_]+)\)/g
  ],
  utilities: [
    /\.([a-zA-Z0-9-_]+)\s*{([^}]+)}/g
  ],
  components: [
    /\.([a-zA-Z0-9-_]+)(-[a-zA-Z0-9-_]+)?\s*{([^}]+)}/g
  ],
  layouts: [
    /\.(container|row|col|grid|flex|layout)/g
  ]
};

// Extrait les variables CSS d'un contenu
function extractVariables(content) {
  const variables = {};
  
  // Recherche les définitions de variables CSS
  const variablePattern = /--([a-zA-Z0-9-_]+):\s*([^;]+);/g;
  let match;
  
  while ((match = variablePattern.exec(content)) !== null) {
    const [, name, value] = match;
    variables[name] = value.trim();
  }
  
  return variables;
}

// Identifie les styles communs entre composants
function identifyCommonStyles(styleData) {
  const styleMap = new Map();
  const commonStyles = [];
  
  // Parcourir tous les fichiers pour collecter les styles
  styleData.files.forEach(file => {
    // Extraire les blocs de style
    const styleBlocks = file.content.match(/\s*{[^}]+}/g) || [];
    
    styleBlocks.forEach(block => {
      const trimmedBlock = block.trim();
      if (styleMap.has(trimmedBlock)) {
        styleMap.set(trimmedBlock, styleMap.get(trimmedBlock) + 1);
      } else {
        styleMap.set(trimmedBlock, 1);
      }
    });
  });
  
  // Identifier les styles qui apparaissent plus d'une fois
  for (const [style, count] of styleMap.entries()) {
    if (count > 1) {
      commonStyles.push(style);
    }
  }
  
  return commonStyles;
}

// Classification des sélecteurs CSS
function classifySelector(selector) {
  if (selector.match(/^\.control-button/)) return 'buttons';
  if (selector.match(/^\.btn|button/)) return 'buttons';
  if (selector.match(/^\.tag/)) return 'tags';
  if (selector.match(/^\.card/)) return 'cards';
  if (selector.match(/^\.container|layout|grid|flex/)) return 'layouts';
  if (selector.match(/^\.theme/)) return 'themes';
  if (selector.match(/^\.header|footer/)) return 'layout';
  if (selector.match(/^\.modal/)) return 'modals';
  if (selector.match(/^\.search/)) return 'search';
  if (selector.match(/^\.icon/)) return 'icons';
  if (selector.match(/^\.list/)) return 'lists';
  return 'misc';
}

// Traiter le contenu CSS et l'organiser
function processCssContent(content) {
  // Extraire les variables
  const variables = extractVariables(content);
  let processedContent = content;
  
  // Ajouter les variables au fichier de variables
  Object.entries(variables).forEach(([name, value]) => {
    if (!cssStructure.variables.content.includes(`--${name}:`)) {
      cssStructure.variables.content += `  --${name}: ${value};\n`;
    }
  });
  
  // Classification des règles CSS
  const rules = content.match(/([.#][a-zA-Z0-9-_:.[\]]+(\s+[.#][a-zA-Z0-9-_:.[\]]+)*)\s*{[^}]*}/g) || [];
  
  rules.forEach(rule => {
    const selectorMatch = rule.match(/([.#][a-zA-Z0-9-_:.[\]]+(\s+[.#][a-zA-Z0-9-_:.[\]]+)*)\s*{/);
    if (selectorMatch) {
      const selector = selectorMatch[1].trim();
      const category = classifySelector(selector);
      
      // Ajouter la règle à la catégorie appropriée
      if (category === 'layouts') {
        if (!cssStructure.layouts.content.includes(rule)) {
          cssStructure.layouts.content += `\n${rule}\n`;
        }
      } else if (category === 'misc') {
        if (!cssStructure.utilities.content.includes(rule)) {
          cssStructure.utilities.content += `\n${rule}\n`;
        }
      } else {
        // Composants spécifiques
        if (!cssStructure.components.files[category]) {
          cssStructure.components.files[category] = `/* Styles pour ${category} */\n`;
        }
        
        if (!cssStructure.components.files[category].includes(rule)) {
          cssStructure.components.files[category] += `\n${rule}\n`;
        }
      }
    }
  });
  
  return processedContent;
}

// Créer le fichier principal d'import
function createMainCssFile() {
  let content = `/* Styles globaux générés automatiquement */
@import './variables.css';
@import './base.css';
@import './layouts.css';
@import './utilities.css';

/* Composants */
`;

  // Ajouter les imports pour tous les fichiers de composants
  Object.keys(cssStructure.components.files).forEach(component => {
    content += `@import './components/${component}.css';\n`;
  });

  return content;
}

// Créer les fichiers CSS optimisés
async function createOptimizedCssFiles() {
  try {
    // Finaliser le contenu du fichier variables
    cssStructure.variables.content += '}\n';
    
    // Créer les répertoires nécessaires
    await fs.mkdir(path.dirname(cssStructure.variables.filename), { recursive: true });
    await fs.mkdir(cssStructure.components.path, { recursive: true });
    
    // Écrire les fichiers principaux
    await fs.writeFile(cssStructure.variables.filename, cssStructure.variables.content);
    await fs.writeFile(cssStructure.base.filename, cssStructure.base.content);
    await fs.writeFile(cssStructure.layouts.filename, cssStructure.layouts.content);
    await fs.writeFile(cssStructure.utilities.filename, cssStructure.utilities.content);
    
    // Écrire les fichiers de composants
    for (const [component, content] of Object.entries(cssStructure.components.files)) {
      await fs.writeFile(`${cssStructure.components.path}/${component}.css`, content);
    }
    
    // Créer et écrire le fichier principal d'import
    const mainCssContent = createMainCssFile();
    await fs.writeFile('src/lib/styles/index.css', mainCssContent);
    
    console.log('Structure CSS optimisée créée avec succès.');
  } catch (error) {
    console.error('Erreur lors de la création des fichiers CSS optimisés:', error);
  }
}

// Générer le fichier de rapport d'optimisation
async function generateOptimizationReport(styleData) {
  try {
    const originalStats = styleData.styleStats;
    const optimizedStats = {
      totalFiles: 5 + Object.keys(cssStructure.components.files).length,
      originalFiles: originalStats.totalFiles,
      styleRules: originalStats.totalStyleRules,
      reduction: Math.round((originalStats.totalFiles - (5 + Object.keys(cssStructure.components.files).length)) / originalStats.totalFiles * 100)
    };
    
    const report = {
      originalStructure: originalStats,
      optimizedStructure: optimizedStats,
      newFiles: [
        cssStructure.variables.filename,
        cssStructure.base.filename,
        cssStructure.layouts.filename,
        cssStructure.utilities.filename,
        'src/lib/styles/index.css',
        ...Object.keys(cssStructure.components.files).map(component => `${cssStructure.components.path}/${component}.css`)
      ]
    };
    
    await fs.writeFile('css-optimization-report.json', JSON.stringify(report, null, 2));
    console.log('Rapport d\'optimisation généré avec succès.');
  } catch (error) {
    console.error('Erreur lors de la génération du rapport d\'optimisation:', error);
  }
}

// Mettre à jour les fichiers Svelte pour utiliser la nouvelle structure CSS
async function updateSvelteFiles(styleData) {
  try {
    for (const file of styleData.files) {
      if (file.extension === '.svelte') {
        // Extraire le contenu du fichier sans les styles
        const content = file.content;
        const styleTagRegex = /<style[^>]*>([\s\S]*?)<\/style>/g;
        
        // Remplacer les balises de style par l'import du fichier CSS global
        let updatedContent = content.replace(styleTagRegex, '');
        
        // Ajouter l'import en haut du fichier s'il n'existe pas déjà
        if (!updatedContent.includes("import '../lib/styles/index.css'")) {
          updatedContent = `<script>\n  import '../lib/styles/index.css';\n</script>\n\n${updatedContent}`;
        }
        
        // Écrire le fichier mis à jour
        await fs.writeFile(file.path, updatedContent);
      }
    }
    
    console.log('Fichiers Svelte mis à jour avec succès.');
  } catch (error) {
    console.error('Erreur lors de la mise à jour des fichiers Svelte:', error);
  }
}

// Fonction principale
async function main() {
  try {
    console.log('Début de l\'optimisation CSS...');
    
    // Charger les données d'audit
    const styleData = await loadStyleAudit();
    console.log(`Analyse de ${styleData.styleStats.totalFiles} fichiers contenant ${styleData.styleStats.totalStyleRules} règles de style...`);
    
    // Traiter tous les fichiers CSS
    for (const file of styleData.files) {
      processCssContent(file.content);
    }
    
    // Créer la nouvelle structure CSS
    await createOptimizedCssFiles();
    
    // Mettre à jour les fichiers Svelte
    await updateSvelteFiles(styleData);
    
    // Générer le rapport d'optimisation
    await generateOptimizationReport(styleData);
    
    console.log('Optimisation CSS terminée avec succès!');
  } catch (error) {
    console.error('Erreur lors de l\'optimisation CSS:', error);
  }
}

// Lancer le script
main();
