const fs = require('fs');
const path = require('path');

const origPath = path.join(__dirname, 'backend', 'routes', 'prospector.js.orig');
const destPath = path.join(__dirname, 'backend', 'routes', 'prospector.js');

// Read the clean original
const rawContent = fs.readFileSync(origPath, 'utf8');
const content = rawContent.replace(/\r\n/g, '\n');
const lines = content.split('\n');
console.log('Clean original total lines:', lines.length);

// Find module.exports line (0-indexed)
let moduleExportsIdx = -1;
for (let i = 0; i < lines.length; i++) {
    if (/^module\.exports/.test(lines[i])) {
        moduleExportsIdx = i;
        break;
    }
}
console.log('module.exports at 0-index:', moduleExportsIdx, '(line', moduleExportsIdx + 1 + ')');

// Everything before module.exports
const beforeLines = lines.slice(0, moduleExportsIdx);
console.log('Keeping', beforeLines.length, 'original lines');

const newEndpoint = [
    '',
    '// POST /api/prospector/importar-csv',
    "router.post('/importar-csv', [auth, esProspector], async (req, res) => {",
    '    try {',
    '        const prospectorId = parseInt(req.usuario.id);',
    '        const { prospectos } = req.body;',
    '        if (!Array.isArray(prospectos) || prospectos.length === 0) {',
    "            return res.status(400).json({ msg: 'No se recibieron prospectos para importar.' });",
    '        }',
    '        let insertados = 0;',
    '        let duplicados = 0;',
    '        let errores = 0;',
    '        for (const p of prospectos) {',
    '            try {',
    '                if (!p.nombres && !p.telefono) { errores++; continue; }',
    '                if (p.telefono) {',
    '                    const existe = await db.prepare(',
    "                        'SELECT id FROM clientes WHERE telefono = ? AND prospectorAsignado = ?'",
    '                    ).get(String(p.telefono).trim(), prospectorId);',
    '                    if (existe) { duplicados++; continue; }',
    '                }',
    "                const nombres = (p.nombres || '').trim();",
    "                const apellidoPaterno = (p.apellidoPaterno || '').trim();",
    "                const apellidoMaterno = (p.apellidoMaterno || '').trim();",
    "                const telefono = String(p.telefono || '').trim();",
    "                const correo = (p.correo || '').trim();",
    "                const empresa = (p.empresa || '').trim();",
    "                const notas = (p.notas || '').trim();",
    '                const ahora = new Date().toISOString();',
    "                const sql = 'INSERT INTO clientes (nombres, apellidoPaterno, apellidoMaterno, telefono, correo, empresa, notas, etapaEmbudo, prospectorAsignado, fechaRegistro, fechaUltimaEtapa) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';",
    '                await db.prepare(sql).run(nombres, apellidoPaterno, apellidoMaterno, telefono, correo, empresa, notas, ' + "'prospecto_nuevo'" + ', prospectorId, ahora, ahora);',
    '                insertados++;',
    '            } catch (err) {',
    "                console.error('Error insertando fila CSV:', err.message);",
    '                errores++;',
    '            }',
    '        }',
    '        res.json({ insertados, duplicados, errores, total: prospectos.length });',
    '    } catch (error) {',
    "        console.error('Error en importar-csv:', error);",
    "        res.status(500).json({ msg: 'Error del servidor al importar CSV', error: error.message });",
    '    }',
    '});',
    '',
    'module.exports = router;'
];

const finalLines = beforeLines.concat(newEndpoint);
const finalContent = finalLines.join('\n');

fs.writeFileSync(destPath, finalContent, 'utf8');
console.log('SUCCESS! Written', finalLines.length, 'lines,', finalContent.length, 'chars to', destPath);
