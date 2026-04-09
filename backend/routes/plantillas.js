const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { auth } = require('../middleware/auth');

const CANALES = ['general', 'whatsapp', 'correo'];
const SCOPES = ['ambos', 'prospecto', 'cliente'];

let templatesTableReady = false;

const normalizeCanal = (value) => {
    const v = String(value || 'general').toLowerCase();
    return CANALES.includes(v) ? v : 'general';
};

const normalizeScope = (value) => {
    const v = String(value || 'ambos').toLowerCase();
    return SCOPES.includes(v) ? v : 'ambos';
};

const ensureTemplatesTable = async () => {
    if (templatesTableReady) return;

    await db.exec(`
        CREATE TABLE IF NOT EXISTS message_templates (
            id SERIAL PRIMARY KEY,
            owner_id INTEGER NOT NULL,
            equipo_id INTEGER,
            nombre VARCHAR(120) NOT NULL,
            canal VARCHAR(20) NOT NULL DEFAULT 'general',
            scope VARCHAR(20) NOT NULL DEFAULT 'ambos',
            etapa VARCHAR(80),
            contenido TEXT NOT NULL,
            activo BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    templatesTableReady = true;
};

router.get('/', auth, async (req, res) => {
    try {
        await ensureTemplatesTable();

        const canal = normalizeCanal(req.query.canal || 'general');
        const scope = normalizeScope(req.query.scope || 'ambos');

        let sql = 'SELECT id, owner_id, equipo_id, nombre, canal, scope, etapa, contenido, activo, created_at, updated_at FROM message_templates WHERE owner_id = ? AND activo = TRUE';
        const params = [parseInt(req.usuario.id, 10)];

        if (req.query.canal) {
            sql += ' AND canal = ?';
            params.push(canal);
        }

        if (req.query.scope) {
            if (scope === 'ambos') {
                sql += " AND scope IN ('ambos', 'prospecto', 'cliente')";
            } else {
                sql += ' AND scope IN (?, ?)';
                params.push(scope, 'ambos');
            }
        }

        if (req.query.etapa) {
            sql += ' AND (etapa IS NULL OR etapa = ? )';
            params.push(String(req.query.etapa));
        }

        sql += ' ORDER BY updated_at DESC, id DESC';

        const rows = await db.prepare(sql).all(...params);
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener plantillas:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

router.post('/', auth, async (req, res) => {
    try {
        await ensureTemplatesTable();

        const nombre = String(req.body.nombre || '').trim();
        const contenido = String(req.body.contenido || '').trim();
        const canal = normalizeCanal(req.body.canal);
        const scope = normalizeScope(req.body.scope);
        const etapa = req.body.etapa ? String(req.body.etapa).trim() : null;

        if (!nombre || !contenido) {
            return res.status(400).json({ mensaje: 'Nombre y contenido son requeridos' });
        }

        await db.prepare(
            'INSERT INTO message_templates (owner_id, equipo_id, nombre, canal, scope, etapa, contenido, activo) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)'
        ).run(
            parseInt(req.usuario.id, 10),
            req.usuario.equipo_id || null,
            nombre,
            canal,
            scope,
            etapa,
            contenido
        );

        const row = await db.prepare('SELECT id, owner_id, equipo_id, nombre, canal, scope, etapa, contenido, activo, created_at, updated_at FROM message_templates WHERE owner_id = ? ORDER BY id DESC LIMIT 1')
            .get(parseInt(req.usuario.id, 10));

        res.status(201).json({ mensaje: 'Plantilla creada', plantilla: row });
    } catch (error) {
        console.error('Error al crear plantilla:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

router.put('/:id', auth, async (req, res) => {
    try {
        await ensureTemplatesTable();

        const id = parseInt(req.params.id, 10);
        const ownerId = parseInt(req.usuario.id, 10);

        const existing = await db.prepare('SELECT id FROM message_templates WHERE id = ? AND owner_id = ?').get(id, ownerId);
        if (!existing) {
            return res.status(404).json({ mensaje: 'Plantilla no encontrada' });
        }

        const updates = [];
        const params = [];

        if (typeof req.body.nombre === 'string' && req.body.nombre.trim()) {
            updates.push('nombre = ?');
            params.push(req.body.nombre.trim());
        }
        if (typeof req.body.contenido === 'string' && req.body.contenido.trim()) {
            updates.push('contenido = ?');
            params.push(req.body.contenido.trim());
        }
        if (req.body.canal !== undefined) {
            updates.push('canal = ?');
            params.push(normalizeCanal(req.body.canal));
        }
        if (req.body.scope !== undefined) {
            updates.push('scope = ?');
            params.push(normalizeScope(req.body.scope));
        }
        if (req.body.etapa !== undefined) {
            updates.push('etapa = ?');
            params.push(req.body.etapa ? String(req.body.etapa).trim() : null);
        }

        if (!updates.length) {
            return res.status(400).json({ mensaje: 'No hay campos para actualizar' });
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');

        await db.prepare(`UPDATE message_templates SET ${updates.join(', ')} WHERE id = ? AND owner_id = ?`).run(...params, id, ownerId);

        const row = await db.prepare('SELECT id, owner_id, equipo_id, nombre, canal, scope, etapa, contenido, activo, created_at, updated_at FROM message_templates WHERE id = ? AND owner_id = ?')
            .get(id, ownerId);

        res.json({ mensaje: 'Plantilla actualizada', plantilla: row });
    } catch (error) {
        console.error('Error al actualizar plantilla:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

router.delete('/:id', auth, async (req, res) => {
    try {
        await ensureTemplatesTable();

        const id = parseInt(req.params.id, 10);
        const ownerId = parseInt(req.usuario.id, 10);

        const existing = await db.prepare('SELECT id FROM message_templates WHERE id = ? AND owner_id = ?').get(id, ownerId);
        if (!existing) {
            return res.status(404).json({ mensaje: 'Plantilla no encontrada' });
        }

        await db.prepare('DELETE FROM message_templates WHERE id = ? AND owner_id = ?').run(id, ownerId);
        res.json({ mensaje: 'Plantilla eliminada' });
    } catch (error) {
        console.error('Error al eliminar plantilla:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

module.exports = router;
