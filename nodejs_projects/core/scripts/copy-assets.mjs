// nodejs_projects/core/scripts/copy-assets.mjs
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceAssetPath = path.resolve(__dirname, '../src/services/pdf/playwright-dom-correction.js');
const assetFilename = 'playwright-dom-correction.js';

// Target directory for ESM build
const targetDirEsm = path.resolve(__dirname, '../dist/esm/services/pdf');
// Target directory for CJS build (tsconfig.build.json outDir is ./dist/cjs)
const targetDirCjs = path.resolve(__dirname, '../dist/cjs/services/pdf');

async function copyAssetToDir(targetDir) {
  try {
    await fs.mkdir(targetDir, { recursive: true });
    await fs.copyFile(
      sourceAssetPath,
      path.join(targetDir, assetFilename)
    );
    console.log(`Copied ${assetFilename} to ${targetDir}`);
  } catch (err) {
    console.error(`Error copying ${assetFilename} to ${targetDir}:`, err);
    throw err; // Re-throw to fail the build if copy fails
  }
}

async function main() {
  console.log('Copying assets...');
  try {
    // Copy to the ESM target directory
    await copyAssetToDir(targetDirEsm);

    // Copy to the CJS target directory
    await copyAssetToDir(targetDirCjs);

    console.log('Assets copied successfully.');
  } catch (error) {
    console.error('Failed to copy assets. Build will fail.');
    process.exit(1); // Exit with error code to fail the build script
  }
}

main();