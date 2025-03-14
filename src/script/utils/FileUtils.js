/**
 * Utilitaires pour les opérations sur les fichiers et génération d'identifiants
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const fsPromises = fs.promises;

/**
 * Génère un identifiant unique universel (UUID)
 * @returns {string} UUID généré
 */
function generateUniqueId() {
  return crypto.randomUUID();
}

/**
 * Vérifie si un fichier a été modifié depuis une date spécifique
 * @param {string} filePath - Chemin du fichier à vérifier
 * @param {Date} lastModifiedDate - Date de dernière modification à comparer
 * @returns {boolean} true si le fichier a été modifié depuis lastModifiedDate
 */
function isFileModifiedSince(filePath, lastModifiedDate) {
  const stats = fs.statSync(filePath);
  return lastModifiedDate < stats.mtime;
}

/**
 * Crée un répertoire de manière récursive s'il n'existe pas
 * @param {string} dirPath - Chemin du répertoire à créer
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Liste tous les fichiers dans un répertoire correspondant à une extension spécifique
 * @param {string} dirPath - Chemin du répertoire à explorer
 * @param {string} extension - Extension de fichier (avec le point, ex: '.tex')
 * @param {boolean} recursive - Si true, explore aussi les sous-répertoires
 * @returns {Promise<string[]>} Liste des chemins complets des fichiers trouvés
 */
async function findFilesByExtension(dirPath, extension, recursive = true) {
  const foundFiles = [];
  
  async function findFiles(currentPath) {
    const entries = await fsPromises.readdir(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory() && recursive) {
        await findFiles(fullPath);
      } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === extension.toLowerCase()) {
        foundFiles.push(fullPath);
      }
    }
  }
  
  await findFiles(dirPath);
  return foundFiles;
}

/**
 * Donne des informations sur un chemin donné (fichier, répertoire, etc.)
 * @param {string} inputPath - Chemin à évaluer
 * @returns {Object} Informations sur le chemin
 */
function getPathInfo(inputPath) {
  const resolvedPath = path.resolve(inputPath);
  
  if (!fs.existsSync(resolvedPath)) {
    return { exists: false };
  }
  
  const stats = fs.statSync(resolvedPath);
  return {
    exists: true,
    isFile: stats.isFile(),
    isDirectory: stats.isDirectory(),
    basename: path.basename(resolvedPath),
    dirname: path.dirname(resolvedPath),
    extension: path.extname(resolvedPath),
    stats: stats
  };
}

/**
 * Calcule le hash MD5 d'un fichier
 * @param {string} filePath - Chemin du fichier
 * @returns {Promise<string>} - Hash MD5 du fichier
 */
async function calculateFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const stream = fs.createReadStream(filePath);
    
    stream.on('error', err => reject(err));
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

/**
 * Vérifie si un fichier a changé en comparant son hash actuel avec un hash précédent
 * @param {string} filePath - Chemin du fichier
 * @param {string} previousHash - Hash précédent du fichier
 * @returns {Promise<{changed: boolean, hash: string}>} - Indique si le fichier a été modifié et son hash actuel
 */
async function hasFileChanged(filePath, previousHash) {
  try {
    const currentHash = await calculateFileHash(filePath);
    return {
      changed: currentHash !== previousHash,
      hash: currentHash
    };
  } catch (error) {
    console.error(`Erreur lors du calcul du hash pour le fichier ${filePath}:`, error);
    // En cas d'erreur, considérer que le fichier a changé
    return {
      changed: true,
      hash: ''
    };
  }
}

// Exporter les fonctions publiques
export {
  fsPromises,
  generateUniqueId,
  isFileModifiedSince,
  ensureDirectoryExists,
  findFilesByExtension,
  getPathInfo,
  calculateFileHash,
  hasFileChanged
};