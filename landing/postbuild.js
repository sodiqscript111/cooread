import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const buildDir = path.join(__dirname, 'build');

if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir);
}

fs.copyFileSync(path.join(__dirname, 'server.js'), path.join(buildDir, 'index.js'));
fs.writeFileSync(path.join(buildDir, 'package.json'), JSON.stringify({ type: 'commonjs' }));
console.log('✅ Created build/index.js (CommonJS) wrapper for Brimble deployment.');
