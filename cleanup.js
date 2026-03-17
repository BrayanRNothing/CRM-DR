const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/pages/prospector/ProspectorSeguimiento.jsx');
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

// Find the start of the orphaned block: "{/* Cabecera y Estrellas */ }"
const startComment = '    {/* Cabecera y Estrellas */ }';
let startIdx = -1;
for (let i = 978; i < lines.length; i++) {
    if (lines[i].trim().startsWith('{/* Cabecera y Estrellas */')) {
        startIdx = i;
        break;
    }
}

// Find the end: "    }" that closes the second repeated if block ending around line 1299
// We look for the line "    }" that comes before "// VISTA PRINCIPAL"
let endIdx = -1;
for (let i = startIdx; i < lines.length; i++) {
    if (lines[i].includes('// VISTA PRINCIPAL')) {
        endIdx = i - 1;
        break;
    }
}

if (startIdx === -1 || endIdx === -1) {
    console.error('Could not find boundaries. startIdx:', startIdx, 'endIdx:', endIdx);
    process.exit(1);
}

console.log(`Removing lines ${startIdx + 1} to ${endIdx + 1}`);
const newLines = [...lines.slice(0, startIdx), ...lines.slice(endIdx + 1)];
fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
console.log('Done! Orphaned block removed.');
