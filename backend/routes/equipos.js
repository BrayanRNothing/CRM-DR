const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../config/database');
const { auth, esTeamOwner } = require('../middleware/auth');

const ROLES_PERMITIDOS = ['vendedor'];
const TIPOS_META = ['ventas_monto', 'ventas_cantidad', 'clientes', 'actividades'];

let goalsTableReady = false;

const getPeriodo = (value) => {
    const raw = String(value || '').trim();
    if (/^\d{4}-\d{2}$/.test(raw)) return raw;
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const parseBooleanFilters = (estado) => {
    const v = String(estado || 'todos').toLowerCase();
    if (v === 'activo') return 1;
    if (v === 'inactivo') return 0;
    return null;
};

const ensureGoalsTable = async () => {
    if (goalsTableReady) return;
    await db.exec(`
        CREATE TABLE IF NOT EXISTS team_goals (
            id SERIAL PRIMARY KEY,
            equipo_id INTEGER NOT NULL,
            miembro_id INTEGER NOT NULL,
            tipo VARCHAR(50) NOT NULL,
            periodo VARCHAR(7) NOT NULL,
            objetivo NUMERIC NOT NULL DEFAULT 0,
            creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (equipo_id, miembro_id, tipo, periodo)
        )
    `);
    goalsTableReady = true;
};

const csvEscape = (value) => {
    const s = String(value ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
};

// @route   GET /api/equipos/mi-equipo
// @desc    Obtener info del equipo actual + lista de miembros
// @access  Private
router.get('/mi-equipo', auth, async (req, res) => {
    try {
        const equipoId = req.usuario.equipo_id;
        const estado = parseBooleanFilters(req.query.estado);
        const busqueda = String(req.query.busqueda || '').trim();

        if (!equipoId) {
            return res.status(404).json({ mensaje: 'No estás asignado a ningún equipo' });
        }

        // Info del equipo
        const equipo = await db.prepare('SELECT id, nombre, owner_id, "fechaCreacion" FROM equipos WHERE id = ?').get(equipoId);
        if (!equipo) {
            return res.status(404).json({ mensaje: 'Equipo no encontrado' });
        }

        // Miembros del equipo
        let miembrosSql = 'SELECT id, usuario, nombre, rol, email, telefono, activo, "equipo_id", googleRefreshToken FROM usuarios WHERE "equipo_id" = ?';
        const params = [equipoId];

        if (estado !== null) {
            miembrosSql += ' AND activo = ?';
            params.push(estado);
        }
        if (busqueda) {
            miembrosSql += " AND (LOWER(nombre) LIKE LOWER(?) OR LOWER(usuario) LIKE LOWER(?) OR LOWER(COALESCE(email, '')) LIKE LOWER(?))";
            const like = `%${busqueda}%`;
            params.push(like, like, like);
        }

        miembrosSql += ' ORDER BY nombre ASC';
        const miembros = await db.prepare(miembrosSql).all(...params);

        const resumen = await db.prepare(
            'SELECT COUNT(*) AS total, SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) AS activos, SUM(CASE WHEN activo = 0 THEN 1 ELSE 0 END) AS inactivos FROM usuarios WHERE "equipo_id" = ?'
        ).get(equipoId);

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
                activo: !!m.activo,
                googleLinked: !!m.googleRefreshToken
            })),
            resumen: {
                total: Number(resumen?.total || 0),
                activos: Number(resumen?.activos || 0),
                inactivos: Number(resumen?.inactivos || 0)
            }
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
        const { usuario, contraseña, nombre, email, telefono } = req.body;
        const rol = 'vendedor';

        if (!usuario || !contraseña || !nombre) {
            return res.status(400).json({ mensaje: 'Complete los campos requeridos: usuario, contraseña, nombre' });
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
        
        // Registrar actividad de equipo
        try {
            await db.prepare('INSERT INTO actividades (tipo, vendedor, descripcion, resultado) VALUES (?, ?, ?, ?)')
                .run('equipo', req.usuario.id, `Nuevo miembro añadido al equipo: ${newUser.usuario}`, 'exitoso');
        } catch (actError) {
            console.error('Error al registrar actividad de equipo:', actError);
        }

        res.status(201).json({
            mensaje: 'Miembro agregado al equipo exitosamente',
            usuario: newUser
        });
    } catch (error) {
        console.error('Error en POST /api/equipos/agregar-miembro:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

// @route   PUT /api/equipos/miembro/:id
// @desc    Editar datos de un miembro del equipo
// @access  Private (Team Owner)
router.put('/miembro/:id', auth, esTeamOwner, async (req, res) => {
    try {
        const miembroId = parseInt(req.params.id, 10);
        const { nombre, email, telefono } = req.body;

        const miembro = await db.prepare('SELECT id, "equipo_id" FROM usuarios WHERE id = ?').get(miembroId);
        if (!miembro) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }
        if (String(miembro.equipo_id) !== String(req.equipoId)) {
            return res.status(403).json({ mensaje: 'No tienes permiso para editar este usuario' });
        }

        const updates = [];
        const params = [];
        if (typeof nombre === 'string' && nombre.trim()) {
            updates.push('nombre = ?');
            params.push(nombre.trim());
        }
        if (typeof email === 'string') {
            updates.push('email = ?');
            params.push(email.trim());
        }
        if (typeof telefono === 'string') {
            updates.push('telefono = ?');
            params.push(telefono.trim());
        }
        if (updates.length === 0) {
            return res.status(400).json({ mensaje: 'No hay campos para actualizar' });
        }

        await db.prepare(`UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`).run(...params, miembroId);
        const usuario = await db.prepare('SELECT id, usuario, nombre, rol, email, telefono, activo FROM usuarios WHERE id = ?').get(miembroId);
        res.json({ mensaje: 'Miembro actualizado', usuario });
    } catch (error) {
        console.error('Error en PUT /api/equipos/miembro/:id:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

// @route   PATCH /api/equipos/miembro/:id/reactivar
// @desc    Reactivar un miembro inactivo del equipo
// @access  Private (Team Owner)
router.patch('/miembro/:id/reactivar', auth, esTeamOwner, async (req, res) => {
    try {
        const miembroId = parseInt(req.params.id, 10);
        const miembro = await db.prepare('SELECT id, nombre, "equipo_id" FROM usuarios WHERE id = ?').get(miembroId);

        if (!miembro) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }
        if (String(miembro.equipo_id) !== String(req.equipoId)) {
            return res.status(403).json({ mensaje: 'No tienes permiso para reactivar a este usuario' });
        }

        await db.prepare('UPDATE usuarios SET activo = 1 WHERE id = ?').run(miembroId);
        res.json({ mensaje: `Usuario ${miembro.nombre} reactivado correctamente` });
    } catch (error) {
        console.error('Error en PATCH /api/equipos/miembro/:id/reactivar:', error);
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

// @route   GET /api/equipos/mi-equipo/metricas
// @desc    Métricas por miembro del equipo (ventas, actividades, leads)
// @access  Private
router.get('/mi-equipo/metricas', auth, async (req, res) => {
    try {
        const equipoId = req.usuario.equipo_id;
        const periodo = getPeriodo(req.query.periodo);

        if (!equipoId) {
            return res.json({ periodo, metricas: [], noTeam: true, mensaje: 'No estás asignado a ningún equipo' });
        }

        await ensureGoalsTable();

        const miembros = await db.prepare(
            'SELECT id, nombre, usuario, rol, activo FROM usuarios WHERE "equipo_id" = ? ORDER BY nombre ASC'
        ).all(equipoId);

        const leadsRows = await db.prepare(
            'SELECT vendedorAsignado AS miembro_id, COUNT(*) AS total FROM clientes WHERE "equipo_id" = ? GROUP BY vendedorAsignado'
        ).all(equipoId);

        const ventasRows = await db.prepare(
            `SELECT u.id AS miembro_id, COUNT(v.id) AS cantidad, COALESCE(SUM(v.monto), 0) AS monto
             FROM usuarios u
             LEFT JOIN ventas v ON v.vendedor = u.id AND TO_CHAR(v.fecha::timestamp, 'YYYY-MM') = ?
             WHERE u."equipo_id" = ?
             GROUP BY u.id`
        ).all(periodo, equipoId);

        const actividadesRows = await db.prepare(
            `SELECT u.id AS miembro_id, COUNT(a.id) AS total
             FROM usuarios u
             LEFT JOIN actividades a ON a.vendedor = u.id AND TO_CHAR(a.fecha::timestamp, 'YYYY-MM') = ?
             WHERE u."equipo_id" = ?
             GROUP BY u.id`
        ).all(periodo, equipoId);

        const goalsRows = await db.prepare(
            'SELECT id, miembro_id, tipo, objetivo, periodo FROM team_goals WHERE equipo_id = ? AND periodo = ?'
        ).all(equipoId, periodo);

        const leadsMap = new Map(leadsRows.map(r => [String(r.miembro_id), Number(r.total || 0)]));
        const ventasMap = new Map(ventasRows.map(r => [String(r.miembro_id), { cantidad: Number(r.cantidad || 0), monto: Number(r.monto || 0) }]));
        const actMap = new Map(actividadesRows.map(r => [String(r.miembro_id), Number(r.total || 0)]));
        const goalsByMember = new Map();
        goalsRows.forEach(goal => {
            const key = String(goal.miembro_id);
            if (!goalsByMember.has(key)) goalsByMember.set(key, []);
            goalsByMember.get(key).push({
                id: goal.id,
                tipo: goal.tipo,
                objetivo: Number(goal.objetivo || 0),
                periodo: goal.periodo
            });
        });

        const metricas = miembros.map(m => {
            const memberId = String(m.id);
            const leads = leadsMap.get(memberId) || 0;
            const ventas = ventasMap.get(memberId) || { cantidad: 0, monto: 0 };
            const actividades = actMap.get(memberId) || 0;
            const conversion = leads > 0 ? Number(((ventas.cantidad / leads) * 100).toFixed(2)) : 0;

            const goals = (goalsByMember.get(memberId) || []).map(g => {
                let actual = 0;
                if (g.tipo === 'ventas_monto') actual = ventas.monto;
                if (g.tipo === 'ventas_cantidad') actual = ventas.cantidad;
                if (g.tipo === 'clientes') actual = leads;
                if (g.tipo === 'actividades') actual = actividades;
                const progreso = g.objetivo > 0 ? Number(((actual / g.objetivo) * 100).toFixed(2)) : 0;

                return { ...g, actual: Number(actual), progreso };
            });

            return {
                miembro: {
                    id: m.id,
                    nombre: m.nombre,
                    usuario: m.usuario,
                    rol: m.rol,
                    activo: !!m.activo
                },
                leads,
                ventasCantidad: ventas.cantidad,
                ventasMonto: Number(ventas.monto.toFixed(2)),
                actividades,
                conversion,
                goals
            };
        });

        res.json({ periodo, metricas });
    } catch (error) {
        console.error('Error en GET /api/equipos/mi-equipo/metricas:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

// @route   GET /api/equipos/metas
// @desc    Obtener metas del equipo por periodo
// @access  Private
router.get('/metas', auth, async (req, res) => {
    try {
        const equipoId = req.usuario.equipo_id;
        if (!equipoId) {
            return res.status(404).json({ mensaje: 'No estás asignado a ningún equipo' });
        }

        await ensureGoalsTable();
        const periodo = getPeriodo(req.query.periodo);
        const metas = await db.prepare(
            'SELECT id, equipo_id, miembro_id, tipo, objetivo, periodo FROM team_goals WHERE equipo_id = ? AND periodo = ? ORDER BY miembro_id ASC'
        ).all(equipoId, periodo);

        res.json({ periodo, metas: metas.map(m => ({ ...m, objetivo: Number(m.objetivo || 0) })) });
    } catch (error) {
        console.error('Error en GET /api/equipos/metas:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

// @route   POST /api/equipos/metas
// @desc    Crear o actualizar meta de miembro
// @access  Private (Team Owner)
router.post('/metas', auth, esTeamOwner, async (req, res) => {
    try {
        const { miembro_id, tipo, objetivo, periodo } = req.body;
        const miembroId = parseInt(miembro_id, 10);
        const objetivoNum = Number(objetivo);
        const periodoNormalizado = getPeriodo(periodo);

        if (!miembroId || !TIPOS_META.includes(tipo) || !Number.isFinite(objetivoNum) || objetivoNum < 0) {
            return res.status(400).json({ mensaje: 'Datos de meta inválidos' });
        }

        await ensureGoalsTable();

        const miembro = await db.prepare('SELECT id, "equipo_id" FROM usuarios WHERE id = ?').get(miembroId);
        if (!miembro || String(miembro.equipo_id) !== String(req.equipoId)) {
            return res.status(403).json({ mensaje: 'El miembro no pertenece a tu equipo' });
        }

        await db.prepare(
            `INSERT INTO team_goals (equipo_id, miembro_id, tipo, objetivo, periodo)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT (equipo_id, miembro_id, tipo, periodo)
             DO UPDATE SET objetivo = EXCLUDED.objetivo, actualizado_en = CURRENT_TIMESTAMP`
        ).run(req.equipoId, miembroId, tipo, objetivoNum, periodoNormalizado);

        const meta = await db.prepare(
            'SELECT id, equipo_id, miembro_id, tipo, objetivo, periodo FROM team_goals WHERE equipo_id = ? AND miembro_id = ? AND tipo = ? AND periodo = ?'
        ).get(req.equipoId, miembroId, tipo, periodoNormalizado);

        res.status(201).json({ mensaje: 'Meta guardada correctamente', meta: { ...meta, objetivo: Number(meta.objetivo || 0) } });
    } catch (error) {
        console.error('Error en POST /api/equipos/metas:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

// @route   GET /api/equipos/exportar-miembros.csv
// @desc    Exportar miembros del equipo a CSV
// @access  Private (Team Owner)
router.get('/exportar-miembros.csv', auth, esTeamOwner, async (req, res) => {
    try {
        const estado = parseBooleanFilters(req.query.estado);
        const busqueda = String(req.query.busqueda || '').trim();

        let sql = 'SELECT id, usuario, nombre, rol, email, telefono, activo FROM usuarios WHERE "equipo_id" = ?';
        const params = [req.equipoId];

        if (estado !== null) {
            sql += ' AND activo = ?';
            params.push(estado);
        }
        if (busqueda) {
            sql += " AND (LOWER(nombre) LIKE LOWER(?) OR LOWER(usuario) LIKE LOWER(?) OR LOWER(COALESCE(email, '')) LIKE LOWER(?))";
            const like = `%${busqueda}%`;
            params.push(like, like, like);
        }
        sql += ' ORDER BY nombre ASC';

        const rows = await db.prepare(sql).all(...params);

        const header = ['id', 'usuario', 'nombre', 'rol', 'email', 'telefono', 'activo'];
        const lines = [header.join(',')];

        rows.forEach(row => {
            lines.push([
                csvEscape(row.id),
                csvEscape(row.usuario),
                csvEscape(row.nombre),
                csvEscape(row.rol),
                csvEscape(row.email || ''),
                csvEscape(row.telefono || ''),
                csvEscape(row.activo ? 'activo' : 'inactivo')
            ].join(','));
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="miembros_equipo_${Date.now()}.csv"`);
        res.status(200).send(lines.join('\n'));
    } catch (error) {
        console.error('Error en GET /api/equipos/exportar-miembros.csv:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

module.exports = router;
