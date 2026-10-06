import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, 'dist');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

function copyFileSafe(src, dest) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${path.basename(src)} -> dist/`);
  }
}

function copyDirSafe(src, dest) {
  if (fs.existsSync(src)) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        copyDirSafe(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
    console.log(`Copied ${path.basename(src)}/ -> dist/${path.basename(dest)}/`);
  }
}

// Copy index.json, hq.png, assets, tilesets to dist
copyFileSafe(path.resolve(__dirname, 'index.json'), path.join(distDir, 'index.json'));
copyFileSafe(path.resolve(__dirname, 'hq.png'), path.join(distDir, 'hq.png'));
copyDirSafe(path.resolve(__dirname, 'assets'), path.join(distDir, 'assets'));
copyDirSafe(path.resolve(__dirname, 'tilesets'), path.join(distDir, 'tilesets'));

console.log('✓ All static assets synced to dist/ successfully.');
