const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { auth } = require('../middleware/auth');
const { toMongoFormat } = require('../lib/helpers');

router.get('/', auth, async (req, res) => {
    try {
        const vendedorId = parseInt(req.usuario.id);
        const rows = await db.prepare(`
            SELECT t.*, c.nombres as clienteNombre, c.apellidoPaterno as clienteApellido 
            FROM tareas t
            LEFT JOIN clientes c ON t.cliente = c.id
            WHERE t.vendedor = ?
            ORDER BY CASE WHEN t.estado = 'pendiente' THEN 0 ELSE 1 END, t.fechaLimite ASC
            LIMIT 100
        `).all(vendedorId);
        res.json(rows.map(toMongoFormat));
    } catch (error) {
        console.error('Error al obtener tareas:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

router.post('/', auth, async (req, res) => {
    try {
        const { titulo, descripcion, vendedor, cliente, estado, prioridad, fechaLimite } = req.body;
        if (!titulo) return res.status(400).json({ mensaje: 'Título requerido' });
        const vendedorId = vendedor ? parseInt(vendedor) : parseInt(req.usuario.id);
        await db.prepare('INSERT INTO tareas (titulo, descripcion, vendedor, cliente, estado, prioridad, fechaLimite) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .run(titulo, descripcion || '', vendedorId, cliente ? parseInt(cliente) : null, estado || 'pendiente', prioridad || 'media', fechaLimite || null);
        const row = await db.prepare('SELECT * FROM tareas ORDER BY id DESC LIMIT 1').get();
        res.status(201).json({ mensaje: 'Tarea creada', tarea: toMongoFormat(row) || row });
    } catch (error) {
        console.error('Error al crear tarea:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

router.put('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, titulo, descripcion, prioridad, fechaLimite } = req.body;
        const vendedorId = parseInt(req.usuario.id);

        const tarea = await db.prepare('SELECT id, cliente FROM tareas WHERE id = ? AND vendedor = ?').get(id, vendedorId);
        if (!tarea) return res.status(404).json({ mensaje: 'Tarea no encontrada' });

        const updates = [];
        const params = [];

        if (estado) { updates.push('estado = ?'); params.push(estado); }
        if (titulo) { updates.push('titulo = ?'); params.push(titulo); }
        if (descripcion !== undefined) { updates.push('descripcion = ?'); params.push(descripcion); }
        if (prioridad) { updates.push('prioridad = ?'); params.push(prioridad); }
        if (fechaLimite !== undefined) { updates.push('fechaLimite = ?'); params.push(fechaLimite); }

        if (updates.length > 0) {
            params.push(id);
            await db.prepare(`UPDATE tareas SET ${updates.join(', ')} WHERE id = ?`).run(...params);
        }

        // Sincronización: Si se completa la tarea, limpiar proximaLlamada en clientes
        if (estado === 'completada' && tarea.cliente) {
            await db.prepare('UPDATE clientes SET proximaLlamada = NULL WHERE id = ?').run(tarea.cliente);
        }

        res.json({ mensaje: 'Tarea actualizada' });
    } catch (error) {
        console.error('Error al actualizar tarea:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

module.exports = router;
