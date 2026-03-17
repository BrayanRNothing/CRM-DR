const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { auth } = require('../middleware/auth');
const { toMongoFormat } = require('../lib/helpers');

router.get('/', auth, async (req, res) => {
    try {
        const rows = await db.prepare('SELECT * FROM ventas ORDER BY fecha DESC LIMIT 100').all();
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
        await db.prepare('INSERT INTO ventas (cliente, vendedor, monto, estado, notas) VALUES (?, ?, ?, ?, ?)')
            .run(parseInt(cliente), vendedorId, parseFloat(monto), estado || 'pendiente', notas || '');
        const row = await db.prepare('SELECT * FROM ventas ORDER BY id DESC LIMIT 1').get();
        res.status(201).json({ mensaje: 'Venta registrada', venta: toMongoFormat(row) || row });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

module.exports = router;
