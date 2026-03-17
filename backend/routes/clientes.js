const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth, esSuperUser } = require('../middleware/auth');
const { toMongoFormat } = require('../lib/helpers');

router.get('/', auth, esSuperUser, async (req, res) => {
    try {
        const { estado, busqueda } = req.query;
        const params = [];
        let idx = 1;
        let sql = 'SELECT c.*, u.nombre as "vendedorNombre" FROM clientes c JOIN usuarios u ON c."vendedorAsignado" = u.id WHERE 1=1';

        if (estado) {
            sql += ` AND c.estado = $${idx++}`;
            params.push(estado);
        }
        if (busqueda) {
            sql += ` AND (c.nombres ILIKE $${idx} OR c."apellidoPaterno" ILIKE $${idx} OR c.empresa ILIKE $${idx})`;
            params.push('%' + busqueda + '%');
            idx++;
        }
        sql += ' ORDER BY c."ultimaInteraccion" DESC';

        const { rows } = await pool.query(sql, params);
        const clientes = rows.map(r => {
            const { vendedorNombre, ...c } = r;
            const out = toMongoFormat(c);
            if (out) out.vendedorAsignado = { nombre: vendedorNombre };
            return out || c;
        });
        res.json(clientes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

router.get('/:id', auth, esSuperUser, async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT c.*, u.nombre as "vendedorNombre" FROM clientes c JOIN usuarios u ON c."vendedorAsignado" = u.id WHERE c.id = $1',
            [parseInt(req.params.id)]
        );
        const row = rows[0];
        if (!row) return res.status(404).json({ mensaje: 'Cliente no encontrado' });
        const { vendedorNombre, ...c } = row;
        const cliente = toMongoFormat(c);
        if (cliente) cliente.vendedorAsignado = { nombre: vendedorNombre };
        res.json(cliente || row);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

router.post('/', auth, esSuperUser, async (req, res) => {
    try {
        const { nombres, apellidoPaterno, apellidoMaterno, telefono, correo, empresa, estado, vendedorAsignado, etapaEmbudo } = req.body;
        if (!nombres || !apellidoPaterno || !telefono || !correo) {
            return res.status(400).json({ mensaje: 'Complete los campos requeridos' });
        }
        const vendedorId = req.usuario.rol === 'admin' && vendedorAsignado ? parseInt(vendedorAsignado) : parseInt(req.usuario.id);
        const etapa = etapaEmbudo || 'prospecto_nuevo';
        const now = new Date().toISOString();
        const hist = JSON.stringify([{ etapa, fecha: now, vendedor: vendedorId }]);

        const { rows } = await pool.query(
            `INSERT INTO clientes (nombres, "apellidoPaterno", "apellidoMaterno", telefono, correo, empresa, estado, "etapaEmbudo", "historialEmbudo", "vendedorAsignado")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [nombres, apellidoPaterno || '', apellidoMaterno || '', telefono, correo, empresa || '', estado || 'proceso', etapa, hist, vendedorId]
        );
        res.status(201).json({ mensaje: 'Cliente creado', cliente: toMongoFormat(rows[0]) || rows[0] });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

router.put('/:id', auth, esSuperUser, async (req, res) => {
    try {
        const check = await pool.query('SELECT * FROM clientes WHERE id = $1', [parseInt(req.params.id)]);
        if (!check.rows[0]) return res.status(404).json({ mensaje: 'Cliente no encontrado' });

        const { nombres, apellidoPaterno, apellidoMaterno, telefono, correo, empresa, estado, notas, vendedorAsignado } = req.body;
        const sets = [];
        const params = [];
        let idx = 1;

        if (nombres) { sets.push(`nombres = $${idx++}`); params.push(nombres); }
        if (apellidoPaterno) { sets.push(`"apellidoPaterno" = $${idx++}`); params.push(apellidoPaterno); }
        if (apellidoMaterno !== undefined) { sets.push(`"apellidoMaterno" = $${idx++}`); params.push(apellidoMaterno); }
        if (telefono) { sets.push(`telefono = $${idx++}`); params.push(telefono); }
        if (correo) { sets.push(`correo = $${idx++}`); params.push(correo); }
        if (empresa !== undefined) { sets.push(`empresa = $${idx++}`); params.push(empresa); }
        if (estado) { sets.push(`estado = $${idx++}`); params.push(estado); }
        if (notas !== undefined) { sets.push(`notas = $${idx++}`); params.push(notas); }
        if (req.usuario.rol === 'admin' && vendedorAsignado) { sets.push(`"vendedorAsignado" = $${idx++}`); params.push(parseInt(vendedorAsignado)); }
        sets.push(`"ultimaInteraccion" = $${idx++}`);
        params.push(new Date().toISOString());
        params.push(parseInt(req.params.id));

        await pool.query(`UPDATE clientes SET ${sets.join(', ')} WHERE id = $${idx}`, params);
        const { rows } = await pool.query('SELECT * FROM clientes WHERE id = $1', [parseInt(req.params.id)]);
        res.json({ mensaje: 'Cliente actualizado', cliente: toMongoFormat(rows[0]) || rows[0] });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

router.delete('/:id', auth, esSuperUser, async (req, res) => {
    try {
        const { rowCount } = await pool.query('DELETE FROM clientes WHERE id = $1', [parseInt(req.params.id)]);
        if (rowCount === 0) return res.status(404).json({ mensaje: 'Cliente no encontrado' });
        res.json({ mensaje: 'Cliente eliminado' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

router.patch('/:id/etapa', auth, esSuperUser, async (req, res) => {
    try {
        const { etapaNueva } = req.body;
        if (!etapaNueva) return res.status(400).json({ mensaje: 'etapaNueva requerida' });
        const check = await pool.query('SELECT * FROM clientes WHERE id = $1', [parseInt(req.params.id)]);
        const c = check.rows[0];
        if (!c) return res.status(404).json({ mensaje: 'Cliente no encontrado' });

        const now = new Date().toISOString();
        const hist = c.historialEmbudo ? JSON.parse(c.historialEmbudo) : [];
        hist.push({ etapa: etapaNueva, fecha: now, vendedor: parseInt(req.usuario.id) });
        let estado = 'proceso';
        if (etapaNueva === 'venta_ganada' || etapaNueva === 'ganado') estado = 'ganado';
        else if (etapaNueva === 'perdido') estado = 'perdido';

        await pool.query(
            'UPDATE clientes SET "etapaEmbudo" = $1, "fechaUltimaEtapa" = $2, "ultimaInteraccion" = $3, "historialEmbudo" = $4, estado = $5 WHERE id = $6',
            [etapaNueva, now, now, JSON.stringify(hist), estado, parseInt(req.params.id)]
        );
        const { rows } = await pool.query('SELECT * FROM clientes WHERE id = $1', [parseInt(req.params.id)]);
        res.json({ mensaje: 'Etapa actualizada', cliente: toMongoFormat(rows[0]) || rows[0] });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

module.exports = router;
