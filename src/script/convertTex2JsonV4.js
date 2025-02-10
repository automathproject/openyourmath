/**
 * Fonction pour traiter récursivement les dossiers
 * @param {string} inputDir - Chemin du dossier d'entrée
 * @param {string} outputBaseDir - Chemin du dossier de sortie de base
 * @param {Array} commandsToExtract - Liste des commandes à extraire
 * @param {Object} options - Options de traitement
 * @returns {Promise<{processed: number, ignored: number}>}
 */
async function processDirectory(inputDir, outputBaseDir, commandsToExtract, options = { update: false }) {
    const stats = {
      processed: 0,
      ignored: 0
    };
  
    try {
      const entries = await fsPromises.readdir(inputDir, { withFileTypes: true });
  
      for (const entry of entries) {
        const inputPath = path.join(inputDir, entry.name);
        
        // Calculer le chemin de sortie relatif
        const relativePath = path.relative(options.originalInputDir || inputDir, inputDir);
        const outputDir = path.join(outputBaseDir, relativePath);
  
        if (entry.isDirectory()) {
          // Traiter récursivement le sous-dossier
          const subStats = await processDirectory(
            inputPath,
            outputBaseDir,
            commandsToExtract,
            { 
              ...options,
              originalInputDir: options.originalInputDir || inputDir
            }
          );
          stats.processed += subStats.processed;
          stats.ignored += subStats.ignored;
        } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.tex') {
          // Créer le dossier de sortie si nécessaire
          if (!fs.existsSync(outputDir)) {
            await fsPromises.mkdir(outputDir, { recursive: true });
          }
  
          // Traiter le fichier
          const wasIgnored = await processFile(inputPath, outputDir, commandsToExtract, options);
          if (wasIgnored) {
            stats.ignored++;
          } else {
            stats.processed++;
          }
        }
      }
    } catch (error) {
      console.error(`Erreur lors du traitement du dossier ${inputDir}:`, error);
    }
  
    return stats;
  }
  
  /**
   * Modification de la fonction principale pour utiliser processDirectory
   */
  async function main() {
    const args = process.argv.slice(2);
  
    if (args.length < 1) {
      console.error("Usage : node convertLaTeXToJSON.js <chemin_du_fichier_ou_répertoire> [chemin_de_sortie] [--update]");
      process.exit(1);
    }
  
    const inputPath = path.resolve(args[0]);
    let outputPath = null;
    let updateMode = false;
  
    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--update') {
        updateMode = true;
      } else {
        outputPath = path.resolve(args[i]);
      }
    }
  
    const commandsToExtract = [
      // Métadonnées de base
      { name: 'uuid', jsonKey: 'uuid', isContent: false, isVerbatim: false },
      { name: 'exo7id', jsonKey: 'metadata.exo7id', isContent: false, isVerbatim: false },
      { name: 'auteur', jsonKey: 'metadata.auteur', isContent: false, isVerbatim: false },
      { name: 'datecreate', jsonKey: 'metadata.createdAt', isContent: false, isVerbatim: false },
      
      // Configuration de l'exercice
      { name: 'isIndication', jsonKey: 'metadata.hasIndication', isContent: false, isVerbatim: false },
      { name: 'isCorrection', jsonKey: 'metadata.hasCorrection', isContent: false, isVerbatim: false },
      
      // Structure et organisation
      { name: 'chapitre', jsonKey: 'metadata.chapitre', isContent: false, isVerbatim: false },
      { name: 'sousChapitre', jsonKey: 'metadata.sousChapitre', isContent: false, isVerbatim: false },
      { name: 'titre', jsonKey: 'titre', isContent: false, isVerbatim: false },
      { name: 'theme', jsonKey: 'theme', isContent: false, isVerbatim: false },
      { name: 'niveau', jsonKey: 'niveau', isContent: false, isVerbatim: false },
      { name: 'organisation', jsonKey: 'metadata.organisation', isContent: false, isVerbatim: false },
      
      // Contenu de l'exercice
      { name: 'texte', jsonKey: 'contenu', isContent: true, isVerbatim: false },
      { name: 'question', jsonKey: 'contenu', isContent: true, isVerbatim: false },
      { name: 'reponse', jsonKey: 'contenu', isContent: true, isVerbatim: false },
      { name: 'indication', jsonKey: 'contenu', isContent: true, isVerbatim: false },
      { name: 'code', jsonKey: 'contenu', isContent: true, isVerbatim: true },
    ];
  
    if (!fs.existsSync(inputPath)) {
      console.error(`Le chemin spécifié n'existe pas : ${inputPath}`);
      process.exit(1);
    }
  
    const stats = fs.statSync(inputPath);
  
    if (stats.isFile()) {
      if (path.extname(inputPath).toLowerCase() !== '.tex') {
        console.error(`Le fichier spécifié n'est pas un fichier .tex : ${inputPath}`);
        process.exit(1);
      }
  
      const outputDir = outputPath ? outputPath : path.dirname(inputPath);
  
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`Répertoire de sortie créé : ${outputDir}`);
      }
  
      await processFile(inputPath, outputDir, commandsToExtract, { update: updateMode });
  
    } else if (stats.isDirectory()) {
      const outputDir = outputPath ? outputPath : inputPath;
  
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`Répertoire de sortie créé : ${outputDir}`);
      }
  
      const { processed, ignored } = await processDirectory(inputPath, outputDir, commandsToExtract, { 
        update: updateMode
      });
  
      if (processed === 0 && ignored === 0) {
        console.log(`Aucun fichier .tex trouvé dans le répertoire et ses sous-dossiers : ${inputPath}`);
      } else {
        console.log(`\nTraitement terminé :`);
        console.log(`- ${processed} fichier${processed > 1 ? 's' : ''} traité${processed > 1 ? 's' : ''}`);
        if (updateMode && ignored > 0) {
          console.log(`- ${ignored} fichier${ignored > 1 ? 's' : ''} ignoré${ignored > 1 ? 's' : ''} car déjà à jour`);
        }
      }
    } else {
      console.error(`Le chemin spécifié n'est ni un fichier ni un répertoire : ${inputPath}`);
      process.exit(1);
    }
  }
  
  main().catch(error => {
    console.error("Une erreur inattendue s'est produite :", error);
    process.exit(1);
  });