const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../config/database');
const { auth, esSuperUser, esAdminUnico } = require('../middleware/auth');

const ROLES_PERMITIDOS = ['vendedor'];

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
    googleLinked: !!(row.googleRefreshToken || row.googleAccessToken)
});

const formatTeamOwner = (row) => ({
    id: row.id,
    usuario: row.usuario,
    nombre: row.nombre,
    rol: row.rol,
    email: row.email,
    telefono: row.telefono,
    activo: !!row.activo,
    equipo: {
        id: row.team_id,
        nombre: row.team_name,
        fechaCreacion: row.team_created
    }
});

const formatTeamMember = (row) => ({
    id: row.id,
    usuario: row.usuario,
    nombre: row.nombre,
    rol: row.rol,
    email: row.email,
    telefono: row.telefono,
    activo: !!row.activo,
    fechaCreacion: row.fechaCreacion,
    googleLinked: !!(row.googleRefreshToken || row.googleAccessToken)
});

// @route   GET api/usuarios/team-owners
// @desc    Listar propietarios de equipo
// @access  Private (Admins root)
router.get('/team-owners', auth, esAdminUnico, async (req, res) => {
    try {
        const rows = await db.prepare(
            `SELECT
                u.id,
                u.usuario,
                u.nombre,
                u.rol,
                u.email,
                u.telefono,
                u.activo,
                e.id AS team_id,
                e.nombre AS team_name,
                e."fechaCreacion" AS team_created
            FROM usuarios u
            INNER JOIN equipos e ON e.owner_id = u.id
            WHERE u.activo = 1 AND u.rol <> 'admin'
            ORDER BY e."fechaCreacion" DESC, u.nombre ASC`
        ).all();

        const miembrosRows = await db.prepare(
            `SELECT
                u.id,
                u.usuario,
                u.nombre,
                u.rol,
                u.email,
                u.telefono,
                u.activo,
                u.fechaCreacion,
                u.googleRefreshToken,
                u.googleAccessToken,
                u."equipo_id" AS team_id
            FROM usuarios u
            WHERE u.activo = 1 AND u."equipo_id" IS NOT NULL AND u.rol <> 'admin'
            ORDER BY u.nombre ASC`
        ).all();

        const miembrosByTeam = new Map();
        for (const miembro of miembrosRows) {
            const teamId = String(miembro.team_id);
            const current = miembrosByTeam.get(teamId) || [];
            current.push(formatTeamMember(miembro));
            miembrosByTeam.set(teamId, current);
        }

        res.json(rows.map((row) => ({
            ...formatTeamOwner(row),
            miembros: miembrosByTeam.get(String(row.team_id))?.filter((miembro) => String(miembro.id) !== String(row.id)) || [],
            miembrosCount: miembrosByTeam.get(String(row.team_id))?.filter((miembro) => String(miembro.id) !== String(row.id)).length || 0
        })));
    } catch (error) {
        console.error('Error en GET /api/usuarios/team-owners:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

// @route   POST api/usuarios/team-owners
// @desc    Crear un propietario de equipo (usuario + equipo propio)
// @access  Private (Admins root)
router.post('/team-owners', auth, esAdminUnico, async (req, res) => {
    try {
        const { usuario, contraseña, nombre, email, telefono, equipoNombre } = req.body;

        if (!usuario || !contraseña || !nombre) {
            return res.status(400).json({ mensaje: 'Complete usuario, contraseña y nombre' });
        }

        const existeUsuario = await db.prepare('SELECT id FROM usuarios WHERE LOWER(usuario) = LOWER(?)').get(usuario.trim());
        if (existeUsuario) {
            return res.status(400).json({ mensaje: 'El nombre de usuario ya está en uso' });
        }

        if (email && email.trim()) {
            const existeEmail = await db.prepare('SELECT id FROM usuarios WHERE LOWER(email) = LOWER(?)').get(email.trim());
            if (existeEmail) {
                return res.status(400).json({ mensaje: 'El email ya está en uso' });
            }
        }

        const hash = await bcrypt.hash(contraseña, 10);

        const userInsert = await db.prepare(
            'INSERT INTO usuarios (usuario, contraseña, rol, nombre, email, telefono, activo) VALUES (?, ?, ?, ?, ?, ?, 1)'
        ).run(
            usuario.trim(),
            hash,
            'vendedor',
            nombre.trim(),
            (email || '').trim(),
            (telefono || '').trim()
        );

        const ownerId = userInsert.lastInsertRowid;
        const nombreEquipo = (equipoNombre || `Equipo de ${nombre.trim()}`).trim();

        const teamInsert = await db.prepare('INSERT INTO equipos (nombre, owner_id) VALUES (?, ?)').run(nombreEquipo, ownerId);
        await db.prepare('UPDATE usuarios SET "equipo_id" = ? WHERE id = ?').run(teamInsert.lastInsertRowid, ownerId);

        const created = await db.prepare(
            `SELECT
                u.id,
                u.usuario,
                u.nombre,
                u.rol,
                u.email,
                u.telefono,
                u.activo,
                e.id AS team_id,
                e.nombre AS team_name,
                e."fechaCreacion" AS team_created
             FROM usuarios u
             INNER JOIN equipos e ON e.owner_id = u.id
             WHERE u.id = ?`
        ).get(ownerId);

        res.status(201).json({
            mensaje: 'Propietario de equipo creado exitosamente',
            owner: formatTeamOwner(created)
        });
    } catch (error) {
        console.error('Error en POST /api/usuarios/team-owners:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

// @route   PUT api/usuarios/team-owners/:id
// @desc    Editar propietario de equipo
// @access  Private (Admins root)
router.put('/team-owners/:id', auth, esAdminUnico, async (req, res) => {
    try {
        const ownerId = parseInt(req.params.id, 10);
        const { usuario, nombre, email, telefono, contraseña, equipoNombre } = req.body;

        if (!ownerId) {
            return res.status(400).json({ mensaje: 'ID inválido' });
        }

        const owner = await db.prepare(
            'SELECT id, usuario, rol, "equipo_id" FROM usuarios WHERE id = ?'
        ).get(ownerId);

        if (!owner || owner.rol === 'admin') {
            return res.status(404).json({ mensaje: 'Propietario de equipo no encontrado' });
        }

        const updates = [];
        const params = [];

        if (typeof usuario === 'string' && usuario.trim()) {
            const existeUsuario = await db.prepare(
                'SELECT id FROM usuarios WHERE LOWER(usuario) = LOWER(?) AND id <> ?'
            ).get(usuario.trim(), ownerId);
            if (existeUsuario) {
                return res.status(400).json({ mensaje: 'El nombre de usuario ya está en uso' });
            }
            updates.push('usuario = ?');
            params.push(usuario.trim());
        }

        if (typeof nombre === 'string' && nombre.trim()) {
            updates.push('nombre = ?');
            params.push(nombre.trim());
        }

        if (typeof email === 'string') {
            const normalizedEmail = email.trim();
            if (normalizedEmail) {
                const existeEmail = await db.prepare(
                    'SELECT id FROM usuarios WHERE LOWER(email) = LOWER(?) AND id <> ?'
                ).get(normalizedEmail, ownerId);
                if (existeEmail) {
                    return res.status(400).json({ mensaje: 'El email ya está en uso' });
                }
            }
            updates.push('email = ?');
            params.push(normalizedEmail);
        }

        if (typeof telefono === 'string') {
            updates.push('telefono = ?');
            params.push(telefono.trim());
        }

        if (typeof contraseña === 'string' && contraseña.trim()) {
            const hash = await bcrypt.hash(contraseña.trim(), 10);
            updates.push('contraseña = ?');
            params.push(hash);
        }

        if (updates.length > 0) {
            params.push(ownerId);
            await db.prepare(`UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`).run(...params);
        }

        if (typeof equipoNombre === 'string' && equipoNombre.trim() && owner.equipo_id) {
            await db.prepare('UPDATE equipos SET nombre = ? WHERE id = ?').run(equipoNombre.trim(), owner.equipo_id);
        }

        const updated = await db.prepare(
            `SELECT
                u.id,
                u.usuario,
                u.nombre,
                u.rol,
                u.email,
                u.telefono,
                u.activo,
                e.id AS team_id,
                e.nombre AS team_name,
                e."fechaCreacion" AS team_created
             FROM usuarios u
             INNER JOIN equipos e ON e.id = u."equipo_id"
             WHERE u.id = ?`
        ).get(ownerId);

        res.json({
            mensaje: 'Propietario de equipo actualizado',
            owner: formatTeamOwner(updated)
        });
    } catch (error) {
        console.error('Error en PUT /api/usuarios/team-owners/:id:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

// @route   DELETE api/usuarios/team-owners/:id
// @desc    Borrar propietario de equipo (desactivar + liberar propiedad de equipo)
// @access  Private (Admins root)
router.delete('/team-owners/:id', auth, esAdminUnico, async (req, res) => {
    try {
        const ownerId = parseInt(req.params.id, 10);

        if (!ownerId) {
            return res.status(400).json({ mensaje: 'ID inválido' });
        }

        const owner = await db.prepare(
            'SELECT id, rol, "equipo_id" FROM usuarios WHERE id = ?'
        ).get(ownerId);

        if (!owner || owner.rol === 'admin') {
            return res.status(404).json({ mensaje: 'Propietario de equipo no encontrado' });
        }

        await db.prepare('UPDATE usuarios SET activo = 0 WHERE id = ?').run(ownerId);

        if (owner.equipo_id) {
            await db.prepare('UPDATE equipos SET owner_id = NULL WHERE id = ?').run(owner.equipo_id);
        }

        res.json({ mensaje: 'Propietario de equipo eliminado correctamente' });
    } catch (error) {
        console.error('Error en DELETE /api/usuarios/team-owners/:id:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

// @route   GET api/usuarios
// @desc    Obtener usuarios del mismo equipo
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        let rows;
        if (req.usuario.equipo_id) {
            // Devolver solo los usuarios del mismo equipo
            rows = await db.prepare(
                'SELECT id, usuario, nombre, rol, email, telefono, activo, fechaCreacion, googleRefreshToken, googleAccessToken FROM usuarios WHERE activo = 1 AND "equipo_id" = ? ORDER BY nombre ASC'
            ).all(req.usuario.equipo_id);
        } else {
            // Fallback para usuarios sin equipo asignado (no debería ocurrir tras la migración)
            rows = await db.prepare(
                'SELECT id, usuario, nombre, rol, email, telefono, activo, fechaCreacion, googleRefreshToken, googleAccessToken FROM usuarios WHERE activo = 1 ORDER BY nombre ASC'
            ).all();
        }
        res.json(rows.map(formatUser));
    } catch (error) {
        console.error("Error in GET /api/usuarios:", error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

// @route   POST api/usuarios
// @desc    Crear nuevo usuario (asignado al equipo del solicitante)
// @access  Private (Admin / Team Owner)
router.post('/', auth, esSuperUser, async (req, res) => {
    try {
        const { usuario, contraseña, nombre, email, telefono, rol } = req.body;

        if (!usuario || !contraseña || !nombre || !rol) {
            return res.status(400).json({ mensaje: 'Complete los campos requeridos' });
        }

        if (!ROLES_PERMITIDOS.includes(rol)) {
            return res.status(400).json({ mensaje: `Rol inválido. Roles permitidos: ${ROLES_PERMITIDOS.join(', ')}` });
        }

        const existe = await db.prepare('SELECT id FROM usuarios WHERE usuario = ?').get(usuario.trim());
        if (existe) return res.status(400).json({ mensaje: 'Usuario ya existe' });

        const hash = await bcrypt.hash(contraseña, 10);

        // Asignar al equipo del usuario que crea (Team Owner)
        const equipoId = req.usuario.equipo_id || null;
        const stmt = await db.prepare('INSERT INTO usuarios (usuario, contraseña, rol, nombre, email, telefono, "equipo_id") VALUES (?, ?, ?, ?, ?, ?, ?)');
        const info = await stmt.run(usuario.trim(), hash, rol, nombre.trim(), (email || '').trim(), (telefono || '').trim(), equipoId);

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
        const { nombre, email, telefono, activo, contraseña, rol } = req.body;
        const id = parseInt(req.params.id);

        const row = await db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
        if (!row) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        if (rol && !ROLES_PERMITIDOS.includes(rol)) {
            return res.status(400).json({ mensaje: `Rol inválido. Roles permitidos: ${ROLES_PERMITIDOS.join(', ')}` });
        }

        const updates = [];
        const params = [];

        if (nombre) { updates.push('nombre = ?'); params.push(nombre); }
        if (email !== undefined) { updates.push('email = ?'); params.push(email); }
        if (telefono !== undefined) { updates.push('telefono = ?'); params.push(telefono); }
        if (activo !== undefined) { updates.push('activo = ?'); params.push(activo ? 1 : 0); }
        if (rol) { updates.push('rol = ?'); params.push(rol); }
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
