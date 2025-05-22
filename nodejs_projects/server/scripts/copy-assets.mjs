import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Source is relative to the project root, assuming scripts/ is one level down
const projectRoot = path.join(__dirname, '..'); 
const sourceDir = path.join(projectRoot, 'assets'); // Corrected: server/assets
const targetDir = path.join(projectRoot, 'dist/assets'); // Corrected: server/dist/assets

async function copyAssets() {
    try {
        if (!fs.existsSync(sourceDir)) {
            console.log(`Source assets directory does not exist: ${sourceDir}. Nothing to copy.`);
            // It's okay if it doesn't exist, maybe no assets to copy.
            // However, for fonts, we expect it to exist.
            if (sourceDir.includes('assets/fonts') || fs.readdirSync(sourceDir).includes('fonts')) {
                 console.error(`Critical: Font assets directory expected at ${sourceDir} but not found.`);
            }
            return;
        }
        await fs.ensureDir(targetDir); 
        await fs.copy(sourceDir, targetDir, { overwrite: true });
        console.log(`Assets copied from ${sourceDir} to ${targetDir}`);
    } catch (err) {
        console.error('Error copying assets:', err);
        process.exit(1);
    }
}

copyAssets();