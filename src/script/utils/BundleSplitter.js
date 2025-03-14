/**
 * Utilitaire pour diviser les grands bundles en sous-bundles de taille gérables
 */
import fs from 'fs';
import path from 'path';
import { fsPromises, ensureDirectoryExists } from './FileUtils.js';

/**
 * Divise un bundle en plusieurs sous-bundles de taille limitée
 * @param {string} bundlePath - Chemin du fichier bundle original
 * @param {number} maxEntriesPerBundle - Nombre maximum d'entrées par sous-bundle
 * @returns {Promise<{success: boolean, count: number, error: string|null}>} - Résultat de l'opération
 */
async function splitBundle(bundlePath, maxEntriesPerBundle = 400) {
  try {
    // Vérifier si le bundle existe
    if (!fs.existsSync(bundlePath)) {
      return {
        success: false,
        count: 0,
        error: `Le bundle ${bundlePath} n'existe pas`
      };
    }

    // Charger le bundle
    const content = await fsPromises.readFile(bundlePath, 'utf8');
    const bundle = JSON.parse(content);
    const entries = Object.entries(bundle);
    const totalEntries = entries.length;

    // Si le bundle est déjà assez petit, ne rien faire
    if (totalEntries <= maxEntriesPerBundle) {
      return {
        success: true,
        count: 1,
        error: null
      };
    }

    // Calculer le nombre de sous-bundles nécessaires
    const numBundles = Math.ceil(totalEntries / maxEntriesPerBundle);
    const bundleBaseName = path.basename(bundlePath, '.json');
    const bundleDir = path.dirname(bundlePath);

    // Créer les sous-bundles
    for (let i = 0; i < numBundles; i++) {
      const start = i * maxEntriesPerBundle;
      const end = Math.min(start + maxEntriesPerBundle, totalEntries);
      const subEntries = entries.slice(start, end);
      
      // Créer un objet pour le sous-bundle
      const subBundle = {};
      for (const [uuid, data] of subEntries) {
        subBundle[uuid] = data;
      }
      
      // Écrire le sous-bundle
      const subBundlePath = path.join(bundleDir, `${bundleBaseName}-part${i+1}.json`);
      await fsPromises.writeFile(subBundlePath, JSON.stringify(subBundle, null, 2), 'utf8');
    }

    // Si la division est réussie, renommer l'original
    const originalBackupPath = path.join(bundleDir, `${bundleBaseName}-full.json`);
    await fsPromises.rename(bundlePath, originalBackupPath);

    return {
      success: true,
      count: numBundles,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      count: 0,
      error: `Erreur lors de la division du bundle: ${error.message}`
    };
  }
}

export {
  splitBundle
};