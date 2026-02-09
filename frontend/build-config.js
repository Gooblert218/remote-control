const fs = require('fs');
const path = require('path');

const backendUrl = process.env.BACKEND_URL || 'http://localhost:6741';
const apiKey = process.env.API_KEY || '';

const config = {
    BACKEND_URL: backendUrl,
    API_KEY: apiKey
};

const output = `window.__CONFIG__ = ${JSON.stringify(config, null, 4)};\n`;
const outputPath = path.join(__dirname, 'config.js');

fs.writeFileSync(outputPath, output, 'utf8');
console.log(`Wrote ${outputPath}`);
