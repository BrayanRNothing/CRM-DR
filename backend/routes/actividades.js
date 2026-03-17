const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { auth, esSuperUser } = require('../middleware/auth');
const { toMongoFormat } = require('../lib/helpers');

// GET /api/actividades/cliente/:clienteId/historial-completo
// Nuevo: obtener historial COMPLETO de un cliente incluyendo etapas y actividades
router.get('/cliente/:clienteId/historial-completo', auth, async (req, res) => {
    try {
        const clienteId = parseInt(req.params.clienteId);
        const usuarioId = parseInt(req.usuario.id);

        // Obtener cliente
        const cliente = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(clienteId);
        if (!cliente) {
            return res.status(404).json({ msg: 'Cliente no encontrado' });
        }

        // Validar permisos: prospector, closer asignado o admin
        const rol = String(req.usuario.rol).toLowerCase();
        const esProspectorAsignado = cliente.prospectorAsignado === usuarioId && rol === 'prospector';
        const esCloserAsignado = cliente.closerAsignado === usuarioId && rol === 'closer';
        const esSuperUser = rol === 'admin' || rol === 'superuser';

        if (!esProspectorAsignado && !esCloserAsignado && !esSuperUser) {
            return res.status(403).json({ msg: 'No tienes permiso para ver este historial' });
        }

        // Obtener TODAS las actividades con información del vendedor
        const actividades = await db.prepare(`
            SELECT a.*, u.nombre as vendedorNombre, u.rol as vendedorRol
            FROM actividades a
            LEFT JOIN usuarios u ON a.vendedor = u.id
            WHERE a.cliente = ?
            ORDER BY a.fecha ASC
        `).all(clienteId);

        // Obtener historial del embudo
        let historialEmbudo = [];
        if (cliente.historialEmbudo) {
            try {
                historialEmbudo = JSON.parse(cliente.historialEmbudo);
            } catch (e) {
                console.error('Error al parsear historialEmbudo:', e);
            }
        }

        // Construir timeline completo
        const timeline = [];

        // Agregar cambios de etapa
        historialEmbudo.forEach(h => {
            timeline.push({
                tipo: 'cambio_etapa',
                etapa: h.etapa,
                fecha: h.fecha,
                vendedorId: h.vendedor,
                descripcion: h.descripcion || `Cambio a etapa: ${h.etapa}`,
                resultado: h.resultado || null,
                timestamp: new Date(h.fecha).getTime()
            });
        });

        // Agregar actividades
        actividades.forEach(a => {
            timeline.push({
                tipo: 'actividad',
                id: a.id,
                tipoActividad: a.tipo,
                fecha: a.fecha,
                vendedorId: a.vendedor,
                vendedorNombre: a.vendedorNombre || 'Desconocido',
                vendedorRol: a.vendedorRol || 'vendedor',
                descripcion: a.descripcion,
                resultado: a.resultado,
                notas: a.notas,
                timestamp: new Date(a.fecha).getTime()
            });
        });

        // Ordenar por fecha
        timeline.sort((a, b) => a.timestamp - b.timestamp);

        // Obtener información de prospector y closer
        let prospectorInfo = null;
        let closerInfo = null;

        if (cliente.prospectorAsignado) {
            const p = await db.prepare('SELECT id, nombre, email FROM usuarios WHERE id = ?').get(cliente.prospectorAsignado);
            if (p) prospectorInfo = { id: p.id, nombre: p.nombre, email: p.email };
        }

        if (cliente.closerAsignado) {
            const c = await db.prepare('SELECT id, nombre, email FROM usuarios WHERE id = ?').get(cliente.closerAsignado);
            if (c) closerInfo = { id: c.id, nombre: c.nombre, email: c.email };
        }

        res.json({
            cliente: toMongoFormat(cliente) || cliente,
            timeline,
            resumen: {
                totalActividades: actividades.length,
                totalCambiosEtapa: historialEmbudo.length,
                etapaActual: cliente.etapaEmbudo,
                ultimaInteraccion: cliente.ultimaInteraccion,
                fechaRegistro: cliente.fechaRegistro,
                prospectorAsignado: prospectorInfo,
                closerAsignado: closerInfo,
                vendedoresInvolucrados: [...new Set([
                    ...actividades.map(a => a.vendedorNombre).filter(Boolean),
                    ...await Promise.all(historialEmbudo.map(async h => {
                        const user = await db.prepare('SELECT nombre FROM usuarios WHERE id = ?').get(h.vendedor);
                        return user?.nombre;
                    })).then(results => results.filter(Boolean))
                ])]
            }
        });
    } catch (error) {
        console.error('Error al obtener historial completo:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

router.get('/', auth, esSuperUser, async (req, res) => {
    try {
        let sql = `SELECT a.*, v.nombre as vendedorNombre, c.nombres as c_nombres, c.apellidoPaterno as c_apellido, c.empresa as c_empresa
            FROM actividades a JOIN usuarios v ON a.vendedor = v.id JOIN clientes c ON a.cliente = c.id WHERE 1=1`;
        const params = [];
        // Removed vendor role check
        if (req.query.tipo) {
            sql += ' AND a.tipo = ?';
            params.push(req.query.tipo);
        }
        if (req.query.clienteId) {
            sql += ' AND a.cliente = ?';
            params.push(parseInt(req.query.clienteId));
        }
        sql += ' ORDER BY a.fecha DESC LIMIT 100';
        const rows = await db.prepare(sql).all(...params);
        const actividades = rows.map(r => ({
            ...toMongoFormat(r),
            vendedor: { nombre: r.vendedorNombre },
            cliente: { nombres: r.c_nombres, apellidoPaterno: r.c_apellido, empresa: r.c_empresa }
        }));
        res.json(actividades);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

router.post('/', auth, esSuperUser, async (req, res) => {
    try {
        const { tipo, cliente, descripcion, resultado, notas } = req.body;
        if (!tipo || !cliente) return res.status(400).json({ mensaje: 'Tipo y cliente requeridos' });
        const c = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(parseInt(cliente));
        if (!c) return res.status(404).json({ mensaje: 'Cliente no encontrado' });
        if (req.usuario.rol === 'vendedor' && c.vendedorAsignado !== parseInt(req.usuario.id)) {
            return res.status(403).json({ mensaje: 'No tiene permiso' });
        }
        const now = new Date().toISOString();
        await db.prepare('INSERT INTO actividades (tipo, vendedor, cliente, descripcion, resultado, notas) VALUES (?, ?, ?, ?, ?, ?)')
            .run(tipo, parseInt(req.usuario.id), parseInt(cliente), descripcion || '', resultado || 'pendiente', notas || '');
        await db.prepare('UPDATE clientes SET ultimaInteraccion = ? WHERE id = ?').run(now, parseInt(cliente));
        const row = await db.prepare('SELECT * FROM actividades ORDER BY id DESC LIMIT 1').get();
        res.status(201).json({ mensaje: 'Actividad registrada', actividad: toMongoFormat(row) || row });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

router.put('/:id', auth, esSuperUser, async (req, res) => {
    try {
        const a = await db.prepare('SELECT * FROM actividades WHERE id = ?').get(parseInt(req.params.id));
        if (!a) return res.status(404).json({ mensaje: 'Actividad no encontrada' });
        if (req.usuario.rol === 'vendedor' && a.vendedor !== parseInt(req.usuario.id)) {
            return res.status(403).json({ mensaje: 'No tiene permiso' });
        }
        const { descripcion, resultado, notas } = req.body;
        const updates = [];
        const params = [];
        if (descripcion !== undefined) { updates.push('descripcion = ?'); params.push(descripcion); }
        if (resultado) { updates.push('resultado = ?'); params.push(resultado); }
        if (notas !== undefined) { updates.push('notas = ?'); params.push(notas); }
        if (updates.length) {
            params.push(parseInt(req.params.id));
            await db.prepare(`UPDATE actividades SET ${updates.join(', ')} WHERE id = ?`).run(...params);
        }
        const row = await db.prepare('SELECT * FROM actividades WHERE id = ?').get(parseInt(req.params.id));
        res.json({ mensaje: 'Actividad actualizada', actividad: toMongoFormat(row) || row });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

router.delete('/:id', auth, async (req, res) => {
    try {
        const a = await db.prepare('SELECT * FROM actividades WHERE id = ?').get(parseInt(req.params.id));
        if (!a) return res.status(404).json({ mensaje: 'Actividad no encontrada' });

        const rol = String(req.usuario.rol).toLowerCase();
        const esSuperUser = rol === 'admin' || rol === 'superuser';
        const esOwner = a.vendedor === parseInt(req.usuario.id);

        if (!esOwner && !esSuperUser) {
            return res.status(403).json({ mensaje: 'No tienes permiso para eliminar esta actividad' });
        }

        await db.prepare('DELETE FROM actividades WHERE id = ?').run(parseInt(req.params.id));
        res.json({ mensaje: 'Actividad eliminada correctamente' });
    } catch (error) {
        console.error('Error al eliminar actividad:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

module.exports = router;
