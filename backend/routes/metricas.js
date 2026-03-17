const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
    try {
        const hoyInicio = new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z';
        const [r1, r2, r3] = await Promise.all([
            pool.query('SELECT COUNT(*) as c FROM actividades WHERE tipo = $1 AND fecha >= $2', ['llamada', hoyInicio]),
            pool.query('SELECT COUNT(*) as c FROM actividades WHERE tipo = $1', ['llamada']),
            pool.query('SELECT COUNT(*) as c FROM clientes')
        ]);
        res.json({
            llamadas: { hoy: parseInt(r1.rows[0].c), totales: parseInt(r2.rows[0].c) },
            clientes: parseInt(r3.rows[0].c)
        });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

module.exports = router;
