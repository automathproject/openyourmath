import fs from 'fs/promises';
import path from 'path';

const INPUT_DIR = './static/content/json2';
const OUTPUT_FILE = './static/data/exercises.json';
const OUTPUT_INDEX_FILE = './static/data/exercises-index.json';

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
  
  if (lastDoubleDollar !== -1) {
    const doubleDollarMatches = truncated.match(/\$\$/g) || [];
    if (doubleDollarMatches.length % 2 !== 0) {
      safeEnd = Math.min(safeEnd, lastDoubleDollar);
    }
  }
  
  if (lastSingleDollar !== -1) {
    const contentWithoutDoubleDollar = truncated.replace(/\$\$/g, '##');
    const singleDollarCount = (contentWithoutDoubleDollar.match(/\$/g) || []).length;
    if (singleDollarCount % 2 !== 0) {
      safeEnd = Math.min(safeEnd, lastSingleDollar);
    }
  }
  
  if (lastBracketOpen !== -1 && (lastBracketClose === -1 || lastBracketClose < lastBracketOpen)) {
    safeEnd = Math.min(safeEnd, lastBracketOpen);
  }
  
  if (lastParenOpen !== -1 && (lastParenClose === -1 || lastParenClose < lastParenOpen)) {
    safeEnd = Math.min(safeEnd, lastParenOpen);
  }
  
  return content.slice(0, safeEnd) + ' ...';
}

function generatePreview(exercise) {
  // Recherche du premier contenu non vide parmi les descriptions et questions
  const firstContent = exercise.contenu.find(item => 
    (item.type === 'description' || item.type === 'question') && 
    item.value.html?.trim()
  );
  
  if (firstContent) {
    return getPreview(firstContent.value.html);
  }
  
  return '';
}

async function generateExercisesJson() {
  try {
    // Créer le dossier de sortie s'il n'existe pas
    await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
    
    // Lire tous les fichiers du dossier d'entrée
    const files = await fs.readdir(INPUT_DIR);
    const exercises = [];
    console.log(`Found ${files.length} files to process...`);
    
    // Traiter chaque fichier
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const filePath = path.join(INPUT_DIR, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const exercise = JSON.parse(content);
          exercises.push(exercise);
        } catch (error) {
          console.error(`Error processing file ${file}:`, error.message);
        }
      }
    }
    
    // Trier les exercices par titre
    exercises.sort((a, b) => a.titre.localeCompare(b.titre));
    
    // Créer l'objet complet
    const output = {
      metadata: {
        totalCount: exercises.length,
        generatedAt: new Date().toISOString(),
      },
      exercises: exercises
    };
    
    // Créer la version indexée pour la recherche
    const indexOutput = {
      metadata: output.metadata,
      exercises: exercises.map(exercise => ({
        ...exercise,
        preview: generatePreview(exercise),
        contenu: exercise.contenu.map(item => ({
          type: item.type,
          value: {
            latex: item.value.latex
          }
        }))
      }))
    };
    
    // Écrire les fichiers de sortie
    await Promise.all([
      fs.writeFile(
        OUTPUT_FILE,
        JSON.stringify(output, null, 2),
        'utf-8'
      ),
      fs.writeFile(
        OUTPUT_INDEX_FILE,
        JSON.stringify(indexOutput, null, 2),
        'utf-8'
      )
    ]);
    
    console.log(`Successfully generated ${OUTPUT_FILE} and ${OUTPUT_INDEX_FILE}`);
    console.log(`Total exercises: ${exercises.length}`);
    
  } catch (error) {
    console.error('Error generating exercises JSON:', error);
    process.exit(1);
  }
}

// Exécuter le script
generateExercisesJson();