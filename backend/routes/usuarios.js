const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { auth, esSuperUser } = require('../middleware/auth');

const formatUser = (row) => ({
    id: row.id,
    usuario: row.usuario,
    nombre: row.nombre,
    rol: row.rol,
    email: row.email,
    telefono: row.telefono,
    activo: !!row.activo,
    fechaCreacion: row.fechaCreacion
});

router.get('/', auth, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, usuario, nombre, rol, email, telefono, activo, "fechaCreacion" FROM usuarios WHERE activo = 1 ORDER BY nombre ASC');
        res.json(rows.map(formatUser));
    } catch (error) {
        console.error('Error in GET /api/usuarios:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

router.post('/', auth, esSuperUser, async (req, res) => {
    try {
        const { usuario, contraseña, nombre, email, telefono, rol } = req.body;

        if (!usuario || !contraseña || !nombre || !rol) {
            return res.status(400).json({ mensaje: 'Complete los campos requeridos' });
        }

        const existe = await pool.query('SELECT id FROM usuarios WHERE usuario = $1', [usuario.trim()]);
        if (existe.rows[0]) return res.status(400).json({ mensaje: 'Usuario ya existe' });

        const hash = await bcrypt.hash(contraseña, 10);

        const { rows } = await pool.query(
            'INSERT INTO usuarios (usuario, "contraseña", rol, nombre, email, telefono) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [usuario.trim(), hash, rol, nombre.trim(), (email || '').trim(), (telefono || '').trim()]
        );
        res.status(201).json({ mensaje: 'Usuario creado', usuario: formatUser(rows[0]) });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

router.put('/:id', auth, esSuperUser, async (req, res) => {
    try {
        const { nombre, email, telefono, activo, contraseña, rol } = req.body;
        const id = parseInt(req.params.id);

        const check = await pool.query('SELECT id FROM usuarios WHERE id = $1', [id]);
        if (!check.rows[0]) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        const sets = [];
        const params = [];
        let idx = 1;

        if (nombre) { sets.push(`nombre = $${idx++}`); params.push(nombre); }
        if (email !== undefined) { sets.push(`email = $${idx++}`); params.push(email); }
        if (telefono !== undefined) { sets.push(`telefono = $${idx++}`); params.push(telefono); }
        if (activo !== undefined) { sets.push(`activo = $${idx++}`); params.push(activo ? 1 : 0); }
        if (rol) { sets.push(`rol = $${idx++}`); params.push(rol); }
        if (contraseña) {
            const hash = await bcrypt.hash(contraseña, 10);
            sets.push(`"contraseña" = $${idx++}`);
            params.push(hash);
        }

        if (sets.length > 0) {
            params.push(id);
            await pool.query(`UPDATE usuarios SET ${sets.join(', ')} WHERE id = $${idx}`, params);
        }

        const { rows } = await pool.query('SELECT * FROM usuarios WHERE id = $1', [id]);
        res.json({ mensaje: 'Usuario actualizado', usuario: formatUser(rows[0]) });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

router.delete('/:id', auth, esSuperUser, async (req, res) => {
    try {
        await pool.query('UPDATE usuarios SET activo = 0 WHERE id = $1', [parseInt(req.params.id)]);
        res.json({ mensaje: 'Usuario desactivado' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

module.exports = router;
