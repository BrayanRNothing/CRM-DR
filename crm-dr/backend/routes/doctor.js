const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { auth } = require('../middleware/auth');
const { toMongoFormat } = require('../lib/helpers');

const esDoctor = (req, res, next) => {
    const rol = String(req.usuario.rol).toLowerCase();
    if (rol !== 'individual' && rol !== 'doctor' && rol !== 'admin' && rol !== 'closer' && rol !== 'prospector') {
        return res.status(403).json({ msg: 'Acceso denegado. Rol no autorizado.' });
    }
    next();
};

// Helper: calcula métricas para un período dado
async function calcularPeriodoActividades(db, prospectorId, filtroFecha) {
    const where = filtroFecha ? `AND ${filtroFecha}` : '';
    const row = await db.prepare(
        `SELECT COUNT(*) as c FROM actividades WHERE vendedor = ? AND tipo = 'llamada' ${where}`
    ).get(prospectorId);
    const llamadas = row?.c || 0;

    const row2 = await db.prepare(
        `SELECT COUNT(*) as c FROM actividades WHERE vendedor = ? AND tipo IN ('whatsapp','correo','mensaje') ${where}`
    ).get(prospectorId);
    const mensajes = row2?.c || 0;

    return { llamadas, mensajes };
}

async function calcularPeriodoClientes(db, prospectorId, filtroFechaRegistro) {
    const where = filtroFechaRegistro ? `AND ${filtroFechaRegistro}` : '';
    const row = await db.prepare(
        `SELECT COUNT(DISTINCT id) as c FROM clientes 
         WHERE (prospectorAsignado = ? OR id IN (SELECT cliente FROM actividades WHERE vendedor = ?))
         AND etapaEmbudo NOT IN ('perdido', 'venta_ganada') ${where}`
    ).get(prospectorId, prospectorId);
    return row?.c || 0;
}

async function calcularPeriodoReuniones(db, prospectorId, filtroFechaEtapa) {
    const where = filtroFechaEtapa ? `AND ${filtroFechaEtapa}` : '';
    const row = await db.prepare(
        `SELECT COUNT(DISTINCT cliente) as c FROM actividades 
         WHERE vendedor = ? AND tipo = 'cita' ${where}`
    ).get(prospectorId);
    return row?.c || 0;
}

