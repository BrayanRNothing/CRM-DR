const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { auth } = require('../middleware/auth');

// GET /api/oportunidades/todas
router.get('/todas', auth, async (req, res) => {
    try {
        const vendedor_id = req.usuario.id;
        // Join with clientes to get the client name
        const oportunidades = await db.prepare(`
            SELECT o.*, c.nombres as cliente_nombres, c.empresa as cliente_empresa, c.etapaEmbudo as cliente_etapaEmbudo, c.tipo as cliente_tipo
            FROM oportunidades o
            LEFT JOIN clientes c ON o.cliente_id = c.id
            WHERE o.vendedor_id = ?
            ORDER BY o.id DESC
        `).all(vendedor_id);
        res.json(oportunidades);
    } catch (error) {
        console.error('Error al obtener todas las oportunidades:', error);
        res.status(500).json({ msg: 'Error al obtener oportunidades' });
    }
});

// GET /api/oportunidades/:clienteId
router.get('/:clienteId', auth, async (req, res) => {
    try {
        const clienteId = req.params.clienteId;
        const oportunidades = await db.prepare('SELECT * FROM oportunidades WHERE cliente_id = ? ORDER BY id ASC').all(clienteId);
        res.json(oportunidades);
    } catch (error) {
        console.error('Error al obtener oportunidades:', error);
        res.status(500).json({ msg: 'Error al obtener oportunidades' });
    }
});

// POST /api/oportunidades
router.post('/', auth, async (req, res) => {
    try {
        let { cliente_id, titulo, monto, etapa, notas, etapas_json, apellidoPaterno, apellidoMaterno, telefono, telefono2, correo, empresa, sitioWeb, ubicacion, fuente } = req.body;
        const vendedor_id = req.usuario.id;
        
        if (!cliente_id) {
            const clienteResult = await db.prepare(`
                INSERT INTO clientes (nombres, apellidoPaterno, apellidoMaterno, telefono, telefono2, correo, empresa, sitioWeb, ubicacion, fuente, etapaEmbudo, vendedorAsignado, fechaRegistro, fechaUltimaEtapa)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'prospecto_nuevo', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `).run(
                titulo || 'Prospecto',
                apellidoPaterno || '',
                apellidoMaterno || '',
                telefono || '',
                telefono2 || '',
                correo || '',
                empresa || '',
                sitioWeb || '',
                ubicacion || '',
                fuente || '',
                vendedor_id
            );
            cliente_id = clienteResult.lastInsertRowid;
        }

        const result = await db.prepare(
            `INSERT INTO oportunidades (cliente_id, vendedor_id, titulo, monto, etapa, notas, etapas_json) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(
            cliente_id, 
            vendedor_id, 
            titulo || 'Nueva Oportunidad', 
            monto || 0, 
            etapa || 'nueva', 
            notas || '', 
            etapas_json || '[]'
        );
        
                const nuevaOportunidad = await db.prepare(`
            SELECT o.*, c.nombres as cliente_nombres, c.empresa as cliente_empresa, c.etapaEmbudo as cliente_etapaEmbudo, c.tipo as cliente_tipo
            FROM oportunidades o
            LEFT JOIN clientes c ON o.cliente_id = c.id
            WHERE o.id = ?
        `).get(result.lastInsertRowid);
        res.json(nuevaOportunidad);
    } catch (error) {
        console.error('Error al crear oportunidad:', error);
        res.status(500).json({ msg: 'Error al crear oportunidad' });
    }
});

// PUT /api/oportunidades/:id
router.put('/:id', auth, async (req, res) => {
    try {
        const id = req.params.id;
        const { titulo, monto, etapa, notas, etapas_json, estado } = req.body;
        
        await db.prepare(
            `UPDATE oportunidades 
             SET titulo = COALESCE(?, titulo), 
                 monto = COALESCE(?, monto), 
                 etapa = COALESCE(?, etapa), 
                 notas = COALESCE(?, notas), 
                 etapas_json = COALESCE(?, etapas_json), 
                 estado = COALESCE(?, estado),
                 "fechaActualizacion" = CURRENT_TIMESTAMP 
             WHERE id = ?`
        ).run(titulo, monto, etapa, notas, etapas_json, estado, id);
        
                const oportunidad = await db.prepare(`
            SELECT o.*, c.nombres as cliente_nombres, c.empresa as cliente_empresa, c.etapaEmbudo as cliente_etapaEmbudo
            FROM oportunidades o
            LEFT JOIN clientes c ON o.cliente_id = c.id
            WHERE o.id = ?
        `).get(id);
        res.json(oportunidad);
    } catch (error) {
        console.error('Error al actualizar oportunidad:', error);
        res.status(500).json({ msg: 'Error al actualizar oportunidad' });
    }
});

// DELETE /api/oportunidades/:id
router.delete('/:id', auth, async (req, res) => {
    try {
        const id = req.params.id;
        await db.prepare('DELETE FROM oportunidades WHERE id = ?').run(id);
        res.json({ msg: 'Oportunidad eliminada' });
    } catch (error) {
        console.error('Error al eliminar oportunidad:', error);
        res.status(500).json({ msg: 'Error al eliminar oportunidad' });
    }
});

module.exports = router;
