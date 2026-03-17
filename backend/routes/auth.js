const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { auth } = require('../middleware/auth');

// @route   POST api/auth/login
// @desc    Autenticar usuario y obtener token
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { usuario, contraseña } = req.body;

        if (!usuario || !contraseña) {
            return res.status(400).json({ mensaje: 'Por favor ingrese usuario y contraseña' });
        }

        const { rows } = await pool.query('SELECT * FROM usuarios WHERE usuario = $1', [usuario.trim()]);
        const row = rows[0];
        if (!row) {
            return res.status(400).json({ mensaje: 'Credenciales inválidas' });
        }

        if (!row.activo) {
            return res.status(401).json({ mensaje: 'Usuario desactivado. Contacte al administrador' });
        }

        const contraseñaValida = await bcrypt.compare(contraseña, row['contraseña']);
        if (!contraseñaValida) {
            return res.status(400).json({ mensaje: 'Credenciales inválidas' });
        }

        const payload = { id: row.id, rol: row.rol };

        const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        res.json({
            token,
            usuario: {
                id: row.id,
                usuario: row.usuario,
                nombre: row.nombre,
                rol: row.rol,
                email: row.email,
                telefono: row.telefono
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

// @route   GET api/auth/me
// @desc    Obtener usuario autenticado
// @access  Private
router.get('/me', auth, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, usuario, nombre, rol, email, telefono, activo FROM usuarios WHERE id = $1', [req.usuario.id]);
        res.json(rows[0]);
    } catch (error) {
        console.error('Error en auth/me:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

module.exports = router;
