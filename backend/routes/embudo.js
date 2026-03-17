const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
    try {
        const etapas = ['prospecto_nuevo', 'en_contacto', 'reunion_agendada', 'reunion_realizada', 'en_negociacion', 'venta_ganada', 'perdido'];
        const conteos = {};
        await Promise.all(etapas.map(async (e) => {
            const { rows } = await pool.query('SELECT COUNT(*) as c FROM clientes WHERE "etapaEmbudo" = $1', [e]);
            conteos[e] = parseInt(rows[0].c);
        }));
        res.json(conteos);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

module.exports = router;
