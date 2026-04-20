const jwt = require('jsonwebtoken');
const { db } = require('../config/database');

/**
 * Middleware para verificar el token JWT
 */
const auth = async (req, res, next) => {
    try {
        // Soporte para x-auth-token header o Authorization: Bearer <token>
        const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ mensaje: 'No hay token, autorización denegada' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

        // Verificar que el usuario exista y esté activo — incluye equipo_id
        const row = await db.prepare('SELECT id, usuario, nombre, rol, email, telefono, activo, "equipo_id" FROM usuarios WHERE id = ?').get(decoded.id);

        if (!row) {
            return res.status(401).json({ mensaje: 'Token inválido - Usuario no encontrado' });
        }

        if (row.activo === 0 || row.activo === false) {
            return res.status(401).json({ mensaje: 'Usuario desactivado' });
        }

        // Añadir usuario al request (normalizando id a string por si acaso)
        req.usuario = { ...row, id: String(row.id), _id: String(row.id) };
        next();
    } catch (error) {
        console.error('Auth error:', error.message);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ mensaje: 'Sesión expirada. Por favor inicia sesión de nuevo.', code: 'TOKEN_EXPIRED' });
        }
        res.status(401).json({ mensaje: 'Token inválido' });
    }
};

/**
 * Middleware para verificar si el usuario puede operar módulos internos.
 */
const esSuperUser = (req, res, next) => {
    if (!req.usuario) {
        return res.status(401).json({ mensaje: 'Usuario no autenticado' });
    }

    const rolesPermitidos = ['admin', 'vendedor'];

    if (rolesPermitidos.includes(req.usuario.rol)) {
        next();
    } else {
        return res.status(403).json({ mensaje: 'Acceso denegado. Rol no autorizado.' });
    }
};

/**
 * Middleware para verificar si el usuario autenticado es el Team Owner de su equipo.
 * Requiere que auth() haya corrido primero.
 */
const esTeamOwner = async (req, res, next) => {
    try {
        if (!req.usuario) {
            return res.status(401).json({ mensaje: 'Usuario no autenticado' });
        }

        const equipo = await db.prepare('SELECT id FROM equipos WHERE owner_id = ?').get(req.usuario.id);

        if (!equipo) {
            return res.status(403).json({ mensaje: 'Solo el propietario del equipo puede realizar esta acción' });
        }

        // Exponer el equipoId en el request para las rutas que lo necesiten
        req.equipoId = equipo.id;
        next();
    } catch (error) {
        console.error('esTeamOwner error:', error.message);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
};

/**
 * Middleware: permite acceso a los dos admins root del sistema.
 */
const esAdminUnico = async (req, res, next) => {
    try {
        if (!req.usuario) {
            return res.status(401).json({ mensaje: 'Usuario no autenticado' });
        }

        if (req.usuario.rol !== 'admin') {
            return res.status(403).json({ mensaje: 'Acceso denegado. Se requiere admin root.' });
        }

        const adminsRoot = await db.prepare('SELECT id, usuario FROM usuarios WHERE rol = ? ORDER BY id ASC LIMIT 2').all('admin');
        if (!adminsRoot || adminsRoot.length === 0) {
            return res.status(403).json({ mensaje: 'No existe admin root configurado' });
        }

        const requesterId = String(req.usuario.id);
        const requesterUsername = String(req.usuario.usuario || '').toLowerCase();
        const isRootAdmin = adminsRoot.some((admin) => {
            const sameId = String(admin.id) === requesterId;
            const sameUsername = String(admin.usuario || '').toLowerCase() === requesterUsername;
            return sameId && sameUsername;
        });

        if (!isRootAdmin) {
            return res.status(403).json({ mensaje: 'Solo los admins root pueden realizar esta acción' });
        }

        next();
    } catch (error) {
        console.error('esAdminUnico error:', error.message);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
};

module.exports = { auth, esSuperUser, esTeamOwner, esAdminUnico };
