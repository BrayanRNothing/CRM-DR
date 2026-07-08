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

        // Verificar que el usuario exista y esté activo — incluye equipo_id y estado del plan
        const row = await db.prepare('SELECT id, usuario, nombre, rol, email, telefono, activo, "equipo_id", plan_activo, plan_vencimiento FROM usuarios WHERE id = ?').get(decoded.id);

        if (!row) {
            return res.status(401).json({ mensaje: 'Token inválido - Usuario no encontrado' });
        }

        if (row.activo === 0 || row.activo === false) {
            return res.status(401).json({ mensaje: 'Usuario desactivado' });
        }

        // Si el usuario pertenece a un equipo y no es el dueño, heredar estado de membresía
        if (row.equipo_id) {
            const equipo = await db.prepare('SELECT owner_id FROM equipos WHERE id = ?').get(row.equipo_id);
            if (equipo && equipo.owner_id !== row.id) {
                const owner = await db.prepare('SELECT plan_activo, plan_vencimiento FROM usuarios WHERE id = ?').get(equipo.owner_id);
                if (owner) {
                    row.plan_activo = owner.plan_activo;
                    row.plan_vencimiento = owner.plan_vencimiento;
                }
            }
        }

        // ── Verificación de suscripción con periodo de gracia de 3 días ──
        // Solo aplicar a cuentas que tienen plan (stripe). Si plan_activo es null → cuenta admin/demo sin plan.
        if (row.plan_activo === false || row.plan_activo === 0) {
            if (row.plan_vencimiento) {
                const vencimiento = new Date(row.plan_vencimiento);
                const graciaHasta = new Date(vencimiento.getTime() + (3 * 24 * 60 * 60 * 1000)); // +3 días
                const ahora = new Date();

                if (ahora > graciaHasta) {
                    // Periodo de gracia expirado → bloquear acceso excepto a rutas vitales
                    const exemptPaths = ['/api/auth/me', '/api/auth/billing-portal'];
                    const path = req.originalUrl.split('?')[0];
                    if (!exemptPaths.includes(path)) {
                        return res.status(403).json({
                            mensaje: 'Tu suscripción ha expirado. Renueva tu plan para continuar usando el CRM.',
                            code: 'PLAN_EXPIRED'
                        });
                    } else {
                        req.planExpirado = true; // Flag for downstream if needed
                    }
                } else {
                    // Dentro del periodo de gracia → permitir acceso pero avisar
                    const diasRestantes = Math.ceil((graciaHasta - ahora) / (1000 * 60 * 60 * 24));
                    req.planEnGracia = true;
                    req.diasGracia = diasRestantes;
                }
            }
            // Si no hay plan_vencimiento, es una cuenta sin stripe (admin/demo) → dejar pasar
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
