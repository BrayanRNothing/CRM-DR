const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { auth, esSuperUser } = require('../middleware/auth');
const { toMongoFormat } = require('../lib/helpers');

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const normalizePhone = (value) => String(value || '').replace(/\D/g, '');

const getOwnerId = (cliente) => parseInt(
    cliente?.propietarioId ?? cliente?.prospectorAsignado ?? cliente?.vendedorAsignado ?? 0,
    10
);

const isShared = (cliente) => cliente?.compartido === true || cliente?.compartido === 1 || cliente?.compartido === '1';

const canReadCliente = (cliente, usuarioId, equipoId) => {
    if (getOwnerId(cliente) === usuarioId) return true;
    if (!isShared(cliente)) return false;
    if (!equipoId || !cliente?.equipo_id) return false;
    return String(cliente.equipo_id) === String(equipoId);
};

const canWriteCliente = (cliente, usuarioId) => getOwnerId(cliente) === usuarioId;

router.get('/', auth, esSuperUser, async (req, res) => {
    try {
        const { estado, busqueda } = req.query;
        const equipoId = req.usuario.equipo_id;
        let sql = 'SELECT c.*, u.nombre as vendedorNombre FROM clientes c JOIN usuarios u ON c.vendedorAsignado = u.id WHERE 1=1';
        const params = [];

        // Filtrar por equipo
        if (equipoId) {
            sql += ' AND c."equipo_id" = ?';
            params.push(equipoId);
        }
        if (estado) {
            sql += ' AND c.estado = ?';
            params.push(estado);
        }
        if (busqueda) {
            sql += ' AND (c.nombres LIKE ? OR c.apellidoPaterno LIKE ? OR c.empresa LIKE ?)';
            const like = '%' + busqueda + '%';
            params.push(like, like, like);
        }
        sql += ' ORDER BY c.ultimaInteraccion DESC';

        const rows = await db.prepare(sql).all(...params);
        const clientes = rows.map(r => {
            const { vendedorNombre, ...c } = r;
            const out = toMongoFormat(c);
            if (out) out.vendedorAsignado = { nombre: vendedorNombre };
            return out || c;
        });
        res.json(clientes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

router.get('/duplicados', auth, esSuperUser, async (req, res) => {
    try {
        const campo = String(req.query.campo || 'ambos').toLowerCase();
        const equipoId = req.usuario.equipo_id;

        let sql = 'SELECT id, nombres, apellidoPaterno, telefono, correo, empresa, estado, "equipo_id" FROM clientes WHERE 1=1';
        const params = [];

        if (equipoId) {
            sql += ' AND "equipo_id" = ?';
            params.push(equipoId);
        }

        const clientes = await db.prepare(sql).all(...params);
        const grupos = [];

        const pushGroupsBy = (fieldName, normalizer, minLen = 1) => {
            const map = new Map();

            clientes.forEach((c) => {
                const key = normalizer(c[fieldName]);
                if (!key || key.length < minLen) return;
                if (!map.has(key)) map.set(key, []);
                map.get(key).push(c);
            });

            Array.from(map.entries())
                .filter(([, list]) => list.length > 1)
                .forEach(([valor, list]) => {
                    grupos.push({
                        campo: fieldName,
                        valor,
                        total: list.length,
                        clientes: list.map((c) => ({
                            id: c.id,
                            nombre: `${c.nombres || ''} ${c.apellidoPaterno || ''}`.trim(),
                            telefono: c.telefono,
                            correo: c.correo,
                            empresa: c.empresa,
                            estado: c.estado
                        }))
                    });
                });
        };

        if (campo === 'correo' || campo === 'ambos') {
            pushGroupsBy('correo', normalizeEmail, 3);
        }
        if (campo === 'telefono' || campo === 'ambos') {
            pushGroupsBy('telefono', normalizePhone, 7);
        }

        grupos.sort((a, b) => b.total - a.total);

        res.json({ campo, totalGrupos: grupos.length, grupos });
    } catch (error) {
        console.error('Error al detectar duplicados:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

router.post('/fusionar-duplicados', auth, esSuperUser, async (req, res) => {
    try {
        const principalId = parseInt(req.body.principalId, 10);
        const duplicadoIdsRaw = Array.isArray(req.body.duplicadoIds) ? req.body.duplicadoIds : [];
        const duplicadoIds = [...new Set(duplicadoIdsRaw
            .map((x) => parseInt(x, 10))
            .filter((x) => Number.isInteger(x) && x > 0 && x !== principalId))];

        if (!principalId || duplicadoIds.length === 0) {
            return res.status(400).json({ mensaje: 'Debe enviar principalId y al menos un duplicado válido' });
        }

        const principal = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(principalId);
        if (!principal) {
            return res.status(404).json({ mensaje: 'Cliente principal no encontrado' });
        }

        const equipoId = req.usuario.equipo_id;
        if (equipoId && principal.equipo_id && String(principal.equipo_id) !== String(equipoId)) {
            return res.status(403).json({ mensaje: 'No tienes acceso al cliente principal' });
        }

        const placeholders = duplicadoIds.map(() => '?').join(', ');
        const duplicados = await db.prepare(`SELECT * FROM clientes WHERE id IN (${placeholders})`).all(...duplicadoIds);

        if (duplicados.length !== duplicadoIds.length) {
            return res.status(404).json({ mensaje: 'Uno o más clientes duplicados no existen' });
        }

        const invalidTeam = duplicados.find((d) => equipoId && d.equipo_id && String(d.equipo_id) !== String(equipoId));
        if (invalidTeam) {
            return res.status(403).json({ mensaje: 'Uno o más duplicados no pertenecen a tu equipo' });
        }

        const pickValue = (field) => {
            const current = principal[field];
            if (current !== null && current !== undefined && String(current).trim() !== '') return current;
            const candidate = duplicados.find((d) => d[field] !== null && d[field] !== undefined && String(d[field]).trim() !== '');
            return candidate ? candidate[field] : current;
        };

        const mergeHistorial = () => {
            const all = [];
            const pushHist = (raw) => {
                if (!raw) return;
                try {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) all.push(...parsed);
                } catch (_) {
                    // Ignorar historial corrupto sin romper la fusión
                }
            };

            pushHist(principal.historialEmbudo);
            duplicados.forEach((d) => pushHist(d.historialEmbudo));
            all.sort((a, b) => new Date(a.fecha || 0) - new Date(b.fecha || 0));
            return all.length ? JSON.stringify(all) : principal.historialEmbudo;
        };

        const notasUnificadas = [principal.notas, ...duplicados.map((d) => d.notas)]
            .filter((x) => typeof x === 'string' && x.trim())
            .join('\n\n--- Fusionado ---\n\n');

        const ultimaInteraccion = [principal.ultimaInteraccion, ...duplicados.map((d) => d.ultimaInteraccion)]
            .filter(Boolean)
            .sort((a, b) => new Date(b) - new Date(a))[0] || principal.ultimaInteraccion;

        await db.exec('BEGIN');
        try {
            await db.prepare(
                'UPDATE clientes SET nombres = ?, apellidoPaterno = ?, apellidoMaterno = ?, telefono = ?, correo = ?, empresa = ?, notas = ?, historialEmbudo = ?, ultimaInteraccion = ? WHERE id = ?'
            ).run(
                pickValue('nombres'),
                pickValue('apellidoPaterno'),
                pickValue('apellidoMaterno'),
                pickValue('telefono'),
                pickValue('correo'),
                pickValue('empresa'),
                notasUnificadas || principal.notas,
                mergeHistorial(),
                ultimaInteraccion,
                principalId
            );

            const inClause = duplicadoIds.map(() => '?').join(', ');
            await db.prepare(`UPDATE actividades SET cliente = ? WHERE cliente IN (${inClause})`).run(principalId, ...duplicadoIds);
            await db.prepare(`UPDATE tareas SET cliente = ? WHERE cliente IN (${inClause})`).run(principalId, ...duplicadoIds);
            await db.prepare(`UPDATE ventas SET cliente = ? WHERE cliente IN (${inClause})`).run(principalId, ...duplicadoIds);
            await db.prepare(`DELETE FROM clientes WHERE id IN (${inClause})`).run(...duplicadoIds);
            await db.exec('COMMIT');
        } catch (txError) {
            await db.exec('ROLLBACK');
            throw txError;
        }

        const actualizado = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(principalId);

        res.json({
            mensaje: 'Duplicados fusionados correctamente',
            principalId,
            eliminados: duplicadoIds,
            cliente: toMongoFormat(actualizado) || actualizado
        });
    } catch (error) {
        console.error('Error al fusionar duplicados:', error);
        res.status(500).json({ mensaje: 'Error del servidor', detalle: error.message });
    }
});

router.get('/:id', auth, esSuperUser, async (req, res) => {
    try {
        const row = await db.prepare('SELECT c.*, u.nombre as vendedorNombre FROM clientes c JOIN usuarios u ON c.vendedorAsignado = u.id WHERE c.id = ?').get(parseInt(req.params.id));
        if (!row) return res.status(404).json({ mensaje: 'Cliente no encontrado' });

        // Isolación por equipo
        const equipoId = req.usuario.equipo_id;
        if (equipoId && row.equipo_id && String(row.equipo_id) !== String(equipoId)) {
            return res.status(403).json({ mensaje: 'No tiene acceso a este cliente' });
        }

        const usuarioId = parseInt(req.usuario.id, 10);
        if (!canReadCliente(row, usuarioId, req.usuario.equipo_id)) {
            return res.status(403).json({ mensaje: 'No tiene permiso para ver este cliente' });
        }
        const { vendedorNombre, ...c } = row;
        const cliente = toMongoFormat(c);
        if (cliente) cliente.vendedorAsignado = { nombre: vendedorNombre };
        res.json(cliente || row);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

router.post('/', auth, esSuperUser, async (req, res) => {
    try {
        const { nombres, apellidoPaterno, apellidoMaterno, telefono, correo, empresa, estado, vendedorAsignado, etapaEmbudo, fuente } = req.body;
        if (!nombres || !telefono || !correo) {
            return res.status(400).json({ mensaje: 'Complete los campos requeridos' });
        }
        const rol = String(req.usuario.rol || '').toLowerCase();
        const usuarioId = parseInt(req.usuario.id);
        const equipoId = req.usuario.equipo_id || null;
        const vendedorId = req.usuario.rol === 'admin' && vendedorAsignado ? parseInt(vendedorAsignado) : usuarioId;
        const etapa = etapaEmbudo || 'venta_ganada';
        const estadoCliente = estado || (etapa === 'venta_ganada' ? 'ganado' : 'proceso');
        const now = new Date().toISOString();
        const hist = JSON.stringify([{ etapa, fecha: now, vendedor: vendedorId }]);

        const prospectorAsignado = usuarioId;
        const closerAsignado = usuarioId;

        await db.prepare(`
            INSERT INTO clientes (nombres, apellidoPaterno, apellidoMaterno, telefono, correo, empresa, estado, etapaEmbudo, historialEmbudo, vendedorAsignado, prospectorAsignado, closerAsignado, fechaUltimaEtapa, "equipo_id", "propietarioId", compartido, fuente)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            nombres,
            apellidoPaterno || '',
            apellidoMaterno || '',
            telefono,
            correo,
            empresa || '',
            estadoCliente,
            etapa,
            hist,
            vendedorId,
            prospectorAsignado,
            closerAsignado,
            now,
            equipoId,
            usuarioId,
            false,
            (fuente || 'Desconocido').trim()
        );

        const row = await db.prepare('SELECT * FROM clientes ORDER BY id DESC LIMIT 1').get();
        res.status(201).json({ mensaje: 'Cliente creado', cliente: toMongoFormat(row) || row });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

router.put('/:id', auth, esSuperUser, async (req, res) => {
    try {
        const c = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(parseInt(req.params.id));
        if (!c) return res.status(404).json({ mensaje: 'Cliente no encontrado' });
        const usuarioId = parseInt(req.usuario.id, 10);
        if (!canWriteCliente(c, usuarioId)) {
            return res.status(403).json({ mensaje: 'Solo el propietario puede editar este cliente' });
        }

        const { nombres, apellidoPaterno, apellidoMaterno, telefono, correo, empresa, estado, notas, vendedorAsignado, etapaEmbudo, customSections, fuente } = req.body;
        const updates = [];
        const params = [];
        const now = new Date().toISOString();

        if (nombres) { updates.push('nombres = ?'); params.push(nombres); }
        if (apellidoPaterno) { updates.push('apellidoPaterno = ?'); params.push(apellidoPaterno); }
        if (apellidoMaterno !== undefined) { updates.push('apellidoMaterno = ?'); params.push(apellidoMaterno); }
        if (telefono) { updates.push('telefono = ?'); params.push(telefono); }
        if (correo) { updates.push('correo = ?'); params.push(correo); }
        if (empresa !== undefined) { updates.push('empresa = ?'); params.push(empresa); }
        if (customSections !== undefined) {
            updates.push('customSections = ?');
            params.push(typeof customSections === 'string' ? customSections : JSON.stringify(customSections));
        }

        // Manejo de cambio de etapa
        if (etapaEmbudo && etapaEmbudo !== c.etapaEmbudo) {
            updates.push('etapaEmbudo = ?');
            params.push(etapaEmbudo);
            updates.push('fechaUltimaEtapa = ?');
            params.push(now);

            const hist = c.historialEmbudo ? JSON.parse(c.historialEmbudo) : [];
            hist.push({
                etapa: etapaEmbudo,
                fecha: now,
                vendedor: parseInt(req.usuario.id),
                descripcion: `Cambio manual de etapa a: ${etapaEmbudo}`
            });
            updates.push('historialEmbudo = ?');
            params.push(JSON.stringify(hist));

            // Sincronizar estado si es ganado/perdido
            if (etapaEmbudo === 'ganado' || etapaEmbudo === 'venta_ganada') {
                updates.push('estado = ?');
                params.push('ganado');
            } else if (etapaEmbudo === 'perdido') {
                updates.push('estado = ?');
                params.push('perdido');
            }
        } else if (estado) {
            updates.push('estado = ?');
            params.push(estado);
        }
        if (fuente !== undefined) {
            updates.push('fuente = ?');
            params.push(fuente);
        }

        if (notas !== undefined) { updates.push('notas = ?'); params.push(notas); }

        // Roles permitidos para reasignar
        const esAdmin = req.usuario.rol === 'admin';
        if (esAdmin && vendedorAsignado) {
            updates.push('vendedorAsignado = ?');
            params.push(parseInt(vendedorAsignado));
        }

        updates.push('ultimaInteraccion = ?');
        params.push(now);
        await db.prepare(`UPDATE clientes SET ${updates.join(', ')} WHERE id = ?`).run(...params);
        const row = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(parseInt(req.params.id));
        res.json({ mensaje: 'Cliente actualizado', cliente: toMongoFormat(row) || row });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

router.delete('/:id', auth, esSuperUser, async (req, res) => {
    try {
        const clienteId = parseInt(req.params.id);
        const existe = await db.prepare('SELECT id FROM clientes WHERE id = ?').get(clienteId);
        if (!existe) return res.status(404).json({ mensaje: 'Cliente no encontrado' });

        const cliente = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(clienteId);
        if (!canWriteCliente(cliente, parseInt(req.usuario.id, 10))) {
            return res.status(403).json({ mensaje: 'Solo el propietario puede eliminar este cliente' });
        }

        // Eliminar registros relacionados primero para evitar violaciones de FK
        await db.prepare('DELETE FROM actividades WHERE cliente = ?').run(clienteId);
        await db.prepare('DELETE FROM tareas WHERE cliente = ?').run(clienteId);
        await db.prepare('DELETE FROM ventas WHERE cliente = ?').run(clienteId);
        await db.prepare('DELETE FROM clientes WHERE id = ?').run(clienteId);

        res.json({ mensaje: 'Cliente eliminado' });
    } catch (error) {
        console.error('Error al eliminar cliente:', error);
        res.status(500).json({ mensaje: 'Error del servidor', detalle: error.message });
    }
});

router.patch('/:id/etapa', auth, esSuperUser, async (req, res) => {
    try {
        const { etapaNueva } = req.body;
        if (!etapaNueva) return res.status(400).json({ mensaje: 'etapaNueva requerida' });
        const c = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(parseInt(req.params.id));
        if (!c) return res.status(404).json({ mensaje: 'Cliente no encontrado' });
        if (!canWriteCliente(c, parseInt(req.usuario.id, 10))) {
            return res.status(403).json({ mensaje: 'Solo el propietario puede cambiar la etapa' });
        }
        const now = new Date().toISOString();
        const hist = c.historialEmbudo ? JSON.parse(c.historialEmbudo) : [];
        hist.push({ etapa: etapaNueva, fecha: now, vendedor: parseInt(req.usuario.id) });
        let estado = 'proceso';
        if (etapaNueva === 'ganado') estado = 'ganado';
        else if (etapaNueva === 'perdido') estado = 'perdido';
        await db.prepare('UPDATE clientes SET etapaEmbudo = ?, fechaUltimaEtapa = ?, ultimaInteraccion = ?, historialEmbudo = ?, estado = ? WHERE id = ?')
            .run(etapaNueva, now, now, JSON.stringify(hist), estado, parseInt(req.params.id));
        const row = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(parseInt(req.params.id));
        res.json({ mensaje: 'Etapa actualizada', cliente: toMongoFormat(row) || row });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

module.exports = router;
