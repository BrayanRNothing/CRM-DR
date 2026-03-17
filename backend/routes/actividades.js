const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth, esSuperUser } = require('../middleware/auth');
const { toMongoFormat } = require('../lib/helpers');

router.get('/', auth, esSuperUser, async (req, res) => {
    try {
        const params = [];
        let idx = 1;
        let sql = `SELECT a.*, v.nombre as "vendedorNombre", c.nombres as c_nombres, c."apellidoPaterno" as c_apellido, c.empresa as c_empresa
            FROM actividades a JOIN usuarios v ON a.vendedor = v.id JOIN clientes c ON a.cliente = c.id WHERE 1=1`;

        if (req.query.tipo) {
            sql += ` AND a.tipo = $${idx++}`;
            params.push(req.query.tipo);
        }
        if (req.query.clienteId) {
            sql += ` AND a.cliente = $${idx++}`;
            params.push(parseInt(req.query.clienteId));
        }
        sql += ' ORDER BY a.fecha DESC LIMIT 100';

        const { rows } = await pool.query(sql, params);
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
        const check = await pool.query('SELECT id FROM clientes WHERE id = $1', [parseInt(cliente)]);
        if (!check.rows[0]) return res.status(404).json({ mensaje: 'Cliente no encontrado' });
        const now = new Date().toISOString();
        const { rows } = await pool.query(
            'INSERT INTO actividades (tipo, vendedor, cliente, descripcion, resultado, notas) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [tipo, parseInt(req.usuario.id), parseInt(cliente), descripcion || '', resultado || 'pendiente', notas || '']
        );
        await pool.query('UPDATE clientes SET "ultimaInteraccion" = $1 WHERE id = $2', [now, parseInt(cliente)]);
        res.status(201).json({ mensaje: 'Actividad registrada', actividad: toMongoFormat(rows[0]) || rows[0] });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

router.put('/:id', auth, esSuperUser, async (req, res) => {
    try {
        const check = await pool.query('SELECT * FROM actividades WHERE id = $1', [parseInt(req.params.id)]);
        if (!check.rows[0]) return res.status(404).json({ mensaje: 'Actividad no encontrada' });

        const { descripcion, resultado, notas } = req.body;
        const sets = [];
        const params = [];
        let idx = 1;

        if (descripcion !== undefined) { sets.push(`descripcion = $${idx++}`); params.push(descripcion); }
        if (resultado) { sets.push(`resultado = $${idx++}`); params.push(resultado); }
        if (notas !== undefined) { sets.push(`notas = $${idx++}`); params.push(notas); }

        if (sets.length) {
            params.push(parseInt(req.params.id));
            await pool.query(`UPDATE actividades SET ${sets.join(', ')} WHERE id = $${idx}`, params);
        }
        const { rows } = await pool.query('SELECT * FROM actividades WHERE id = $1', [parseInt(req.params.id)]);
        res.json({ mensaje: 'Actividad actualizada', actividad: toMongoFormat(rows[0]) || rows[0] });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

module.exports = router;