// GET /api/doctor/dashboard (Lógica de prospector)
router.get('/dashboard', [auth, esDoctor], async (req, res) => {
    try {
        const prospectorId = parseInt(req.usuario.id);
        const nowLocal = new Date();
        const startOfDay = new Date(nowLocal.getFullYear(), nowLocal.getMonth(), nowLocal.getDate()).toISOString().slice(0, 10);
        
        const sixDaysAgo = new Date(nowLocal);
        sixDaysAgo.setDate(nowLocal.getDate() - 6);
        const startOfWeek = new Date(sixDaysAgo.getFullYear(), sixDaysAgo.getMonth(), sixDaysAgo.getDate()).toISOString().slice(0, 10);
        const startOfMonth = new Date(nowLocal.getFullYear(), nowLocal.getMonth(), 1).toISOString().slice(0, 10);

        const FILTROS_ACT = {
            dia: `fecha LIKE '${startOfDay}%'`,
            semana: `fecha >= '${startOfWeek}T00:00:00.000Z'`,
            mes: `fecha >= '${startOfMonth}T00:00:00.000Z'`,
            total: null
        };
        const FILTROS_CLI = {
            dia: `(fecharegistro LIKE '${startOfDay}%' OR (fecharegistro IS NULL AND fechaultimaetapa LIKE '${startOfDay}%'))`,
            semana: `(fecharegistro >= '${startOfWeek}T00:00:00.000Z' OR (fecharegistro IS NULL AND fechaultimaetapa >= '${startOfWeek}T00:00:00.000Z'))`,
            mes: `(fecharegistro >= '${startOfMonth}T00:00:00.000Z' OR (fecharegistro IS NULL AND fechaultimaetapa >= '${startOfMonth}T00:00:00.000Z'))`,
            total: null
        };
        const FILTROS_REUNION = {
            dia: `fecha LIKE '${startOfDay}%'`,
            semana: `fecha >= '${startOfWeek}T00:00:00.000Z'`,
            mes: `fecha >= '${startOfMonth}T00:00:00.000Z'`,
            total: null
        };

        const periodos = {};
        for (const key of ['dia', 'semana', 'mes', 'total']) {
            const { llamadas, mensajes } = await calcularPeriodoActividades(db, prospectorId, FILTROS_ACT[key]);
            const prospectos = await calcularPeriodoClientes(db, prospectorId, FILTROS_CLI[key]);
            const reuniones = await calcularPeriodoReuniones(db, prospectorId, FILTROS_REUNION[key]);
            periodos[key] = { llamadas, mensajes, prospectos, reuniones };
        }

        res.json({ periodos });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// GET /api/doctor/dashboard-extra (Lógica de closer)
router.get('/dashboard-extra', [auth, esDoctor], async (req, res) => {
    try {
        const closerId = parseInt(req.usuario.id);
        const clientes = await db.prepare('SELECT * FROM clientes WHERE closerAsignado = ?').all(closerId);

        const embudo = {
            total: clientes.length,
            reunion_agendada: clientes.length,
            reunion_realizada: 0,
            propuesta_enviada: 0,
            venta_ganada: 0,
            en_negociacion: 0,
            perdido: 0
        };

        for (const c of clientes) {
            if (c.etapaEmbudo === 'en_negociacion') embudo.en_negociacion++;
            if (c.etapaEmbudo === 'perdido') embudo.perdido++;
            if (c.etapaEmbudo === 'reunion_realizada') embudo.reunion_realizada++;
            if (c.etapaEmbudo === 'venta_ganada') {
                embudo.reunion_realizada++;
                embudo.propuesta_enviada++;
                embudo.venta_ganada++;
            }
        }

        const inicioMesDate = new Date();
        inicioMesDate.setDate(1);
        inicioMesDate.setHours(0, 0, 0, 0);
        const inicioMes = inicioMesDate.toISOString();

        const ventasMes = await db.prepare('SELECT * FROM ventas WHERE vendedor = ? AND fecha >= ?').all(closerId, inicioMes);
        const montoTotalMes = ventasMes.reduce((sum, v) => sum + (v.monto || 0), 0);

        res.json({
            embudo,
            metricas: {
                reuniones: { pendientes: clientes.filter(c => c.etapaEmbudo === 'reunion_agendada').length },
                ventas: { mes: ventasMes.length, montoMes: montoTotalMes },
                negociaciones: { activas: embudo.en_negociacion }
            },
            tasasConversion: { global: embudo.reunion_agendada > 0 ? ((embudo.venta_ganada / embudo.reunion_agendada) * 100).toFixed(1) : '0.0' }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// GET /api/doctor/calendario (Lógica de closer)
router.get('/calendario', [auth, esDoctor], async (req, res) => {
    try {
        const closerId = parseInt(req.usuario.id);
        const rows = await db.prepare(`
            SELECT a.*, c.nombres as c_nombres, c.apellidoPaterno as c_apellido, c.empresa as c_empresa, 
            u.nombre as v_nombre FROM actividades a
            JOIN clientes c ON a.cliente = c.id
            JOIN usuarios u ON a.vendedor = u.id
            WHERE c.closerAsignado = ? AND a.tipo = ? AND a.resultado = 'pendiente'
            ORDER BY a.fecha ASC
        `).all(closerId, 'cita');

        const ahora = new Date();
        const reuniones = rows.filter(r => new Date(r.fecha) >= ahora).map(r => ({
            ...toMongoFormat(r),
            cliente: { nombres: r.c_nombres, apellidoPaterno: r.c_apellido, empresa: r.c_empresa },
            vendedor: { nombre: r.v_nombre }
        }));

        res.json(reuniones);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

module.exports = router;
