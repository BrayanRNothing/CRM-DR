const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../config/database');
const { auth, esTeamOwner } = require('../middleware/auth');

const ROLES_PERMITIDOS = ['prospector', 'closer', 'vendedor'];

// @route   GET /api/equipos/mi-equipo
// @desc    Obtener info del equipo actual + lista de miembros
// @access  Private
router.get('/mi-equipo', auth, async (req, res) => {
    try {
        const equipoId = req.usuario.equipo_id;

        if (!equipoId) {
            return res.status(404).json({ mensaje: 'No estás asignado a ningún equipo' });
        }

        // Info del equipo
        const equipo = await db.prepare('SELECT id, nombre, owner_id, "fechaCreacion" FROM equipos WHERE id = ?').get(equipoId);
        if (!equipo) {
            return res.status(404).json({ mensaje: 'Equipo no encontrado' });
        }

        // Miembros del equipo
        const miembros = await db.prepare(
            'SELECT id, usuario, nombre, rol, email, telefono, activo, "equipo_id" FROM usuarios WHERE "equipo_id" = ? ORDER BY nombre ASC'
        ).all(equipoId);

        res.json({
            equipo: {
                id: equipo.id,
                nombre: equipo.nombre,
                owner_id: equipo.owner_id,
                fechaCreacion: equipo.fechaCreacion,
                esOwner: String(equipo.owner_id) === String(req.usuario.id)
            },
            miembros: miembros.map(m => ({
                id: m.id,
                usuario: m.usuario,
                nombre: m.nombre,
                rol: m.rol,
                email: m.email,
                telefono: m.telefono,
                activo: !!m.activo
            }))
        });
    } catch (error) {
        console.error('Error en GET /api/equipos/mi-equipo:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

// @route   POST /api/equipos/agregar-miembro
// @desc    Team Owner crea un nuevo usuario asignado a su equipo
// @access  Private (Team Owner)
router.post('/agregar-miembro', auth, esTeamOwner, async (req, res) => {
    try {
        const { usuario, contraseña, nombre, email, telefono, rol } = req.body;

        if (!usuario || !contraseña || !nombre || !rol) {
            return res.status(400).json({ mensaje: 'Complete los campos requeridos: usuario, contraseña, nombre, rol' });
        }

        if (!ROLES_PERMITIDOS.includes(rol)) {
            return res.status(400).json({ mensaje: `Rol inválido. Roles permitidos: ${ROLES_PERMITIDOS.join(', ')}` });
        }

        const existe = await db.prepare('SELECT id FROM usuarios WHERE usuario = ?').get(usuario.trim());
        if (existe) {
            return res.status(400).json({ mensaje: 'El nombre de usuario ya está en uso' });
        }

        const hash = await bcrypt.hash(contraseña, 10);
        const equipoId = req.equipoId; // Viene del middleware esTeamOwner

        const stmt = await db.prepare(
            'INSERT INTO usuarios (usuario, contraseña, rol, nombre, email, telefono, "equipo_id") VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        const result = await stmt.run(
            usuario.trim(), hash, rol, nombre.trim(),
            (email || '').trim(), (telefono || '').trim(), equipoId
        );

        const newUser = await db.prepare('SELECT id, usuario, nombre, rol, email, telefono, activo FROM usuarios WHERE id = ?').get(result.lastInsertRowid);

        console.log(`✅ Miembro agregado al equipo ${equipoId}: ${newUser.usuario}`);
        res.status(201).json({
            mensaje: 'Miembro agregado al equipo exitosamente',
            usuario: newUser
        });
    } catch (error) {
        console.error('Error en POST /api/equipos/agregar-miembro:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

// @route   PUT /api/equipos/mi-equipo
// @desc    Renombrar el equipo
// @access  Private (Team Owner)
router.put('/mi-equipo', auth, esTeamOwner, async (req, res) => {
    try {
        const { nombre } = req.body;

        if (!nombre || !nombre.trim()) {
            return res.status(400).json({ mensaje: 'El nombre del equipo es requerido' });
        }

        await db.prepare('UPDATE equipos SET nombre = ? WHERE id = ?').run(nombre.trim(), req.equipoId);

        const equipo = await db.prepare('SELECT id, nombre, owner_id FROM equipos WHERE id = ?').get(req.equipoId);
        res.json({ mensaje: 'Equipo actualizado', equipo });
    } catch (error) {
        console.error('Error en PUT /api/equipos/mi-equipo:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

// @route   DELETE /api/equipos/miembro/:id
// @desc    Desactivar un miembro del equipo
// @access  Private (Team Owner)
router.delete('/miembro/:id', auth, esTeamOwner, async (req, res) => {
    try {
        const miembroId = parseInt(req.params.id);

        // Verificar que el miembro pertenezca al mismo equipo
        const miembro = await db.prepare('SELECT id, nombre, "equipo_id" FROM usuarios WHERE id = ?').get(miembroId);
        if (!miembro) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

        if (String(miembro.equipo_id) !== String(req.equipoId)) {
            return res.status(403).json({ mensaje: 'No tienes permiso para desactivar a este usuario' });
        }

        // No permitir que el owner se desactive a sí mismo
        if (String(miembroId) === String(req.usuario.id)) {
            return res.status(400).json({ mensaje: 'No puedes desactivarte a ti mismo' });
        }

        await db.prepare('UPDATE usuarios SET activo = 0 WHERE id = ?').run(miembroId);

        res.json({ mensaje: `Usuario ${miembro.nombre} desactivado correctamente` });
    } catch (error) {
        console.error('Error en DELETE /api/equipos/miembro/:id:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

// @route   DELETE /api/equipos/miembro/:id/eliminar
// @desc    Eliminar miembro del equipo (lo saca del equipo actual)
// @access  Private (Team Owner)
router.delete('/miembro/:id/eliminar', auth, esTeamOwner, async (req, res) => {
    try {
        const miembroId = parseInt(req.params.id);

        const miembro = await db.prepare('SELECT id, nombre, "equipo_id" FROM usuarios WHERE id = ?').get(miembroId);
        if (!miembro) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

        if (String(miembro.equipo_id) !== String(req.equipoId)) {
            return res.status(403).json({ mensaje: 'No tienes permiso para eliminar a este usuario' });
        }

        if (String(miembroId) === String(req.usuario.id)) {
            return res.status(400).json({ mensaje: 'No puedes eliminarte a ti mismo del equipo' });
        }

        // Lo removemos del equipo para que no aparezca en la lista de miembros.
        await db.prepare('UPDATE usuarios SET "equipo_id" = NULL, activo = 0 WHERE id = ?').run(miembroId);

        res.json({ mensaje: `Usuario ${miembro.nombre} eliminado del equipo correctamente` });
    } catch (error) {
        console.error('Error en DELETE /api/equipos/miembro/:id/eliminar:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

module.exports = router;
