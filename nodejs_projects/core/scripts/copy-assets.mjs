// nodejs_projects/core/scripts/copy-assets.mjs
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Asset 1: playwright-dom-correction.js
const sourceDomCorrectionJs = path.resolve(__dirname, '../src/services/pdf/playwright-dom-correction.js');
const domCorrectionJsFilename = 'playwright-dom-correction.js';
const targetDirDomCorrectionEsm = path.resolve(__dirname, '../dist/esm/services/pdf');
const targetDirDomCorrectionCjs = path.resolve(__dirname, '../dist/cjs/services/pdf');

// Asset 2: mermaid-themes.css
const sourceMermaidThemesCss = path.resolve(__dirname, '../../../../src/web/mermaid-themes.css'); // Relative to this script's location
const mermaidThemesCssFilename = 'mermaid-themes.css';
const targetDirGeneralAssets = path.resolve(__dirname, '../dist/assets'); // General assets directory under dist

async function copySpecificAsset(sourcePath, targetDir, targetFilename) {
  try {
    await fs.mkdir(targetDir, { recursive: true });
    await fs.copyFile(
      sourcePath,
      path.join(targetDir, targetFilename)
    );
    console.log(`Copied ${targetFilename} to ${targetDir}`);
  } catch (err) {
    console.error(`Error copying ${targetFilename} to ${targetDir}:`, err);
    throw err; // Re-throw to fail the build if copy fails
  }
}

async function main() {
  console.log('Copying assets...');
  try {
    // Copy playwright-dom-correction.js
    await copySpecificAsset(sourceDomCorrectionJs, targetDirDomCorrectionEsm, domCorrectionJsFilename);
    await copySpecificAsset(sourceDomCorrectionJs, targetDirDomCorrectionCjs, domCorrectionJsFilename);

    // Copy mermaid-themes.css to a general assets folder in dist
    // This will create dist/assets/mermaid-themes.css
    await copySpecificAsset(sourceMermaidThemesCss, targetDirGeneralAssets, mermaidThemesCssFilename);

    console.log('Assets copied successfully.');
  } catch (error) {
    console.error('Failed to copy assets. Build will fail.');
    process.exit(1); // Exit with error code to fail the build script
  }
}

main();