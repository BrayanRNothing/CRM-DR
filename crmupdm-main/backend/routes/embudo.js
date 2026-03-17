const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
    try {
        const etapas = ['prospecto_nuevo', 'en_contacto', 'reunion_agendada', 'reunion_realizada', 'en_negociacion', 'venta_ganada', 'perdido'];
        const conteos = {};
        for (const e of etapas) {
            const row = await db.prepare('SELECT COUNT(*) as c FROM clientes WHERE etapaEmbudo = ?').get(e);
            conteos[e] = row.c;
        }
        res.json(conteos);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

module.exports = router;
