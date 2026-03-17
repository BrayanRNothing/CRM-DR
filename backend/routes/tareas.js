const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth } = require('../middleware/auth');
const { toMongoFormat } = require('../lib/helpers');

router.get('/', auth, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM tareas ORDER BY "fechaCreacion" DESC LIMIT 100');
        res.json(rows.map(toMongoFormat));
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

router.post('/', auth, async (req, res) => {
    try {
        const { titulo, descripcion, vendedor, cliente, estado, prioridad, fechaLimite } = req.body;
        if (!titulo) return res.status(400).json({ mensaje: 'Título requerido' });
        const vendedorId = vendedor ? parseInt(vendedor) : parseInt(req.usuario.id);
        const { rows } = await pool.query(
            'INSERT INTO tareas (titulo, descripcion, vendedor, cliente, estado, prioridad, "fechaLimite") VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [titulo, descripcion || '', vendedorId, cliente ? parseInt(cliente) : null, estado || 'pendiente', prioridad || 'media', fechaLimite || null]
        );
        res.status(201).json({ mensaje: 'Tarea creada', tarea: toMongoFormat(rows[0]) || rows[0] });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

module.exports = router;
