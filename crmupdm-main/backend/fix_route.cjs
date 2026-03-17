const fs = require('fs');

const filePath = 'routes/prospector.js';
const raw = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
const lines = raw.split('\n');
console.log('Current total lines:', lines.length);

// Find the cut point: first occurrence of importar-csv or module.exports
let cutIdx = lines.length;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].indexOf('importar-csv') !== -1 || /^module\.exports/.test(lines[i])) {
        // Go back to the blank line before
        cutIdx = (i > 0 && lines[i - 1].trim() === '') ? i - 1 : i;
        console.log('Cutting before line', i + 1, '-> cutIdx=', cutIdx);
        break;
    }
}

const clean = lines.slice(0, cutIdx);
console.log('Clean lines kept:', clean.length);

// Build the new endpoint as an array to avoid template literal issues
const E = [];
E.push('');
E.push('// POST /api/prospector/importar-csv');
E.push("router.post('/importar-csv', [auth, esProspector], async (req, res) => {");
E.push('    try {');
E.push('        const prospectorId = parseInt(req.usuario.id);');
E.push('        const { prospectos } = req.body;');
E.push('        if (!Array.isArray(prospectos) || prospectos.length === 0) {');
E.push("            return res.status(400).json({ msg: 'No se recibieron prospectos para importar.' });");
E.push('        }');
E.push('        let insertados = 0;');
E.push('        let duplicados = 0;');
E.push('        let errores = 0;');
E.push('        for (const p of prospectos) {');
E.push('            try {');
E.push('                if (!p.nombres && !p.telefono) { errores++; continue; }');
E.push('                if (p.telefono) {');
E.push("                    const existe = await db.prepare('SELECT id FROM clientes WHERE telefono = ? AND prospectorAsignado = ?').get(String(p.telefono).trim(), prospectorId);");
E.push('                    if (existe) { duplicados++; continue; }');
E.push('                }');
E.push("                const nombres = (p.nombres || '').trim();");
E.push("                const apellidoPaterno = (p.apellidoPaterno || '').trim();");
E.push("                const apellidoMaterno = (p.apellidoMaterno || '').trim();");
E.push("                const telefono = String(p.telefono || '').trim();");
E.push("                const correo = (p.correo || '').trim();");
E.push("                const empresa = (p.empresa || '').trim();");
E.push("                const notas = (p.notas || '').trim();");
E.push('                const ahora = new Date().toISOString();');
E.push("                const sql = 'INSERT INTO clientes (nombres, apellidoPaterno, apellidoMaterno, telefono, correo, empresa, notas, etapaEmbudo, prospectorAsignado, fechaRegistro, fechaUltimaEtapa) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';");
E.push("                await db.prepare(sql).run(nombres, apellidoPaterno, apellidoMaterno, telefono, correo, empresa, notas, 'prospecto_nuevo', prospectorId, ahora, ahora);");
E.push('                insertados++;');
E.push('            } catch (err) {');
E.push("                console.error('Error en fila CSV:', err.message);");
E.push('                errores++;');
E.push('            }');
E.push('        }');
E.push('        res.json({ insertados, duplicados, errores, total: prospectos.length });');
E.push('    } catch (error) {');
E.push("        console.error('Error en importar-csv:', error);");
E.push("        res.status(500).json({ msg: 'Error al importar CSV', error: error.message });");
E.push('    }');
E.push('});');
E.push('');
E.push('module.exports = router;');

const final = clean.concat(E).join('\n');
fs.writeFileSync(filePath, final, 'utf8');

// Verify
const verify = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n').split('\n');
console.log('DONE! Written', verify.length, 'lines');

// Check module.exports count
let modCount = 0;
let impCount = 0;
for (const l of verify) {
    if (/^module\.exports/.test(l)) modCount++;
    if (l.indexOf('importar-csv') !== -1) impCount++;
}
console.log('module.exports count:', modCount, '  importar-csv count:', impCount);
