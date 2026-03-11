const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../config/database');
const { auth, esSuperUser } = require('../middleware/auth');

// Helper para formatear respuesta (simulando lo que hacía toMongoFormat si es necesario, o simplificando)
const formatUser = (row) => ({
    id: row.id,
    usuario: row.usuario,
    nombre: row.nombre,
    rol: row.rol,
    email: row.email,
    telefono: row.telefono,
    activo: !!row.activo,
    fechaCreacion: row.fechaCreacion,
    googleLinked: !!(row.googleRefreshToken || row.googleAccessToken),
    modo_crm: row.modo_crm,
    nombreEmpresa: row.nombreEmpresa,
    logoEmpresa: row.logoEmpresa
});

// @route   GET api/usuarios
// @desc    Obtener todos los usuarios (Solo Admin o para listar en sidebar si se permite)
// @access  Private (Admin o usuarios autenticados para ver equipo)
router.get('/', auth, async (req, res) => {
    try {
        // Permitir a todos los autenticados ver la lista de usuarios (para el sidebar)
        // O restringir si es necesario. Por ahora abierto a autenticados.
        const rows = await db.prepare('SELECT id, usuario, nombre, rol, email, telefono, activo, fechaCreacion, googleRefreshToken, googleAccessToken, modo_crm, nombreEmpresa, logoEmpresa FROM usuarios WHERE activo = 1 ORDER BY nombre ASC').all();
        res.json(rows.map(formatUser));
    } catch (error) {
        console.error("Error in GET /api/usuarios:", error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

// @route   POST api/usuarios
// @desc    Crear nuevo usuario
// @access  Private (Admin)
router.post('/', auth, esSuperUser, async (req, res) => {
    try {
        const { usuario, contraseña, nombre, email, telefono, rol } = req.body;

        if (!usuario || !contraseña || !nombre || !rol) {
            return res.status(400).json({ mensaje: 'Complete los campos requeridos' });
        }

        const existe = await db.prepare('SELECT id FROM usuarios WHERE usuario = ?').get(usuario.trim());
        if (existe) return res.status(400).json({ mensaje: 'Usuario ya existe' });

        const hash = await bcrypt.hash(contraseña, 10);

        const stmt = await db.prepare('INSERT INTO usuarios (usuario, contraseña, rol, nombre, email, telefono) VALUES (?, ?, ?, ?, ?, ?)');
        const info = await stmt.run(usuario.trim(), hash, rol, nombre.trim(), (email || '').trim(), (telefono || '').trim());

        const row = await db.prepare('SELECT * FROM usuarios WHERE id = ?').get(info.lastInsertRowid);
        res.status(201).json({ mensaje: 'Usuario creado', usuario: formatUser(row) });
    } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

// @route   PUT api/usuarios/:id
// @desc    Actualizar usuario
// @access  Private (Admin)
router.put('/:id', auth, esSuperUser, async (req, res) => {
    try {
        const { nombre, email, telefono, activo, contraseña, rol, nombreEmpresa, logoEmpresa, modo_crm } = req.body;
        const id = parseInt(req.params.id);

        const row = await db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
        if (!row) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        const updates = [];
        const params = [];

        if (nombre) { updates.push('nombre = ?'); params.push(nombre); }
        if (email !== undefined) { updates.push('email = ?'); params.push(email); }
        if (telefono !== undefined) { updates.push('telefono = ?'); params.push(telefono); }
        if (activo !== undefined) { updates.push('activo = ?'); params.push(activo ? 1 : 0); }
        if (rol) { updates.push('rol = ?'); params.push(rol); }
        if (nombreEmpresa !== undefined) { updates.push('nombreEmpresa = ?'); params.push(nombreEmpresa); }
        if (logoEmpresa !== undefined) { updates.push('logoEmpresa = ?'); params.push(logoEmpresa); }
        if (modo_crm !== undefined) { updates.push('modo_crm = ?'); params.push(modo_crm); }
        if (contraseña) {
            const hash = await bcrypt.hash(contraseña, 10);
            updates.push('contraseña = ?');
            params.push(hash);
        }

        if (updates.length > 0) {
            params.push(id);
            await db.prepare(`UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`).run(...params);
        }

        const updated = await db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
        res.json({ mensaje: 'Usuario actualizado', usuario: formatUser(updated) });
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

// @route   DELETE api/usuarios/:id
// @desc    Desactivar usuario
// @access  Private (Admin)
router.delete('/:id', auth, esSuperUser, async (req, res) => {
    try {
        await db.prepare('UPDATE usuarios SET activo = 0 WHERE id = ?').run(parseInt(req.params.id));
        res.json({ mensaje: 'Usuario desactivado' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

module.exports = router;
