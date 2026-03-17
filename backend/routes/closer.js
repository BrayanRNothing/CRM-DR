const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth } = require('../middleware/auth');
const { toMongoFormat, toMongoFormatMany } = require('../lib/helpers');

const esCloser = (req, res, next) => {
    if (req.usuario.rol !== 'closer') {
        return res.status(403).json({ msg: 'Acceso denegado. Solo closers.' });
    }
    next();
};

router.get('/dashboard', [auth, esCloser], async (req, res) => {
    try {
        const closerId = parseInt(req.usuario.id);
        const { rows: clientes } = await pool.query('SELECT * FROM clientes WHERE "closerAsignado" = $1', [closerId]);

        const embudo = {
            total: clientes.length,
            reunion_agendada: clientes.filter(c => c.etapaEmbudo === 'reunion_agendada').length,
            reunion_realizada: clientes.filter(c => c.etapaEmbudo === 'reunion_realizada').length,
            en_negociacion: clientes.filter(c => c.etapaEmbudo === 'en_negociacion').length,
            venta_ganada: clientes.filter(c => c.etapaEmbudo === 'venta_ganada').length,
            perdido: clientes.filter(c => c.etapaEmbudo === 'perdido').length
        };

        const hoyInicio = new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z';
        const hoyFin = new Date().toISOString().slice(0, 10) + 'T23:59:59.999Z';
        const { rows: reunionesHoy } = await pool.query(
            'SELECT * FROM actividades WHERE vendedor = $1 AND tipo = $2 AND fecha >= $3 AND fecha <= $4',
            [closerId, 'cita', hoyInicio, hoyFin]
        );

        const inicioMes = new Date();
        inicioMes.setDate(1);
        inicioMes.setHours(0, 0, 0, 0);
        const { rows: ventasMes } = await pool.query(
            'SELECT * FROM ventas WHERE vendedor = $1 AND fecha >= $2',
            [closerId, inicioMes.toISOString()]
        );
        const montoTotalMes = ventasMes.reduce((sum, v) => sum + (parseFloat(v.monto) || 0), 0);

        const totalReuniones = embudo.reunion_realizada + embudo.en_negociacion + embudo.venta_ganada + embudo.perdido;
        const tasasConversion = {
            asistencia: embudo.total > 0 ? ((totalReuniones / embudo.total) * 100).toFixed(1) : 0,
            negociacion: totalReuniones > 0 ? (((embudo.en_negociacion + embudo.venta_ganada) / totalReuniones) * 100).toFixed(1) : 0,
            cierre: (embudo.en_negociacion + embudo.venta_ganada) > 0 ? ((embudo.venta_ganada / (embudo.en_negociacion + embudo.venta_ganada)) * 100).toFixed(1) : 0,
            global: embudo.total > 0 ? ((embudo.venta_ganada / embudo.total) * 100).toFixed(1) : 0
        };
        tasasConversion.interes = tasasConversion.negociacion;

        res.json({
            embudo,
            metricas: {
                reuniones: { hoy: reunionesHoy.length, pendientes: embudo.reunion_agendada, realizadas: totalReuniones },
                ventas: { mes: ventasMes.length, montoMes: montoTotalMes, totales: embudo.venta_ganada },
                negociaciones: { activas: embudo.en_negociacion }
            },
            tasasConversion
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

router.get('/calendario', [auth, esCloser], async (req, res) => {
    try {
        const closerId = parseInt(req.usuario.id);
        const { rows } = await pool.query(`
            SELECT a.*, c.nombres as c_nombres, c."apellidoPaterno" as c_apellido, c.empresa as c_empresa,
            c.telefono as c_telefono, c.correo as c_correo, c."etapaEmbudo" as c_etapa,
            u.nombre as v_nombre FROM actividades a
            JOIN clientes c ON a.cliente = c.id
            JOIN usuarios u ON a.vendedor = u.id
            WHERE a.vendedor = $1 AND a.tipo = $2
            ORDER BY a.fecha ASC
        `, [closerId, 'cita']);
        const reuniones = rows.map(r => ({
            ...toMongoFormat(r),
            clienteId: r.cliente,
            cliente: { nombres: r.c_nombres, apellidoPaterno: r.c_apellido, empresa: r.c_empresa, telefono: r.c_telefono, correo: r.c_correo, etapaEmbudo: r.c_etapa },
            vendedor: { nombre: r.v_nombre }
        }));
        res.json(reuniones);
    } catch (error) {
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

router.get('/reuniones-pendientes', [auth, esCloser], async (req, res) => {
    try {
        const closerId = parseInt(req.usuario.id);
        const { rows } = await pool.query(`
            SELECT c.*, u.nombre as "prospectorNombre" FROM clientes c
            LEFT JOIN usuarios u ON c."prospectorAsignado" = u.id
            WHERE c."closerAsignado" = $1 AND c."etapaEmbudo" = $2
        `, [closerId, 'reunion_agendada']);
        const clientes = rows.map(r => {
            const { prospectorNombre, ...c } = r;
            const out = toMongoFormat(c);
            if (out) out.prospectorAsignado = { nombre: prospectorNombre };
            return out;
        });
        res.json(clientes);
    } catch (error) {
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

router.get('/prospectos', [auth, esCloser], async (req, res) => {
    try {
        const closerId = parseInt(req.usuario.id);
        const { rows } = await pool.query(`
            SELECT c.*, u.nombre as "prospectorNombre" FROM clientes c
            LEFT JOIN usuarios u ON c."prospectorAsignado" = u.id
            WHERE c."closerAsignado" = $1
            ORDER BY c."fechaTransferencia" DESC
        `, [closerId]);
        res.json(rows.map(r => {
            const { prospectorNombre, ...c } = r;
            const out = toMongoFormat(c);
            if (out) out.prospectorAsignado = { nombre: prospectorNombre };
            return out;
        }));
    } catch (error) {
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

router.post('/registrar-reunion', [auth, esCloser], async (req, res) => {
    try {
        const { clienteId, asistio, resultado, notas } = req.body;
        if (!clienteId || asistio === undefined) return res.status(400).json({ msg: 'Datos requeridos' });
        const cid = parseInt(clienteId);
        const closerId = parseInt(req.usuario.id);
        const check = await pool.query('SELECT * FROM clientes WHERE id = $1', [cid]);
        const c = check.rows[0];
        if (!c || parseInt(c.closerAsignado) !== closerId) return res.status(403).json({ msg: 'No autorizado' });

        const etapaNueva = asistio ? (resultado === 'venta' ? 'venta_ganada' : resultado === 'negociacion' ? 'en_negociacion' : 'reunion_realizada') : 'perdido';
        const now = new Date().toISOString();
        const hist = c.historialEmbudo ? JSON.parse(c.historialEmbudo) : [];
        hist.push({ etapa: etapaNueva, fecha: now, vendedor: closerId });
        const estado = etapaNueva === 'venta_ganada' ? 'ganado' : etapaNueva === 'perdido' ? 'perdido' : 'proceso';

        await pool.query(
            'UPDATE clientes SET "etapaEmbudo" = $1, estado = $2, "fechaUltimaEtapa" = $3, "ultimaInteraccion" = $4, "historialEmbudo" = $5 WHERE id = $6',
            [etapaNueva, estado, now, now, JSON.stringify(hist), cid]
        );
        await pool.query(
            'INSERT INTO actividades (tipo, vendedor, cliente, descripcion, resultado, notas) VALUES ($1, $2, $3, $4, $5, $6)',
            ['cita', closerId, cid, 'Reunión registrada', asistio ? 'exitoso' : 'fallido', notas || '']
        );

        const { rows } = await pool.query('SELECT * FROM clientes WHERE id = $1', [cid]);
        res.json({ msg: 'Reunión registrada', cliente: toMongoFormat(rows[0]) || rows[0] });
    } catch (error) {
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

module.exports = router;
