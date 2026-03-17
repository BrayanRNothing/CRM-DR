const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
    try {
        const hoyInicio = new Date().toISOString().slice(0, 10) + ' 00:00:00';
        const rowLlamadasHoy = await db.prepare('SELECT COUNT(*) as c FROM actividades WHERE tipo = ? AND fecha >= ?').get('llamada', hoyInicio);
        const rowLlamadasTotales = await db.prepare('SELECT COUNT(*) as c FROM actividades WHERE tipo = ?').get('llamada');
        const rowClientesTotal = await db.prepare('SELECT COUNT(*) as c FROM clientes').get();

        res.json({
            llamadas: { hoy: rowLlamadasHoy.c, totales: rowLlamadasTotales.c },
            clientes: rowClientesTotal.c
        });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

module.exports = router;
