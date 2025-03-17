/**
 * Utilitaire pour diviser les grands bundles en sous-bundles de taille gérables
 */
import fs from 'fs';
import path from 'path';
import { fsPromises, ensureDirectoryExists } from './FileUtils.js';

interface SplitBundleResult {
  success: boolean;
  count: number;
  error: string | null;
}

/**
 * Divise un bundle en plusieurs sous-bundles de taille limitée
 * @param bundlePath - Chemin du fichier bundle original
 * @param maxEntriesPerBundle - Nombre maximum d'entrées par sous-bundle
 * @returns Résultat de l'opération
 */
async function splitBundle(bundlePath: string, maxEntriesPerBundle: number = 400): Promise<SplitBundleResult> {
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
    const content: string = await fsPromises.readFile(bundlePath, 'utf8');
    const bundle: Record<string, any> = JSON.parse(content);
    const entries: [string, any][] = Object.entries(bundle);
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
      const subBundle: Record<string, any> = {};
      for (const [uuid, data] of subEntries) {
        subBundle[uuid] = data;
      }
      
      // Écrire le sous-bundle
      const subBundlePath = path.join(bundleDir, `${bundleBaseName}-part${i + 1}.json`);
      await fsPromises.writeFile(subBundlePath, JSON.stringify(subBundle, null, 2), 'utf8');
    }

    // Renommer le fichier original
    const originalBackupPath = path.join(bundleDir, `${bundleBaseName}-full.json`);
    await fsPromises.rename(bundlePath, originalBackupPath);

    return {
      success: true,
      count: numBundles,
      error: null
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      count: 0,
      error: `Erreur lors de la division du bundle: ${errorMessage}`
    };
  }
}

export {
  splitBundle
};
