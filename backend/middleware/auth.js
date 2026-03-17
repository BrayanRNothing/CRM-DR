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

        // Verificar que el usuario exista y esté activo
        const row = await db.prepare('SELECT id, usuario, nombre, rol, email, telefono, activo FROM usuarios WHERE id = ?').get(decoded.id);

        if (!row) {
            return res.status(401).json({ mensaje: 'Token inválido - Usuario no encontrado' });
        }

        if (!row.activo) {
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
 * Middleware para verificar si es superusuario (closer o prospector)
 * En el sistema v2.0 ambos roles tienen permisos totales.
 */
const esSuperUser = (req, res, next) => {
    if (!req.usuario) {
        return res.status(401).json({ mensaje: 'Usuario no autenticado' });
    }

    // Lista de roles permitidos (ya no existe admin/vendedor, pero se mantiene lógica limpia)
    const rolesPermitidos = ['closer', 'prospector'];

    if (rolesPermitidos.includes(req.usuario.rol)) {
        next();
    } else {
        return res.status(403).json({ mensaje: 'Acceso denegado. Rol no autorizado.' });
    }
};

module.exports = { auth, esSuperUser };
