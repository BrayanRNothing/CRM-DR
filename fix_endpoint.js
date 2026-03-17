const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'backend', 'routes', 'prospector.js');
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

// Find importar-csv block start and module.exports line
let importarStart = -1;
let moduleExportsLine = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('importar-csv') && importarStart === -1) importarStart = i;
    if (/^module\.exports/.test(lines[i])) moduleExportsLine = i;
}

console.log(`importarStart=${importarStart}, moduleExportsLine=${moduleExportsLine}, total=${lines.length}`);

// Keep lines before the broken endpoint
const before = lines.slice(0, importarStart).join('\n');

// Clean endpoint using only regular strings (no template literals)
const newEndpoint = `
// POST /api/prospector/importar-csv
router.post('/importar-csv', [auth, esProspector], async (req, res) => {
    try {
        const prospectorId = parseInt(req.usuario.id);
        const { prospectos } = req.body;

        if (!Array.isArray(prospectos) || prospectos.length === 0) {
            return res.status(400).json({ msg: 'No se recibieron prospectos para importar.' });
        }

        let insertados = 0;
        let duplicados = 0;
        let errores = 0;

        for (const p of prospectos) {
            try {
                if (!p.nombres && !p.telefono) { errores++; continue; }

                if (p.telefono) {
                    const existe = await db.prepare(
                        'SELECT id FROM clientes WHERE telefono = ? AND prospectorAsignado = ?'
                    ).get(p.telefono.toString().trim(), prospectorId);
                    if (existe) { duplicados++; continue; }
                }

                const nombres = (p.nombres || '').trim();
                const apellidoPaterno = (p.apellidoPaterno || '').trim();
                const apellidoMaterno = (p.apellidoMaterno || '').trim();
                const telefono = (p.telefono || '').toString().trim();
                const correo = (p.correo || '').trim();
                const empresa = (p.empresa || '').trim();
                const notas = (p.notas || '').trim();
                const ahora = new Date().toISOString();
                const insertSql = 'INSERT INTO clientes (nombres, apellidoPaterno, apellidoMaterno, telefono, correo, empresa, notas, etapaEmbudo, prospectorAsignado, fechaRegistro, fechaUltimaEtapa) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

                await db.prepare(insertSql).run(
                    nombres, apellidoPaterno, apellidoMaterno, telefono,
                    correo, empresa, notas, 'prospecto_nuevo',
                    prospectorId, ahora, ahora
                );
                insertados++;
            } catch (err) {
                console.error('Error insertando prospecto del CSV:', err.message);
                errores++;
            }
        }

        res.json({ insertados, duplicados, errores, total: prospectos.length });
    } catch (error) {
        console.error('Error en importar-csv:', error);
        res.status(500).json({ msg: 'Error del servidor al importar CSV', error: error.message });
    }
});

module.exports = router;
`;

const final = before + '\n' + newEndpoint;
fs.writeFileSync(filePath, final, 'utf8');
console.log('Done! Final length:', final.length, 'chars');
