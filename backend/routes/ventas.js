const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth } = require('../middleware/auth');
const { toMongoFormat } = require('../lib/helpers');

router.get('/', auth, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM ventas ORDER BY fecha DESC LIMIT 100');
        res.json(rows.map(toMongoFormat));
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

router.post('/', auth, async (req, res) => {
    try {
        const { cliente, monto, estado, notas } = req.body;
        if (!cliente || monto == null) return res.status(400).json({ mensaje: 'Cliente y monto requeridos' });
        const vendedorId = parseInt(req.usuario.id);
        const { rows } = await pool.query(
            'INSERT INTO ventas (cliente, vendedor, monto, estado, notas) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [parseInt(cliente), vendedorId, parseFloat(monto), estado || 'pendiente', notas || '']
        );
        res.status(201).json({ mensaje: 'Venta registrada', venta: toMongoFormat(rows[0]) || rows[0] });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

module.exports = router;
