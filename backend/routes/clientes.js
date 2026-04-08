const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { auth, esSuperUser } = require('../middleware/auth');
const { toMongoFormat } = require('../lib/helpers');

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
        const { nombres, apellidoPaterno, apellidoMaterno, telefono, correo, empresa, estado, vendedorAsignado, etapaEmbudo } = req.body;
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

        const prospectorAsignado = rol === 'prospector' ? usuarioId : null;
        const closerAsignado = (rol === 'closer' || rol === 'vendedor') ? usuarioId : null;

        await db.prepare(`
            INSERT INTO clientes (nombres, apellidoPaterno, apellidoMaterno, telefono, correo, empresa, estado, etapaEmbudo, historialEmbudo, vendedorAsignado, prospectorAsignado, closerAsignado, fechaUltimaEtapa, "equipo_id", "propietarioId", compartido)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            false
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

        const { nombres, apellidoPaterno, apellidoMaterno, telefono, correo, empresa, estado, notas, vendedorAsignado, etapaEmbudo, customSections } = req.body;
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

        if (notas !== undefined) { updates.push('notas = ?'); params.push(notas); }

        // Roles permitidos para reasignar
        const esAdmin = req.usuario.rol === 'admin' || req.usuario.rol === 'closer';
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
