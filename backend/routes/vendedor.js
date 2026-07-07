const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { auth } = require('../middleware/auth');
const { toMongoFormat, toMongoFormatMany, parseGoogleExpiryToMillis } = require('../lib/helpers');
const { getCache, setCache, invalidateUserCache } = require('../lib/cache');

const esVendedor = (req, res, next) => {
    const rol = String(req.usuario.rol).toLowerCase();
    if (rol !== 'vendedor' && rol !== 'admin') {
        return res.status(403).json({ msg: 'Acceso denegado. Solo vendedores o admin.' });
    }
    next();
};

const isGoogleAuthError = (err) => {
    const code = err.response?.data?.error?.code || err.code;
    const msg = err.response?.data?.error?.message || err.message || "";
    return code === 401 || code === 403 || msg.toLowerCase().includes("invalid_grant") || msg.toLowerCase().includes("insufficient permission");
};

// ... Backward compat aliases inside strings:

const parseHistorialSeguro = (value) => {
    if (!value) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
};

const getOwnerId = (cliente) => parseInt(
    cliente?.propietarioId ?? cliente?.prospectorAsignado ?? cliente?.vendedorAsignado ?? 0,
    10
);

const isShared = (cliente) => {
    if (cliente?.compartido === true) return true;
    if (cliente?.compartido === 1) return true;
    if (cliente?.compartido === '1') return true;
    return false;
};

const canReadCliente = (cliente, usuarioId, equipoId) => {
    const ownerId = getOwnerId(cliente);
    if (ownerId && ownerId === usuarioId) return true;
    if (!isShared(cliente)) return false;
    if (!equipoId || !cliente?.equipo_id) return false;
    return String(cliente.equipo_id) === String(equipoId);
};

const canWriteCliente = (cliente, usuarioId) => getOwnerId(cliente) === usuarioId;

const parseScope = (scope) => {
    const normalized = String(scope || 'mine').toLowerCase();
    if (['mine', 'shared', 'all'].includes(normalized)) return normalized;
    return 'mine';
};

const CLIENT_STAGES = ['venta_ganada', 'cotizacion_realizada', 'contrato_firmado', 'esperando_pago', 'cliente_activo'];
const NON_PROSPECT_STAGES = [...CLIENT_STAGES, 'perdido'];

// Helper: calcula métricas para un período dado por filtro SQL en campo fecha (actividades) y fechaRegistro (clientes)
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
    // UNIFICADO: Contar prospectos donde el usuario ha tenido actividad o está asignado
    const row = await db.prepare(
        `SELECT COUNT(DISTINCT id) as c FROM clientes 
         WHERE (prospectorAsignado = ? OR id IN (SELECT cliente FROM actividades WHERE vendedor = ?))
         AND etapaEmbudo NOT IN ('perdido', 'venta_ganada', 'cotizacion_realizada', 'contrato_firmado', 'esperando_pago', 'cliente_activo') ${where}`
    ).get(prospectorId, prospectorId);
    return row?.c || 0;
}

// Reuniones: filtrar por fechaUltimaEtapa (momento en que se agendó/cambió a esa etapa)
async function calcularPeriodoReuniones(db, prospectorId, filtroFechaEtapa) {
    const where = filtroFechaEtapa ? `AND ${filtroFechaEtapa}` : '';
    // UNIFICADO: Contar reuniones agendadas por el usuario (actividades tipo cita)
    const row = await db.prepare(
        `SELECT COUNT(DISTINCT cliente) as c FROM actividades 
         WHERE vendedor = ? AND tipo = 'cita' ${where}`
    ).get(prospectorId);
    return row?.c || 0;
}

// GET /api/vendedor/dashboard
router.get('/dashboard', [auth, esVendedor], async (req, res) => {
    try {
        const prospectorId = parseInt(req.usuario.id);

        // ✅ CACHÉ: Servir desde memoria si está fresco (TTL 60s)
        const cacheKey = `user:${prospectorId}:dashboard`;
        const cached = getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const nowLocal = new Date();
        const startOfDay   = new Date(nowLocal.getFullYear(), nowLocal.getMonth(), nowLocal.getDate()).toISOString().slice(0,10) + 'T00:00:00.000Z';
        const endOfDay     = new Date(nowLocal.getFullYear(), nowLocal.getMonth(), nowLocal.getDate()).toISOString().slice(0,10) + 'T23:59:59.999Z';
        const startOfWeek  = (() => { const d = new Date(nowLocal); d.setDate(d.getDate()-6); return new Date(d.getFullYear(),d.getMonth(),d.getDate()).toISOString().slice(0,10)+'T00:00:00.000Z'; })();
        const startOfMonth = new Date(nowLocal.getFullYear(), nowLocal.getMonth(), 1).toISOString().slice(0,10) + 'T00:00:00.000Z';

        // === QUERY 1: clientes (embudo + fuentes) ===
        // === QUERY 2: métricas de actividades (todos los períodos en una sola query) ===
        // === QUERY 3: fuentes ===
        // Ejecutar las 3 en PARALELO con Promise.all
        const [clientes, actMetrics, fuentesRaw] = await Promise.all([
            db.prepare(`
                SELECT id, "etapaEmbudo", "closerAsignado", "historialEmbudo", "fechaRegistro", "fechaUltimaEtapa"
                FROM clientes
                WHERE "prospectorAsignado" = ? OR id IN (SELECT cliente FROM actividades WHERE vendedor = ?)
            `).all(prospectorId, prospectorId),

            db.prepare(`
                SELECT
                    COUNT(*) FILTER (WHERE tipo = 'llamada') AS llamadas_total,
                    COUNT(*) FILTER (WHERE tipo = 'llamada' AND fecha >= ? AND fecha <= ?) AS llamadas_dia,
                    COUNT(*) FILTER (WHERE tipo = 'llamada' AND fecha >= ?) AS llamadas_semana,
                    COUNT(*) FILTER (WHERE tipo = 'llamada' AND fecha >= ?) AS llamadas_mes,
                    COUNT(*) FILTER (WHERE tipo IN ('whatsapp','correo','mensaje')) AS mensajes_total,
                    COUNT(*) FILTER (WHERE tipo IN ('whatsapp','correo','mensaje') AND fecha >= ? AND fecha <= ?) AS mensajes_dia,
                    COUNT(*) FILTER (WHERE tipo IN ('whatsapp','correo','mensaje') AND fecha >= ?) AS mensajes_semana,
                    COUNT(*) FILTER (WHERE tipo IN ('whatsapp','correo','mensaje') AND fecha >= ?) AS mensajes_mes,
                    COUNT(DISTINCT cliente) FILTER (WHERE tipo = 'cita') AS reuniones_total,
                    COUNT(DISTINCT cliente) FILTER (WHERE tipo = 'cita' AND fecha >= ? AND fecha <= ?) AS reuniones_dia,
                    COUNT(DISTINCT cliente) FILTER (WHERE tipo = 'cita' AND fecha >= ?) AS reuniones_semana,
                    COUNT(DISTINCT cliente) FILTER (WHERE tipo = 'cita' AND fecha >= ?) AS reuniones_mes
                FROM actividades WHERE vendedor = ?
            `).get(
                startOfDay, endOfDay, startOfWeek, startOfMonth,
                startOfDay, endOfDay, startOfWeek, startOfMonth,
                startOfDay, endOfDay, startOfWeek, startOfMonth,
                prospectorId
            ),

            db.prepare(`
                SELECT fuente, COUNT(*) as c FROM clientes
                WHERE "prospectorAsignado" = ? OR id IN (SELECT cliente FROM actividades WHERE vendedor = ?)
                GROUP BY fuente
            `).all(prospectorId, prospectorId)
        ]);

        // Embudo histórico unificado
        const embudo = { 
            total: clientes.length, 
            prospecto_nuevo: clientes.length, 
            en_contacto: 0, 
            reunion_agendada: 0, 
            transferidos: 0,
            reunion_realizada: 0,
            venta_ganada: 0
        };

        const etapasContacto = new Set(['en_contacto','reunion_agendada','venta_ganada','en_negociacion','reunion_realizada','perdido','cotizacion_realizada','contrato_firmado','esperando_pago','cliente_activo']);
        const etapasAgendado = new Set(['reunion_agendada','venta_ganada','en_negociacion','reunion_realizada','cotizacion_realizada','contrato_firmado','esperando_pago','cliente_activo']);
        const etapasRealizado = new Set(['reunion_realizada','venta_ganada','en_negociacion','cotizacion_realizada','contrato_firmado','esperando_pago','cliente_activo']);
        const etapasGanada = new Set(['venta_ganada','contrato_firmado','esperando_pago','cliente_activo']);

        for (const c of clientes) {
            let contactado = false, agendado = false, realizado = false, ganado = false;
            const transferido = !!c.closerAsignado;

            // Revisar etapa actual
            if (c.etapaEmbudo && c.etapaEmbudo !== 'prospecto_nuevo' && c.etapaEmbudo !== 'perdido') contactado = true;
            if (etapasContacto.has(c.etapaEmbudo)) contactado = true;
            if (etapasAgendado.has(c.etapaEmbudo) || transferido) { contactado = true; agendado = true; }
            if (etapasRealizado.has(c.etapaEmbudo)) { contactado = true; agendado = true; realizado = true; }
            if (etapasGanada.has(c.etapaEmbudo)) { contactado = true; agendado = true; realizado = true; ganado = true; }

            // Revisar el historial
            const hist = parseHistorialSeguro(c.historialEmbudo);
            for (const h of hist) {
                if (etapasContacto.has(h.etapa)) contactado = true;
                if (etapasAgendado.has(h.etapa)) { contactado = true; agendado = true; }
                if (etapasRealizado.has(h.etapa)) { contactado = true; agendado = true; realizado = true; }
                if (etapasGanada.has(h.etapa)) { contactado = true; agendado = true; realizado = true; ganado = true; }
                
                // Análisis por resultados específicos
                if (h.resultado === 'venta') { contactado = true; agendado = true; realizado = true; ganado = true; }
                if (['no_venta', 'cotizacion', 'otra_reunion'].includes(h.resultado)) { contactado = true; agendado = true; realizado = true; }
            }

            if (contactado) embudo.en_contacto++;
            if (agendado) embudo.reunion_agendada++;
            if (realizado) embudo.reunion_realizada++;
            if (ganado) embudo.venta_ganada++;
            if (transferido) embudo.transferidos++;
        }

        const m = actMetrics || {};
        const periodos = {
            dia:    { llamadas: Number(m.llamadas_dia)||0,    mensajes: Number(m.mensajes_dia)||0,    prospectos: 0, reuniones: Number(m.reuniones_dia)||0 },
            semana: { llamadas: Number(m.llamadas_semana)||0, mensajes: Number(m.mensajes_semana)||0, prospectos: 0, reuniones: Number(m.reuniones_semana)||0 },
            mes:    { llamadas: Number(m.llamadas_mes)||0,    mensajes: Number(m.mensajes_mes)||0,    prospectos: 0, reuniones: Number(m.reuniones_mes)||0 },
            total:  { llamadas: Number(m.llamadas_total)||0,  mensajes: Number(m.mensajes_total)||0,  prospectos: 0, reuniones: Number(m.reuniones_total)||0 }
        };

        // Prospectos por período calculado en JS (ya tenemos los clientes)
        // Contamos TODOS los leads generados en el período, sin importar si ya son clientes (NON_PROSPECT_STAGES).
        for (const c of clientes) {
            const fr = c.fechaRegistro || c.fechaUltimaEtapa;
            if (!fr) { periodos.total.prospectos++; continue; }
            periodos.total.prospectos++;
            if (fr >= startOfMonth) periodos.mes.prospectos++;
            if (fr >= startOfWeek) periodos.semana.prospectos++;
            if (fr >= startOfDay && fr <= endOfDay) periodos.dia.prospectos++;
        }

        const tasasConversion = {
            contacto: embudo.total > 0 ? (embudo.en_contacto / embudo.total * 100).toFixed(1) : 0,
            agendamiento: embudo.en_contacto > 0 ? (embudo.reunion_agendada / embudo.en_contacto * 100).toFixed(1) : 0
        };

        const analisisFuentes = {};
        fuentesRaw.forEach(f => { analisisFuentes[f.fuente || 'Desconocido'] = f.c; });

        const metricas = {
            llamadas: { hoy: periodos.dia.llamadas, totales: periodos.total.llamadas },
            contactosExitosos: { hoy: 0, totales: 0 },
            reunionesAgendadas: { hoy: periodos.dia.reuniones, totales: periodos.total.reuniones, semana: periodos.semana.reuniones },
            prospectosHoy: periodos.dia.prospectos,
            correosEnviados: periodos.dia.mensajes
        };

        const response = { embudo, metricas, tasasConversion, periodos, analisisFuentes };
        setCache(cacheKey, response, 60); // TTL 60 segundos
        res.json(response);
    } catch (error) {
        console.error('Error en dashboard prospector:', error);
        return res.json({
            embudo: { total: 0, prospecto_nuevo: 0, en_contacto: 0, reunion_agendada: 0, transferidos: 0 },
            metricas: { llamadas: { hoy: 0, totales: 0 }, contactosExitosos: { hoy: 0, totales: 0 }, reunionesAgendadas: { hoy: 0, totales: 0, semana: 0 }, prospectosHoy: 0, correosEnviados: 0 },
            tasasConversion: { contacto: 0, agendamiento: 0 },
            periodos: { dia: { llamadas: 0, mensajes: 0, prospectos: 0, reuniones: 0 }, semana: { llamadas: 0, mensajes: 0, prospectos: 0, reuniones: 0 }, mes: { llamadas: 0, mensajes: 0, prospectos: 0, reuniones: 0 }, total: { llamadas: 0, mensajes: 0, prospectos: 0, reuniones: 0 } },
            degraded: true
        });
    }
});

// GET /api/vendedor/dashboard-closer
router.get('/dashboard-closer', [auth, esVendedor], async (req, res) => {
    try {
        const closerId = parseInt(req.usuario.id);
        const equipoId = req.usuario.equipo_id;

        // ✅ CACHÉ: Servir desde memoria si está fresco (TTL 60s)
        const cacheKey = `user:${closerId}:dashboard-closer`;
        const cached = getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        // Ahora siempre consultamos individualmente por solicitud del usuario
        const clientes = await db.prepare('SELECT * FROM clientes WHERE closerAsignado = ?').all(closerId);

        const embudo = {
            total: clientes.length,
            reunion_agendada: clientes.filter(c => c.etapaEmbudo === 'reunion_agendada').length,
            reunion_realizada: 0,
            propuesta_enviada: 0,
            venta_ganada: 0,
            en_negociacion: 0,
            perdido: 0
        };

        const analisisPerdidas = {
            no_asistio: 0,
            no_interesado: 0
        };

        for (const c of clientes) {
            if (c.etapaEmbudo === 'en_negociacion') embudo.en_negociacion++;
            if (c.etapaEmbudo === 'perdido') embudo.perdido++;

            const hist = parseHistorialSeguro(c.historialEmbudo);
            const results = hist.map(h => h.resultado).filter(Boolean);
            const rLast = results.length > 0 ? results[results.length - 1] : null;

            let realized = false;
            let propuesta = false;
            let venta = false;

            if (c.etapaEmbudo === 'venta_ganada') {
                realized = true; propuesta = true; venta = true;
            } else if (c.etapaEmbudo === 'en_negociacion') {
                realized = true; propuesta = true;
            } else if (c.etapaEmbudo === 'reunion_realizada') {
                realized = true;
            } else if (c.etapaEmbudo === 'perdido') {
                if (rLast === 'no_asistio' || results.includes('no_asistio')) {
                    analisisPerdidas.no_asistio++;
                } else {
                    realized = true;
                    analisisPerdidas.no_interesado++;
                }
            } else {
                if (rLast === 'venta') {
                    realized = true; propuesta = true; venta = true;
                } else if (rLast === 'cotizacion') {
                    realized = true; propuesta = true;
                } else if (rLast === 'no_venta' || rLast === 'otra_reunion') {
                    realized = true;
                    if (rLast === 'no_venta') analisisPerdidas.no_interesado++;
                } else if (rLast === 'no_asistio') {
                    analisisPerdidas.no_asistio++;
                }
            }

            if (realized) embudo.reunion_realizada++;
            if (propuesta) embudo.propuesta_enviada++;
            if (venta) embudo.venta_ganada++;
        }

        // Agregación por motivo de pérdida (Premium)
        const perdidasRaw = await db.prepare(`
            SELECT "motivoPerdida", COUNT(*) as c FROM clientes 
            WHERE closerAsignado = ? AND etapaEmbudo = 'perdido'
            GROUP BY "motivoPerdida"
        `).all(closerId);

        const analisisPerdidasPremium = {};
        perdidasRaw.forEach(p => { analisisPerdidasPremium[p.motivoPerdida || 'Sin motivo'] = p.c; });

        // Agregación por fuente (Premium - Ahora incluye Revenue)
        const fuentesRawCloser = await db.prepare(`
            SELECT c.fuente, COUNT(c.id) as count, SUM(v.monto) as revenue
            FROM clientes c
            LEFT JOIN ventas v ON v.cliente = c.id
            WHERE c.closerAsignado = ?
            GROUP BY c.fuente
        `).all(closerId);

        const analisisFuentesPremium = {};
        fuentesRawCloser.forEach(f => {
            analisisFuentesPremium[f.fuente || 'Desconocido'] = {
                count: f.count || 0,
                revenue: f.revenue || 0
            };
        });

        // --- MÉTRICAS DE EFICIENCIA (Velocidad en JS para compatibilidad) ---

        // 1. Ciclo de Venta Promedio (Días)
        const cicloData = await db.prepare(`
            SELECT v.fecha as fechaVenta, c.fechaRegistro
            FROM ventas v
            JOIN clientes c ON v.cliente = c.id
            WHERE v.vendedor = ?
        `).all(closerId);

        let totalDays = 0;
        cicloData.forEach(d => {
            const diff = new Date(d.fechaVenta) - new Date(d.fechaRegistro);
            totalDays += diff / (1000 * 60 * 60 * 24);
        });
        const avgCycle = cicloData.length > 0 ? totalDays / cicloData.length : 0;

        // 2. Lead Response Time (Promedio de horas hasta el primer contacto)
        const responseData = await db.prepare(`
            SELECT c.fechaRegistro, MIN(a.fecha) as firstContact
            FROM clientes c
            JOIN actividades a ON a.cliente = c.id
            WHERE c.closerAsignado = ?
            AND a.tipo IN ('llamada', 'mensaje', 'cita')
            GROUP BY c.id
        `).all(closerId);

        let totalHours = 0;
        responseData.forEach(d => {
            const diff = new Date(d.firstContact) - new Date(d.fechaRegistro);
            totalHours += diff / (1000 * 60 * 60);
        });
        const avgResponse = responseData.length > 0 ? totalHours / responseData.length : 0;

        // 3. Leads Estancados (> 7 días sin cambio de etapa)

        // 3. Leads Estancados (> 7 días sin cambio de etapa)
        const sieteDiasAtras = new Date();
        sieteDiasAtras.setDate(sieteDiasAtras.getDate() - 7);

        const estancadosCount = clientes.filter(c =>
            !['venta_ganada', 'perdido'].includes(c.etapaEmbudo) &&
            new Date(c.fechaUltimaEtapa || c.fechaRegistro) < sieteDiasAtras
        ).length;

        const eficiencia = {
            cicloVentaDias: Math.round(avgCycle * 10) / 10,
            responseTimeHoras: Math.round(avgResponse * 10) / 10,
            leadsEstancados: estancadosCount
        };

        const hoyInicio = new Date();
        hoyInicio.setHours(0, 0, 0, 0);
        const hoyFin = new Date();
        hoyFin.setHours(23, 59, 59, 999);

        // Reuniones hoy (pertenecientes al usuario o equipo)
        const reunionesHoy = await db.prepare(`
            SELECT a.* FROM actividades a
            JOIN clientes c ON a.cliente = c.id
            WHERE a.tipo = 'cita' AND a.fecha >= ? AND a.fecha <= ? AND c.closerAsignado = ?
        `).all(hoyInicio.toISOString(), hoyFin.toISOString(), closerId);

        const actividadesHoy = await db.prepare('SELECT * FROM actividades WHERE vendedor = ? AND fecha >= ? AND fecha <= ?')
            .all(closerId, hoyInicio.toISOString(), hoyFin.toISOString());

        const reunionesRealizadasHoy = actividadesHoy.filter(a => a.tipo === 'cita' && a.resultado !== 'pendiente').length;
        const propuestasHoy = actividadesHoy.filter(a => a.descripcion && a.descripcion.toLowerCase().includes('cotización')).length;

        const inicioMes = new Date();
        inicioMes.setDate(1);
        inicioMes.setHours(0, 0, 0, 0);

        const ventasMes = await db.prepare('SELECT * FROM ventas WHERE vendedor = ? AND fecha >= ?').all(closerId, inicioMes.toISOString());
        const ventasHoy = await db.prepare('SELECT * FROM ventas WHERE vendedor = ? AND fecha >= ? AND fecha <= ?').all(closerId, hoyInicio.toISOString(), hoyFin.toISOString());
        const montoTotalMes = ventasMes.reduce((sum, v) => sum + Number(v.monto || 0), 0);

        const tasasConversion = {
            asistencia: embudo.reunion_agendada > 0 ? ((embudo.reunion_realizada / embudo.reunion_agendada) * 100).toFixed(1) : '0.0',
            interes: embudo.reunion_realizada > 0 ? ((embudo.propuesta_enviada / embudo.reunion_realizada) * 100).toFixed(1) : '0.0',
            cierre: embudo.propuesta_enviada > 0 ? ((embudo.venta_ganada / embudo.propuesta_enviada) * 100).toFixed(1) : '0.0',
            global: embudo.reunion_agendada > 0 ? ((embudo.venta_ganada / embudo.reunion_agendada) * 100).toFixed(1) : '0.0'
        };

        const closerResponse = {
            embudo,
            metricas: {
                reuniones: { hoy: reunionesHoy.length, pendientes: clientes.filter(c => c.etapaEmbudo === 'reunion_agendada').length, realizadas: embudo.reunion_realizada, realizadasHoy: reunionesRealizadasHoy, propuestasHoy: propuestasHoy },
                ventas: { mes: ventasMes.length, montoMes: montoTotalMes, totales: embudo.venta_ganada, ventasHoy: ventasHoy.length },
                negociaciones: { activas: embudo.en_negociacion }
            },
            tasasConversion,
            analisisPerdidas,
            analisisPerdidasPremium,
            analisisFuentes: analisisFuentesPremium,
            eficiencia
        };
        setCache(cacheKey, closerResponse, 60); // TTL 60 segundos
        res.json(closerResponse);
    } catch (error) {
        console.error('Error en dashboard-closer:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// GET /api/vendedor/calendario
router.get('/calendario', [auth, esVendedor], async (req, res) => {
    try {
        const vendedorId = parseInt(req.usuario.id);
        const equipoId = req.usuario.equipo_id;

        // Obtener todas las citas pendientes (del equipo o propias)
        let sql = `
            SELECT a.*, c.nombres as c_nombres, c.apellidoPaterno as c_apellido, c.empresa as c_empresa, c.telefono as c_telefono, c.correo as c_correo, c.etapaEmbudo as c_etapa,
            u.nombre as v_nombre FROM actividades a
            JOIN clientes c ON a.cliente = c.id
            JOIN usuarios u ON a.vendedor = u.id
            WHERE a.tipo = ? AND a.resultado = 'pendiente'
        `;
        let params = ['cita'];

        if (equipoId) {
            sql += ' AND c.equipo_id = ?';
            params.push(equipoId);
        } else {
            sql += ' AND (c.prospectorAsignado = ? OR c.closerAsignado = ? OR a.vendedor = ?)';
            params.push(vendedorId, vendedorId, vendedorId);
        }

        sql += ' ORDER BY a.fecha ASC';

        const rows = await db.prepare(sql).all(...params);

        const ahora = new Date();
        let reuniones = rows.filter(r => {
            const fechaCita = new Date(r.fecha);
            return fechaCita >= ahora;
        }).map(r => ({
            ...toMongoFormat(r),
            cliente: { nombres: r.c_nombres, apellidoPaterno: r.c_apellido, empresa: r.c_empresa, telefono: r.c_telefono, correo: r.c_correo, etapaEmbudo: r.c_etapa },
            vendedor: { nombre: r.v_nombre }
        }));

        const citasPasadas = rows.filter(r => new Date(r.fecha) < ahora);
        for (const cita of citasPasadas) {
            await db.prepare(`UPDATE actividades SET resultado = 'fallido', notas = COALESCE(notas || ' ', '') || '[Auto] Cita pasada sin registrar' WHERE id = ?`)
                .run(cita.id);
        }

        // Sincronización Google Calendar (con timeout de 5s para evitar 502)
        try {
            const usuario = await db.prepare('SELECT googleRefreshToken, googleAccessToken, googleTokenExpiry FROM usuarios WHERE id = ?').get(vendedorId);

            if (usuario && (usuario.googleRefreshToken || usuario.googleAccessToken)) {
                const { OAuth2Client } = require('google-auth-library');
                const { google } = require('googleapis');

                const client = new OAuth2Client(
                    process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
                    process.env.GOOGLE_CLIENT_SECRET
                );

                client.setCredentials({
                    refresh_token: usuario.googleRefreshToken,
                    access_token: usuario.googleAccessToken,
                    expiry_date: parseGoogleExpiryToMillis(usuario.googleTokenExpiry)
                });

                const calendar = google.calendar({ version: 'v3', auth: client });
                const timeMax = new Date();
                timeMax.setDate(timeMax.getDate() + 30);

                // Timeout de 5 segundos para no bloquear Railway
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Google Calendar timeout')), 5000)
                );
                const calendarPromise = calendar.events.list({
                    calendarId: 'primary',
                    timeMin: ahora.toISOString(),
                    timeMax: timeMax.toISOString(),
                    singleEvents: true,
                    orderBy: 'startTime'
                });

                const response = await Promise.race([calendarPromise, timeoutPromise]);

                const eventosGoogle = response.data.items || [];
                const reunionesActualizadas = [];
                for (const reunion of reuniones) {
                    const fechaReunion = new Date(reunion.fecha);
                    const existeEnGoogle = eventosGoogle.some(evento => {
                        if (!evento.start || !evento.start.dateTime) return false;
                        const fechaEvento = new Date(evento.start.dateTime);
                        const diferencia = Math.abs(fechaEvento - fechaReunion);
                        return diferencia < 5 * 60 * 1000;
                    });

                    if (existeEnGoogle) {
                        reunionesActualizadas.push(reunion);
                    } else {
                        await db.prepare(`UPDATE actividades SET resultado = 'fallido', notas = COALESCE(notas || ' ', '') || '[Sync] Eliminada de Google Calendar' WHERE id = ?`)
                            .run(reunion.id || reunion._id);
                    }
                }
                reuniones = reunionesActualizadas;
            }
        } catch (syncError) {
            // Solo loguear, no fallar - el endpoint responde igual sin sync
            if (!syncError.message?.includes('timeout')) {
                console.error('Error al sincronizar con Google Calendar:', syncError.message);
            }
        }

        res.json(reuniones);
    } catch (error) {
        console.error('Error en calendario:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// GET /api/vendedor/prospectos
router.get('/prospectos', [auth, esVendedor], async (req, res) => {
    try {
        const prospectorId = parseInt(req.usuario.id, 10);
        const equipoId = req.usuario.equipo_id;
        const { etapa, busqueda, scope } = req.query;
        const visibilityScope = parseScope(scope);

        // ✅ CACHÉ: TTL 30s — incluye los query params para no mezclar resultados
        const cacheKey = `user:${prospectorId}:prospectos:${visibilityScope}:${etapa || 'todos'}:${busqueda || ''}`;
        const cached = getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        // ✅ QUERY OPTIMIZADA: subqueries correlacionadas → JOINs eficientes
        // Antes: (SELECT MIN(...) FROM tareas WHERE t.cliente = c.id) ejecutaba 1 subquery POR CADA fila
        // Ahora: se hace 1 sola query agrupada y se une con JOIN (O(n) en lugar de O(n²))
        let sql = `SELECT c.*, u.nombre as closerNombre, owner.nombre as propietarioNombre,
            rem.proximoRecordatorio,
            citas.proximaCita
            FROM clientes c
            LEFT JOIN usuarios u ON c."closerAsignado" = u.id
            LEFT JOIN usuarios owner ON owner.id = COALESCE(c."propietarioId", c."prospectorAsignado", c."vendedorAsignado")
            LEFT JOIN (
                SELECT cliente, MIN("fechaLimite") as proximoRecordatorio
                FROM tareas
                WHERE titulo = 'Recordatorio de llamada' AND estado = 'pendiente'
                GROUP BY cliente
            ) rem ON rem.cliente = c.id
            LEFT JOIN (
                SELECT cliente, MIN(fecha) as proximaCita
                FROM actividades
                WHERE tipo = 'cita' AND (resultado = 'pendiente' OR resultado IS NULL)
                GROUP BY cliente
            ) citas ON citas.cliente = c.id
            WHERE`;

        const params = [];
        const visibilityWhere = [];

        if (visibilityScope === 'mine') {
            visibilityWhere.push('COALESCE(c."propietarioId", c.prospectorAsignado, c.vendedorAsignado) = ?');
            params.push(prospectorId);
        } else if (visibilityScope === 'shared') {
            visibilityWhere.push('COALESCE(c."propietarioId", c.prospectorAsignado, c.vendedorAsignado) <> ?');
            params.push(prospectorId);
            visibilityWhere.push('c.compartido = TRUE');
            if (equipoId) {
                visibilityWhere.push('c."equipo_id" = ?');
                params.push(equipoId);
            } else {
                visibilityWhere.push('1 = 0');
            }
        } else {
            visibilityWhere.push('(COALESCE(c."propietarioId", c.prospectorAsignado, c.vendedorAsignado) = ? OR (c.compartido = TRUE AND COALESCE(c."propietarioId", c.prospectorAsignado, c.vendedorAsignado) <> ?' + (equipoId ? ' AND c."equipo_id" = ?' : '') + '))');
            params.push(prospectorId, prospectorId);
            if (equipoId) params.push(equipoId);
        }

        sql += ` ${visibilityWhere.join(' AND ')}`;

        // Pilar 1: filtrar por tipo de contacto (no por lista de etapas)
        sql += " AND COALESCE(c.tipo, 'prospecto') = 'prospecto'";

        if (etapa && etapa !== 'todos') {
            sql += ' AND c.etapaEmbudo = ?';
            params.push(etapa);
        }
        if (busqueda) {
            sql += ' AND (c.nombres LIKE ? OR c.apellidoPaterno LIKE ? OR c.empresa LIKE ? OR c.telefono LIKE ?)';
            const like = '%' + busqueda + '%';
            params.push(like, like, like, like);
        }
        sql += ' ORDER BY c.fechaUltimaEtapa DESC';

        const rows = await db.prepare(sql).all(...params);

        // Traer última actividad de cada prospecto en una sola query
        // Usamos createdAt para evitar que una cita futura tape una interacción más reciente.
        const ids = rows.map(r => r.id).filter(Boolean);
        const ultimasActs = ids.length > 0
            ? await db.prepare(
                `SELECT a.cliente, a.tipo, COALESCE(NULLIF(a.notas, ''), a.descripcion) as texto
                 FROM actividades a
                 WHERE a.id IN (
                   SELECT MAX(id) FROM actividades WHERE cliente IN (${ids.map(() => '?').join(',')}) GROUP BY cliente
                 )`
            ).all(...ids)
            : [];

        const actMap = {};
        for (const a of ultimasActs) actMap[a.cliente] = { tipo: a.tipo, notas: a.texto };

        const prospectos = rows.map(r => {
            const { closerNombre, propietarioNombre, ...c } = r;
            if (!c.etapaEmbudo) c.etapaEmbudo = 'prospecto_nuevo';
            const out = toMongoFormat(c);
            if (out && closerNombre) out.closerAsignado = { nombre: closerNombre };
            const act = actMap[r.id];
            if (out) {
                // Unificar fuente de seguimiento para la UI: proximaLlamada propia o recordatorio pendiente.
                out.proximaLlamada = out.proximaLlamada || out.proximallamada || out.proximoRecordatorio || out.proximorecordatorio || null;
                out.ultimaActTipo = act?.tipo || null;
                out.ultimaActNotas = act?.notas || null;
                out.esPropietario = getOwnerId(c) === prospectorId;
                out.compartido = isShared(c);
                out.customSections = parseHistorialSeguro(c.customSections);
                out.historialEmbudo = parseHistorialSeguro(c.historialEmbudo);
                out.propietarioNombre = propietarioNombre || null;
            }
            return out || c;
        });

        setCache(cacheKey, prospectos, 30); // TTL 30 segundos
        res.json(prospectos);
    } catch (error) {
        console.error('Error al obtener prospectos:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// GET /api/vendedor/clientes-ganados
router.get('/clientes-ganados', [auth, esVendedor], async (req, res) => {
    try {
        const prospectorId = parseInt(req.usuario.id, 10);
        const equipoId = req.usuario.equipo_id;
        const { busqueda, scope } = req.query;
        const visibilityScope = parseScope(scope);

        let sql = `SELECT c.*, u.nombre as closerNombre, owner.nombre as propietarioNombre,
            rem.proximoRecordatorio,
            (
                SELECT MIN(a.fecha)
                FROM actividades a
                WHERE a.cliente = c.id
                  AND a.tipo = 'cita'
                  AND (a.resultado = 'pendiente' OR a.resultado IS NULL)
            ) as proximaCita,
            (
                SELECT SUM(CAST(v.monto AS REAL))
                FROM ventas v
                WHERE v.cliente = c.id
            ) as totalFacturado
            FROM clientes c
            LEFT JOIN usuarios u ON c.closerAsignado = u.id
            LEFT JOIN usuarios owner ON owner.id = COALESCE(c."propietarioId", c.prospectorAsignado, c.vendedorAsignado)
            LEFT JOIN (
                SELECT cliente, MIN("fechaLimite") as proximoRecordatorio
                FROM tareas
                WHERE titulo = 'Recordatorio de llamada' AND estado = 'pendiente'
                GROUP BY cliente
            ) rem ON rem.cliente = c.id
            WHERE`;

        const params = [];
        const visibilityWhere = [];

        if (visibilityScope === 'mine') {
            visibilityWhere.push('COALESCE(c."propietarioId", c.prospectorAsignado, c.vendedorAsignado) = ?');
            params.push(prospectorId);
        } else if (visibilityScope === 'shared') {
            visibilityWhere.push('COALESCE(c."propietarioId", c.prospectorAsignado, c.vendedorAsignado) <> ?');
            params.push(prospectorId);
            visibilityWhere.push('c.compartido = TRUE');
            if (equipoId) {
                visibilityWhere.push('c."equipo_id" = ?');
                params.push(equipoId);
            } else {
                visibilityWhere.push('1 = 0');
            }
        } else {
            visibilityWhere.push('(COALESCE(c."propietarioId", c.prospectorAsignado, c.vendedorAsignado) = ? OR (c.compartido = TRUE AND COALESCE(c."propietarioId", c.prospectorAsignado, c.vendedorAsignado) <> ?' + (equipoId ? ' AND c."equipo_id" = ?' : '') + '))');
            params.push(prospectorId, prospectorId);
            if (equipoId) params.push(equipoId);
        }

        sql += ` ${visibilityWhere.join(' AND ')}`;

        // Pilar 1: filtrar por tipo de contacto (no por lista de etapas)
        sql += " AND COALESCE(c.tipo, 'prospecto') = 'cliente'";


        if (busqueda) {
            sql += ' AND (c.nombres LIKE ? OR c.apellidoPaterno LIKE ? OR c.empresa LIKE ? OR c.telefono LIKE ?)';
            const like = '%' + busqueda + '%';
            params.push(like, like, like, like);
        }
        sql += ' ORDER BY c.fechaUltimaEtapa DESC';

        const rows = await db.prepare(sql).all(...params);

        // Traer última actividad de cada cliente
        const ids = rows.map(r => r.id).filter(Boolean);
        const ultimasActs = ids.length > 0
            ? await db.prepare(
                `SELECT a.cliente, a.tipo, COALESCE(NULLIF(a.notas, ''), a.descripcion) as texto
                 FROM actividades a
                 WHERE a.id IN (
                   SELECT MAX(id) FROM actividades WHERE cliente IN (${ids.map(() => '?').join(',')}) GROUP BY cliente
                 )`
            ).all(...ids)
            : [];

        const actMap = {};
        for (const a of ultimasActs) actMap[a.cliente] = { tipo: a.tipo, notas: a.texto };

        const clientes = rows.map(r => {
            const { closerNombre, propietarioNombre, totalFacturado, ...c } = r;
            const out = toMongoFormat(c);
            if (out && closerNombre) out.closerAsignado = { nombre: closerNombre };
            const act = actMap[r.id];
            if (out) {
                out.proximaLlamada = out.proximaLlamada || out.proximallamada || out.proximoRecordatorio || out.proximorecordatorio || null;
                out.ultimaActTipo = act?.tipo || null;
                out.ultimaActNotas = act?.notas || null;
                out.esPropietario = getOwnerId(c) === prospectorId;
                out.compartido = isShared(c);
                out.propietarioNombre = propietarioNombre || null;
                if (totalFacturado !== undefined && totalFacturado !== null) out.totalFacturado = totalFacturado;
            }
            return out || c;
        });

        res.json(clientes);
    } catch (error) {
        console.error('Error al obtener clientes ganados:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// POST /api/vendedor/crear-prospecto
router.post('/crear-prospecto', [auth, esVendedor], async (req, res) => {
    try {
        const { nombres, apellidoPaterno, apellidoMaterno, telefono, telefono2, correo, empresa, notas, sitioWeb, ubicacion, fuente } = req.body;

        const prospectorId = parseInt(req.usuario.id);
        const closerId = prospectorId;
        const equipoId = req.usuario.equipo_id || null;
        const now = new Date().toISOString();

        const stmt = await db.prepare(`
            INSERT INTO clientes (nombres, apellidoPaterno, apellidoMaterno, telefono, telefono2, correo, empresa, notas, sitioWeb, ubicacion, fuente, customMetricLabel, customMetricValue, vendedorAsignado, prospectorAsignado, closerAsignado, etapaEmbudo, fechaRegistro, fechaUltimaEtapa, "equipo_id", "propietarioId", compartido)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'prospecto_nuevo', ?, ?, ?, ?, ?)
        `);
        const result = await stmt.run(
            (nombres || '').trim(),
            (apellidoPaterno || '').trim(),
            (apellidoMaterno || '').trim(),
            String(telefono || '').trim(),
            String(telefono2 || '').trim(),
            String(correo || '').trim().toLowerCase(),
            (empresa || '').trim(),
            (notas || '').trim(),
            (sitioWeb || '').trim(),
            (ubicacion || '').trim(),
            (fuente || '').trim(),
            (req.body.customMetricLabel || '').trim(),
            (req.body.customMetricValue || '').trim(),
            prospectorId,
            prospectorId,
            closerId,
            now,
            now,
            equipoId,
            prospectorId,
            false
        );

        const row = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(result.lastInsertRowid);
        const cliente = toMongoFormat(row);
        if (cliente) cliente.prospectorAsignado = { nombre: req.usuario.nombre };

        // 🚀 Web Sockets: Emitir evento solo al equipo
        if (req.app.get('io') && equipoId) {
            req.app.get('io').to(`team_${equipoId}`).emit('prospectos_actualizados', {
                origen: prospectorId,
                accion: 'crear',
                mensaje: 'Se ha creado un nuevo prospecto'
            });
        } else if (req.app.get('io')) {
            req.app.get('io').emit('prospectos_actualizados', {
                origen: prospectorId,
                accion: 'crear',
                mensaje: 'Se ha creado un nuevo prospecto'
            });
        }

        // ✅ INVALIDAR CACHÉ: los datos del usuario cambiaron
        invalidateUserCache(prospectorId);

        res.status(201).json({ msg: 'Prospecto creado', cliente: cliente || row });
    } catch (error) {
        console.error('Error al crear prospecto:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// POST /api/vendedor/registrar-actividad
router.post('/registrar-actividad', [auth, esVendedor], async (req, res) => {
    try {
        const { clienteId, tipo, resultado, descripcion, notas, fechaCita, etapaEmbudo, proximaLlamada, interes, customMetricLabel, customMetricValue, monto } = req.body;
        const tiposValidos = ['llamada', 'mensaje', 'correo', 'whatsapp', 'cita', 'prospecto', 'venta', 'suscripcion'];
        const resultadosValidos = ['exitoso', 'pendiente', 'fallido'];

        if (!clienteId || !tipo) {
            return res.status(400).json({ msg: 'Cliente y tipo de actividad son requeridos' });
        }
        if (!tiposValidos.includes(tipo)) {
            return res.status(400).json({ msg: 'Tipo de actividad no válido' });
        }

        const cid = parseInt(clienteId);
        const cliente = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(cid);
        if (!cliente) {
            return res.status(404).json({ msg: 'Cliente no encontrado' });
        }
        const prospectorId = parseInt(req.usuario.id);

        if (!canWriteCliente(cliente, prospectorId)) {
            return res.status(403).json({ msg: 'Solo el propietario puede modificar este prospecto' });
        }

        // UNIFICADO: Cualquier prospector o closer puede registrar actividades (acceso compartido)
        const rolesPermitidos = ['admin', 'vendedor'];
        if (!rolesPermitidos.includes(String(req.usuario.rol).toLowerCase())) {
            console.log(`🚫 Bloqueado registro de actividad por rol: ${req.usuario.rol}`);
            return res.status(403).json({ msg: 'No tienes permisos de rol para registrar actividades' });
        }

        console.log(`✅ Usuario ${prospectorId} (${req.usuario.rol}) registrando actividad para cliente ${cid}`);

        const resultadoFinal = resultado && resultadosValidos.includes(resultado) ? resultado : 'pendiente';
        const fechaActividad = tipo === 'cita' && fechaCita ? new Date(fechaCita).toISOString() : new Date().toISOString();

        const ins = await db.prepare(`
            INSERT INTO actividades (tipo, vendedor, cliente, fecha, descripcion, resultado, notas)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(tipo, prospectorId, cid, fechaActividad, descripcion || `${tipo} registrada`, resultadoFinal, notas || '');

        const now = new Date().toISOString();
        const updates = ['ultimaInteraccion = ?'];
        const params = [now];

        // Lógica de Seguimiento: Actualizar Campos del Cliente
        if (proximaLlamada !== undefined) {
            updates.push('proximaLlamada = ?');
            params.push(proximaLlamada);
        }

        if (interes !== undefined) {
            updates.push('interes = ?');
            params.push(parseInt(interes));
        }

        if (customMetricLabel !== undefined) {
            updates.push('customMetricLabel = ?');
            params.push(customMetricLabel);
        }

        if (customMetricValue !== undefined) {
            updates.push('customMetricValue = ?');
            params.push(customMetricValue);
        }

        // Cambio manual o automático de etapa
        let nuevaEtapa = etapaEmbudo;
        if (!nuevaEtapa) {
            if (tipo === 'llamada' && resultadoFinal === 'exitoso' && cliente.etapaEmbudo === 'prospecto_nuevo') {
                nuevaEtapa = 'en_contacto';
            } else if (tipo === 'cita' && resultadoFinal === 'exitoso') {
                nuevaEtapa = 'en_negociacion';
            }
        }

        // PROTECCIÓN: Si el cliente ya está en una etapa ganada (CLIENT_STAGES),
        // no permitir retroceder a etapas de prospección (a menos que sea 'perdido').
        const yaEsClienteGanadoPros = CLIENT_STAGES.includes(cliente.etapaEmbudo || '');
        if (yaEsClienteGanadoPros && nuevaEtapa && nuevaEtapa !== 'perdido' && !CLIENT_STAGES.includes(nuevaEtapa)) {
            nuevaEtapa = null; // Bloquear el retroceso
        }

        if (nuevaEtapa && nuevaEtapa !== cliente.etapaEmbudo) {
            updates.push('etapaEmbudo = ?');
            params.push(nuevaEtapa);
            updates.push('fechaUltimaEtapa = ?');
            params.push(now);

            const hist = cliente.historialEmbudo ? JSON.parse(cliente.historialEmbudo) : [];
            hist.push({
                etapa: nuevaEtapa,
                fecha: now,
                vendedor: prospectorId,
                descripcion: `Actividad (${tipo}): Cambio a ${nuevaEtapa}`
            });
            updates.push('historialEmbudo = ?');
            params.push(JSON.stringify(hist));

            // Pilar 1: sincronizar tipo y estado
            if (CLIENT_STAGES.includes(nuevaEtapa)) {
                updates.push('tipo = ?');
                params.push('cliente');
                updates.push('estado = ?');
                params.push('ganado');
            } else if (nuevaEtapa === 'perdido') {
                updates.push('estado = ?');
                params.push('perdido');
            }
        }

        params.push(cid);
        await db.prepare(`UPDATE clientes SET ${updates.join(', ')} WHERE id = ?`).run(...params);

        const actRow = await db.prepare('SELECT * FROM actividades WHERE id = ?').get(ins.lastInsertRowid);
        const actividad = toMongoFormat(actRow);
        if (actividad) actividad.cliente = { nombres: cliente.nombres, apellidoPaterno: cliente.apellidoPaterno, empresa: cliente.empresa };

        // Si es venta o suscripcion y tiene monto, insertar en tabla ventas para el dashboard
        if ((tipo === 'venta' || tipo === 'suscripcion') && monto !== undefined && monto !== null && monto !== '') {
            const montoNum = parseFloat(monto);
            if (!isNaN(montoNum) && montoNum > 0) {
                try {
                    await db.prepare(`
                        INSERT INTO ventas (cliente, vendedor, monto, fecha, estado, notas)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `).run(cid, prospectorId, montoNum, new Date().toISOString(), 'completada', descripcion || 'Venta registrada');
                } catch (e) {
                    console.error('Error insertando en tabla ventas:', e);
                }
            }
        }

        // ✅ INVALIDAR CACHÉ: registrar actividad cambia el dashboard y la lista de prospectos
        invalidateUserCache(prospectorId);

        res.status(201).json({ msg: 'Actividad registrada', actividad: actividad || actRow });
    } catch (error) {
        console.error('Error al registrar actividad:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// GET /api/vendedor/prospecto/:id/historial-completo
// NUEVO: Historial COMPLETO visible para prospector o closer
router.get('/prospecto/:id/historial-completo', auth, async (req, res) => {
    try {
        const prospectoId = parseInt(req.params.id);
        const usuarioId = parseInt(req.usuario.id);

        console.log(`🔍 Consultando historial de prospecto ${prospectoId} por usuario ${usuarioId} (${req.usuario.rol})`);

        // Obtener cliente
        const cliente = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(prospectoId);
        if (!cliente) {
            return res.status(404).json({ msg: 'Prospecto no encontrado' });
        }

        if (!canReadCliente(cliente, usuarioId, req.usuario.equipo_id)) {
            return res.status(403).json({ msg: 'No tienes permiso para ver este prospecto' });
        }

        // UNIFICADO: Cualquier prospector o closer puede ver el historial (acceso compartido)
        const rolesPermitidos = ['admin', 'vendedor'];
        if (!rolesPermitidos.includes(String(req.usuario.rol).toLowerCase())) {
            return res.status(403).json({ msg: 'No tienes permisos de rol para ver esto' });
        }

        // Obtener TODAS las actividades del cliente (de todos los vendedores que han trabajado en él)
        const actividades = await db.prepare(`
            SELECT a.*, u.nombre as vendedorNombre, u.rol as vendedorRol
            FROM actividades a
            LEFT JOIN usuarios u ON a.vendedor = u.id
            WHERE a.cliente = ?
            ORDER BY a."createdAt" ASC
        `).all(prospectoId);

        // Obtener historial del embudo
        const historialEmbudo = cliente.historialEmbudo ? JSON.parse(cliente.historialEmbudo) : [];

        // Construir respuesta enriquecida
        const timeline = [];

        // Agregar cambios de etapa (FILTRAR los redundantes con actividades de cita)
        const etapasRelacionadasConCitas = ['reunion_agendada', 'reunion_realizada'];

        historialEmbudo.forEach(h => {
            const esRedundante = etapasRelacionadasConCitas.includes(h.etapa) &&
                actividades.some(a => a.tipo === 'cita' &&
                    Math.abs(new Date(a.fecha) - new Date(h.fecha)) < 60000);

            if (!esRedundante) {
                timeline.push({
                    tipo: 'cambio_etapa',
                    etapa: h.etapa,
                    fecha: h.fecha,
                    vendedorId: h.vendedor,
                    descripcion: h.descripcion || `Cambio a etapa: ${h.etapa}`,
                    resultado: h.resultado || null
                });
            }
        });

        // Agregar actividades
        actividades.forEach(a => {
            const mongoAct = toMongoFormat(a);
            timeline.push({
                tipo: 'actividad',
                id: mongoAct?.id || a.id,
                tipoActividad: a.tipo,
                fecha: a.fecha,
                vendedorId: a.vendedor,
                vendedorNombre: a.vendedorNombre || 'Desconocido',
                vendedorRol: a.vendedorRol || 'vendedor',
                descripcion: a.descripcion,
                resultado: a.resultado,
                notas: a.notas,
                createdAt: a.createdAt
            });
        });

        // Ordenar por fecha de creación (para que el orden refleje cuándo se registró cada cosa)
        // Usamos createdAt para actividades y fecha para cambios de etapa (que es cuando ocurren)
        timeline.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.fecha);
            const dateB = new Date(b.createdAt || b.fecha);
            return dateA - dateB;
        });

        res.json({
            cliente: toMongoFormat(cliente) || cliente,
            timeline,
            resumen: {
                totalActividades: actividades.length,
                etapaActual: cliente.etapaEmbudo,
                ultimaInteraccion: cliente.ultimaInteraccion,
                prospectorAsignado: cliente.prospectorAsignado,
                closerAsignado: cliente.closerAsignado
            }
        });
    } catch (error) {
        console.error('Error al obtener historial completo:', error);
        res.status(500).json({ msg: 'Error del servidor', error: error.message });
    }
});

// GET /api/vendedor/actividades-hoy
router.get('/actividades-hoy', [auth, esVendedor], async (req, res) => {
    try {
        const prospectorId = parseInt(req.usuario.id);
        const hoyInicio = new Date().toISOString().slice(0, 10) + ' 00:00:00';
        const hoyFin = new Date().toISOString().slice(0, 10) + ' 23:59:59';

        const rows = await db.prepare(`
            SELECT a.*, c.nombres as c_nombres, c.apellidoPaterno as c_apellidoPaterno, c.empresa as c_empresa, c.telefono as c_telefono
            FROM actividades a
            JOIN clientes c ON a.cliente = c.id
            WHERE a.vendedor = ? AND a.fecha >= ? AND a.fecha <= ?
            ORDER BY a.fecha DESC
        `).all(prospectorId, hoyInicio, hoyFin);

        const actividades = rows.map(r => ({
            ...r,
            cliente: r.c_id ? {
                id: r.c_id,
                nombres: r.c_nombres,
                apellidoPaterno: r.c_apellidoPaterno,
                empresa: r.c_empresa
            } : null
        }));

        res.json(actividades);
    } catch (error) {
        console.error('Error al obtener actividades:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// GET /api/vendedor/prospectos/:id/actividades
router.get('/prospectos/:id/actividades', auth, async (req, res) => {
    try {
        const prospectoId = parseInt(req.params.id);
        const userId = parseInt(req.usuario.id);
        const rol = String(req.usuario.rol).toLowerCase();

        // Verificar acceso (solo comprobar que exista el prospecto)
        const cliente = await db.prepare('SELECT id FROM clientes WHERE id = ?').get(prospectoId);
        if (!cliente) return res.status(404).json({ msg: 'Prospecto no encontrado' });

        const clienteFull = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(prospectoId);
        if (!canReadCliente(clienteFull, userId, req.usuario.equipo_id)) {
            return res.status(403).json({ msg: 'No tienes permiso para ver este prospecto' });
        }

        const actividades = await db.prepare(`
            SELECT a.*, u.nombre as vendedorNombre 
            FROM actividades a
            LEFT JOIN usuarios u ON a.vendedor = u.id
            WHERE a.cliente = ?
            ORDER BY a.fecha DESC
        `).all(prospectoId);

        res.json(actividades);
    } catch (error) {
        console.error('Error al obtener actividades de prospecto:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// ============ RECORDATORIOS DE LLAMADA (múltiples) ============

// GET /api/vendedor/prospectos/:id/recordatorios
router.get('/prospectos/:id/recordatorios', auth, async (req, res) => {
    try {
        const clienteId = parseInt(req.params.id);
        const vendedorId = parseInt(req.usuario.id, 10);
        const cliente = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(clienteId);
        if (!cliente) return res.status(404).json({ msg: 'Prospecto no encontrado' });
        if (!canReadCliente(cliente, vendedorId, req.usuario.equipo_id)) {
            return res.status(403).json({ msg: 'No tienes permiso para ver recordatorios de este prospecto' });
        }
        const rows = await db.prepare(`
            SELECT * FROM tareas
            WHERE cliente = ? AND titulo = 'Recordatorio de llamada' AND estado = 'pendiente'
            ORDER BY fechaLimite ASC
        `).all(clienteId);
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener recordatorios:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// POST /api/vendedor/prospectos/:id/recordatorios
router.post('/prospectos/:id/recordatorios', auth, async (req, res) => {
    try {
        const clienteId = parseInt(req.params.id);
        const vendedorId = parseInt(req.usuario.id, 10);
        const { fechaLimite, descripcion } = req.body;

        if (!fechaLimite) return res.status(400).json({ msg: 'La fecha es requerida' });

        const cliente = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(clienteId);
        if (!cliente) return res.status(404).json({ msg: 'Prospecto no encontrado' });
        if (!canWriteCliente(cliente, vendedorId)) {
            return res.status(403).json({ msg: 'Solo el propietario puede crear recordatorios' });
        }

        const result = await db.prepare(`
            INSERT INTO tareas (titulo, descripcion, vendedor, cliente, estado, prioridad, fechaLimite)
            VALUES ('Recordatorio de llamada', ?, ?, ?, 'pendiente', 'media', ?)
        `).run(descripcion || '', vendedorId, clienteId, new Date(fechaLimite).toISOString());

        const row = await db.prepare('SELECT * FROM tareas WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json({ msg: 'Recordatorio creado', recordatorio: row });
    } catch (error) {
        console.error('Error al crear recordatorio:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// DELETE /api/vendedor/recordatorios/:recordatorioId
router.delete('/recordatorios/:recordatorioId', auth, async (req, res) => {
    try {
        const id = parseInt(req.params.recordatorioId);
        const vendedorId = parseInt(req.usuario.id);
        const tarea = await db.prepare('SELECT id FROM tareas WHERE id = ? AND vendedor = ?').get(id, vendedorId);
        if (!tarea) return res.status(404).json({ msg: 'Recordatorio no encontrado' });
        await db.prepare('DELETE FROM tareas WHERE id = ?').run(id);
        res.json({ msg: 'Recordatorio eliminado' });
    } catch (error) {
        console.error('Error al eliminar recordatorio:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// PUT /api/vendedor/recordatorios/:recordatorioId
router.put('/recordatorios/:recordatorioId', auth, async (req, res) => {
    try {
        const id = parseInt(req.params.recordatorioId);
        const vendedorId = parseInt(req.usuario.id);
        const { fechaLimite, descripcion } = req.body;
        const tarea = await db.prepare('SELECT id FROM tareas WHERE id = ? AND vendedor = ?').get(id, vendedorId);
        if (!tarea) return res.status(404).json({ msg: 'Recordatorio no encontrado' });
        const updates = [];
        const params = [];
        if (fechaLimite !== undefined) { updates.push('fechaLimite = ?'); params.push(new Date(fechaLimite).toISOString()); }
        if (descripcion !== undefined) { updates.push('descripcion = ?'); params.push(descripcion); }
        if (updates.length > 0) {
            params.push(id);
            await db.prepare(`UPDATE tareas SET ${updates.join(', ')} WHERE id = ?`).run(...params);
        }
        const row = await db.prepare('SELECT * FROM tareas WHERE id = ?').get(id);
        res.json({ msg: 'Recordatorio actualizado', recordatorio: row });
    } catch (error) {
        console.error('Error al actualizar recordatorio:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// PUT /api/vendedor/prospectos/:id
router.put('/prospectos/:id', auth, async (req, res) => {
    try {
        const prospectoId = parseInt(req.params.id);
        const usuarioId = parseInt(req.usuario.id, 10);
        const { interes, proximaLlamada, customMetricLabel, customMetricValue, customSections } = req.body;

        const cliente = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(prospectoId);
        if (!cliente) return res.status(404).json({ msg: 'Prospecto no encontrado' });
        if (!canWriteCliente(cliente, usuarioId)) {
            return res.status(403).json({ msg: 'Solo el propietario puede editar este prospecto' });
        }

        const updates = [];
        const params = [];

        if (interes !== undefined) { updates.push('interes = ?'); params.push(interes); }
        if (proximaLlamada !== undefined) { updates.push('proximaLlamada = ?'); params.push(proximaLlamada); }
        if (customMetricLabel !== undefined) { updates.push('customMetricLabel = ?'); params.push(customMetricLabel); }
        if (customMetricValue !== undefined) { updates.push('customMetricValue = ?'); params.push(customMetricValue); }
        if (customSections !== undefined) {
            updates.push('customSections = ?');
            params.push(typeof customSections === 'string' ? customSections : JSON.stringify(customSections));
        }

        if (updates.length > 0) {
            params.push(prospectoId);
            await db.prepare(`UPDATE clientes SET ${updates.join(', ')} WHERE id = ?`).run(...params);
            invalidateUserCache(usuarioId);
        }

        res.json({ msg: 'Prospecto actualizado' });
    } catch (error) {
        console.error('Error al actualizar prospecto:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

router.patch('/prospectos/:id/compartir', auth, async (req, res) => {
    try {
        const prospectoId = parseInt(req.params.id, 10);
        const usuarioId = parseInt(req.usuario.id, 10);
        const cliente = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(prospectoId);

        if (!cliente) return res.status(404).json({ msg: 'Prospecto no encontrado' });
        if (!canWriteCliente(cliente, usuarioId)) {
            return res.status(403).json({ msg: 'Solo el propietario puede cambiar la visibilidad' });
        }

        const compartido = req.body?.compartido === true || req.body?.compartido === 1 || req.body?.compartido === '1';
        await db.prepare('UPDATE clientes SET compartido = ? WHERE id = ?').run(compartido, prospectoId);

        res.json({ msg: 'Visibilidad actualizada', compartido });
    } catch (error) {
        console.error('Error al actualizar visibilidad:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// PUT /api/vendedor/prospectos/:id/editar
router.put('/prospectos/:id/editar', [auth, esVendedor], async (req, res) => {
    try {
        const prospectoId = parseInt(req.params.id);
        const { nombres, apellidoPaterno, apellidoMaterno, telefono, telefono2, correo, empresa, ubicacion, notas, etapaEmbudo, sitioWeb, customMetricLabel, customMetricValue, fuente, etiquetas, etapaCliente } = req.body;
        const prospectorId = parseInt(req.usuario.id);
        const now = new Date().toISOString();

        const cliente = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(prospectoId);
        if (!cliente) {
            return res.status(404).json({ msg: 'Prospecto no encontrado' });
        }

        if (!canWriteCliente(cliente, prospectorId)) {
            return res.status(403).json({ msg: 'Solo el propietario puede editar este prospecto' });
        }

        const updates = [
            'nombres = ?', 'apellidoPaterno = ?', 'apellidoMaterno = ?',
            'telefono = ?', 'telefono2 = ?', 'correo = ?', 'empresa = ?', 'notas = ?', 'sitioWeb = ?', 'ubicacion = ?',
            'interes = ?', 'proximaLlamada = ?', 'customMetricLabel = ?', 'customMetricValue = ?', 'fuente = ?'
            // ultimaInteraccion NO se actualiza al editar datos — solo al registrar actividades reales
        ];
        const params = [
            nombres !== undefined ? (nombres || '').trim() : cliente.nombres,
            apellidoPaterno !== undefined ? (apellidoPaterno || '').trim() : cliente.apellidoPaterno,
            apellidoMaterno !== undefined ? (apellidoMaterno || '').trim() : cliente.apellidoMaterno,
            telefono !== undefined ? String(telefono || '').trim() : cliente.telefono,
            telefono2 !== undefined ? String(telefono2 || '').trim() : cliente.telefono2,
            correo !== undefined ? String(correo || '').trim().toLowerCase() : cliente.correo,
            empresa !== undefined ? (empresa || '').trim() : cliente.empresa,
            notas !== undefined ? (notas || '').trim() : cliente.notas,
            sitioWeb !== undefined ? (sitioWeb || '').trim() : cliente.sitioWeb,
            ubicacion !== undefined ? (ubicacion || '').trim() : cliente.ubicacion,
            req.body.interes !== undefined ? req.body.interes : cliente.interes,
            req.body.proximaLlamada !== undefined ? req.body.proximaLlamada : cliente.proximaLlamada,
            customMetricLabel !== undefined ? customMetricLabel : cliente.customMetricLabel,
            customMetricValue !== undefined ? customMetricValue : cliente.customMetricValue,
            fuente !== undefined ? fuente : cliente.fuente
        ];

        if (etiquetas !== undefined) {
            updates.push('etiquetas = ?');
            params.push(typeof etiquetas === 'string' ? etiquetas : JSON.stringify(etiquetas));
        }
        if (etapaCliente !== undefined) {
            updates.push('"etapaCliente" = ?');
            params.push(etapaCliente);
        }

        // Manejo de cambio de etapa
        if (etapaEmbudo && etapaEmbudo !== cliente.etapaEmbudo) {
            updates.push('etapaEmbudo = ?');
            params.push(etapaEmbudo);
            updates.push('fechaUltimaEtapa = ?');
            params.push(now);

            const hist = cliente.historialEmbudo ? JSON.parse(cliente.historialEmbudo) : [];
            hist.push({
                etapa: etapaEmbudo,
                fecha: now,
                vendedor: prospectorId,
                descripcion: `Edición: Cambio de etapa a ${etapaEmbudo}`
            });
            updates.push('historialEmbudo = ?');
            params.push(JSON.stringify(hist));

            // Pilar 1: sincronizar tipo y estado
            if (CLIENT_STAGES.includes(etapaEmbudo)) {
                updates.push('tipo = ?');
                params.push('cliente');
                updates.push('estado = ?');
                params.push('ganado');
            } else if (etapaEmbudo === 'perdido') {
                updates.push('estado = ?');
                params.push('perdido');
            } else {
                updates.push('tipo = ?');
                params.push('prospecto');
                updates.push('estado = ?');
                params.push('proceso');
            }
        }

        params.push(prospectoId);

        await db.prepare(`
            UPDATE clientes 
            SET ${updates.join(', ')}
            WHERE id = ?
        `).run(...params);

        // ✅ INVALIDAR CACHÉ: datos del usuario cambiaron
        invalidateUserCache(prospectorId);

        res.json({ msg: 'Prospecto actualizado exitosamente' });
    } catch (error) {
        console.error('Error al editar prospecto:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// POST /api/vendedor/agendar-reunion
router.post('/agendar-reunion', [auth, esVendedor], async (req, res) => {
    try {
        const { clienteId, closerId, fechaReunion, notas, plataformaReunion = 'mirotalk', customLink, invitadosExtra = [] } = req.body;
        if (!clienteId || !closerId || !fechaReunion) {
            return res.status(400).json({ msg: 'Faltan datos requeridos' });
        }

        const cid = parseInt(clienteId);
        const closerIdNum = parseInt(closerId);
        const cliente = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(cid);
        if (!cliente) {
            return res.status(404).json({ msg: 'Cliente no encontrado' });
        }

        const prospectorId = parseInt(req.usuario.id);

        if (!canWriteCliente(cliente, prospectorId)) {
            return res.status(403).json({ msg: 'Solo el propietario puede agendar reuniones de este prospecto' });
        }

        // UNIFICADO: Acceso por rol
        const rolesPermitidos = ['admin', 'vendedor'];
        if (!rolesPermitidos.includes(String(req.usuario.rol).toLowerCase())) {
            return res.status(403).json({ msg: 'No tienes permiso para agendar reunión' });
        }

        const now = new Date().toISOString();
        const currentEtapa = cliente.etapaEmbudo || 'prospecto_nuevo';
        
        // No retroceder etapa si el cliente ya está en una etapa ganada (CLIENT_STAGES)
        const isAlreadyClient = CLIENT_STAGES.includes(currentEtapa);
        const nuevaEtapa = isAlreadyClient ? currentEtapa : 'reunion_agendada';
        const huboCambio = nuevaEtapa !== currentEtapa;

        const hist = cliente.historialEmbudo ? JSON.parse(cliente.historialEmbudo) : [];
        if (huboCambio) {
            hist.push({ etapa: 'reunion_agendada', fecha: now, vendedor: prospectorId });
        }

        await db.prepare(`
            UPDATE clientes SET etapaEmbudo = ?, closerAsignado = ?, fechaTransferencia = ?, fechaUltimaEtapa = ?, ultimaInteraccion = ?, historialEmbudo = ?
            WHERE id = ?
        `).run(nuevaEtapa, closerIdNum, now, now, now, JSON.stringify(hist), cid);

        const fechaReunionISO = new Date(fechaReunion).toISOString();
        const finReunionISO = new Date(new Date(fechaReunion).getTime() + 45 * 60000).toISOString();

        let hangoutLink = null;
        const emailsAsistentes = [];

        // 1. Obtener detalles del closer y recolectar correos
        const closerDetails = await db.prepare('SELECT email, nombre, googleRefreshToken, googleAccessToken, googleTokenExpiry FROM usuarios WHERE id = ?').get(closerIdNum);
        
        if (closerDetails && closerDetails.email) {
            emailsAsistentes.push(closerDetails.email);
        }
        if (cliente.correo && cliente.correo.trim() !== '') {
            emailsAsistentes.push(cliente.correo);
        }
        if (Array.isArray(invitadosExtra) && invitadosExtra.length > 0) {
            invitadosExtra.forEach(inv => {
                if (inv && !emailsAsistentes.includes(inv)) {
                    emailsAsistentes.push(inv);
                }
            });
        }

        if (plataformaReunion === 'google') {
            // ** GOOGLE CALENDAR INTEGRATION **
            try {
                if (closerDetails && (closerDetails.googleRefreshToken || closerDetails.googleAccessToken)) {
                    const { OAuth2Client } = require('google-auth-library');
                    const { google } = require('googleapis');

                    const client = new OAuth2Client(
                        process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
                        process.env.GOOGLE_CLIENT_SECRET
                    );

                    client.setCredentials({
                        refresh_token: closerDetails.googleRefreshToken,
                        access_token: closerDetails.googleAccessToken,
                        expiry_date: parseGoogleExpiryToMillis(closerDetails.googleTokenExpiry)
                    });

                    client.on('tokens', async (tokens) => {
                        let updateStr = [];
                        let params = [];
                        if (tokens.refresh_token) { updateStr.push('googleRefreshToken = ?'); params.push(tokens.refresh_token); }
                        if (tokens.access_token) { updateStr.push('googleAccessToken = ?'); params.push(tokens.access_token); }
                        if (tokens.expiry_date) { updateStr.push('googleTokenExpiry = ?'); params.push(tokens.expiry_date); }

                        if (updateStr.length > 0) {
                            params.push(closerIdNum);
                            await db.prepare(`UPDATE usuarios SET ${updateStr.join(', ')} WHERE id = ?`).run(...params);
                        }
                    });

                    const calendar = google.calendar({ version: 'v3', auth: client });

                    const attendeesList = [{ email: closerDetails.email }];
                    if (cliente.correo && cliente.correo.trim() !== '') {
                        attendeesList.push({ email: cliente.correo });
                    }

                    const event = {
                        summary: `[CITA AGENDADA] - ${cliente.nombres} ${cliente.apellidoPaterno}`,
                        description: `[SISTEMA-CRM]\nCliente: ${cliente.telefono} - ${cliente.empresa || 'Sin empresa'}\nNotas: ${notas || 'Sin notas'}\nAgendado por Prospecter ${req.usuario.nombre}.`,
                        start: { dateTime: fechaReunionISO, timeZone: 'America/Mexico_City' },
                        end: { dateTime: finReunionISO, timeZone: 'America/Mexico_City' },
                        attendees: attendeesList,
                        conferenceData: {
                            createRequest: {
                                requestId: 'meeting-' + Date.now().toString(),
                                conferenceSolutionKey: { type: 'hangoutsMeet' }
                            }
                        }
                    };

                    const createdEvent = await calendar.events.insert({
                        calendarId: 'primary',
                        conferenceDataVersion: 1,
                        sendUpdates: 'none', // Evitar que Google envíe su propio correo genérico
                        requestBody: event
                    });

                    // ✅ Robust extraction: check both hangoutLink and entryPoints
                    hangoutLink = createdEvent.data.hangoutLink;
                    if (!hangoutLink && createdEvent.data.conferenceData?.entryPoints) {
                        const ep = createdEvent.data.conferenceData.entryPoints.find(e => e.entryPointType === 'video');
                        if (ep) hangoutLink = ep.uri;
                    }
                }
            } catch (calendarError) {
                console.error('❌ Error detallado al crear evento en Google Calendar:', calendarError.response?.data || calendarError.message);
                // Si el error es de permisos/configuración de Google, informarlo
                if (isGoogleAuthError(calendarError)) {
                    return res.status(400).json({
                        msg: 'Error con Google Calendar (API deshabilitada o Sin Permisos)',
                        googleError: calendarError.response?.data?.error || calendarError.message,
                        details: calendarError.response?.data?.error_description || undefined,
                        code: 'google_config_error'
                    });
                }
                // Para otros errores, seguimos permitiendo la creación local pero avisamos
            }
            // ** END GOOGLE CALENDAR INTEGRATION **
        } else {
            // ** MIROTALK / CUSTOM INTEGRATION **
            try {
                const { v4: uuidv4 } = require('uuid');
                
                if (plataformaReunion === 'custom' && customLink) {
                    hangoutLink = customLink;
                } else {
                    // Generar enlace dinámico de MiroTalk SFU (Sin login, gratis, 100% automático)
                    const meetingId = uuidv4().substring(0, 10);
                    hangoutLink = `https://sfu.mirotalk.com/join/CRM-${meetingId}`;
                }
            } catch (error) {
                console.error('❌ Error al generar Custom/Mirotalk link:', error.message);
            }
            // ** END MIROTALK / CUSTOM INTEGRATION **
        }

        // ** UNIVERSAL ICS EMAIL INVITATION **
        if (emailsAsistentes.length > 0 && hangoutLink) {
            try {
                const { enviarInvitacionCalendario } = require('../services/emailService');
                // Enviar la invitación ICS con nuestro diseño HTML personalizado
                await enviarInvitacionCalendario({
                    fechaInicioISO: fechaReunionISO,
                    duracionMinutos: 45,
                    titulo: `[CITA] - ${cliente.nombres} ${cliente.apellidoPaterno}`,
                    descripcion: `Cliente: ${cliente.telefono} - ${cliente.empresa || 'Sin empresa'}\nNotas: ${notas || 'Sin notas'}\nAgendado por: ${req.usuario.nombre}.`,
                    jitsiLink: hangoutLink,
                    emailsAsistentes: emailsAsistentes
                });
            } catch (calendarError) {
                console.error('❌ Error al enviar invitación ICS universal:', calendarError.message);
                // No detenemos el flujo, seguimos agendando la cita en CRM
            }
        } else if (!hangoutLink) {
            console.warn('No se pudo enviar ICS universal porque no se pudo obtener un hangoutLink.');
        } else {
            console.warn('No se pudo enviar ICS universal porque ni el cliente ni el closer tienen email válido.');
        }


        const fechaDisplayMX = new Date(fechaReunion).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'short', timeStyle: 'short' });
        await db.prepare(`
            INSERT INTO actividades (tipo, vendedor, cliente, fecha, descripcion, resultado, notas, cambioEtapa, etapaAnterior, etapaNueva, "googleMeetLink")
            VALUES (?, ?, ?, ?, ?, 'pendiente', ?, ?, ?, ?, ?)
        `).run('cita', prospectorId, cid, fechaReunionISO, `Reunión agendada para el ${fechaDisplayMX} por prospector ${req.usuario.nombre} → Asignada a closer`, notas || '', huboCambio ? 1 : 0, currentEtapa, nuevaEtapa, hangoutLink || '');

        const clienteActualizado = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(cid);
        const actividadRow = await db.prepare('SELECT * FROM actividades WHERE cliente = ? ORDER BY id DESC LIMIT 1').get(cid);

        res.json({
            msg: 'Reunión agendada exitosamente',
            cliente: toMongoFormat(clienteActualizado),
            actividad: toMongoFormat(actividadRow),
            hangoutLink: hangoutLink // Link de Meet retornado al frontend
        });
    } catch (error) {
        console.error('Error al agendar reunión:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// POST /api/vendedor/pasar-a-cliente/:id
router.post('/pasar-a-cliente/:id', [auth, esVendedor], async (req, res) => {
    try {
        const { notas, fuente } = req.body;
        const clienteId = parseInt(req.params.id);
        const prospectorId = parseInt(req.usuario.id);

        const cliente = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(clienteId);
        if (!cliente) {
            return res.status(404).json({ msg: 'Prospecto no encontrado' });
        }

        if (!canWriteCliente(cliente, prospectorId)) {
            return res.status(403).json({ msg: 'Solo el propietario puede convertir este prospecto' });
        }

        // UNIFICADO: Acceso por rol
        const rolesPermitidos = ['admin', 'vendedor'];
        if (!rolesPermitidos.includes(String(req.usuario.rol).toLowerCase())) {
            return res.status(403).json({ msg: 'No tienes permiso para modificar este prospecto' });
        }

        const now = new Date().toISOString();

        // Registrar la actividad de conversión
        await db.prepare(`
            INSERT INTO actividades (tipo, vendedor, cliente, fecha, descripcion, resultado, notas)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run('prospecto', prospectorId, clienteId, now, 'Prospecto convertido a cliente', 'exitoso', notas || 'Convertido a cliente');

        // Actualizar etapa del prospecto y asegurar que tenga closerAsignado para que aparezca en la lista
        const hist = cliente.historialEmbudo ? JSON.parse(cliente.historialEmbudo) : [];
        hist.push({ etapa: 'venta_ganada', fecha: now, vendedor: prospectorId });

        const closerParaAsignar = cliente.closerAsignado || prospectorId;

        await db.prepare('UPDATE clientes SET "etapaEmbudo" = ?, estado = ?, tipo = ?, "fechaUltimaEtapa" = ?, "ultimaInteraccion" = ?, "historialEmbudo" = ?, "proximaLlamada" = NULL, "closerAsignado" = ?, fuente = ? WHERE id = ?')
            .run('venta_ganada', 'ganado', 'cliente', now, now, JSON.stringify(hist), closerParaAsignar, (fuente || cliente.fuente || '').trim(), clienteId);

        // Auto-registrar venta en $0 para que aparezca en el dashboard inmediatamente
        try {
            await db.prepare('INSERT INTO ventas (cliente, vendedor, monto, fecha, estado, notas) VALUES (?, ?, ?, ?, ?, ?)')
                .run(clienteId, closerParaAsignar, 0, now, 'completada', notas || 'Venta auto-registrada por conversión de prospecto');
        } catch (e) {
            console.error('Error auto-registrando venta:', e);
        }

        // ✅ INVALIDAR CACHÉ: prospecto cambió de estado, afecta dashboard y listas
        invalidateUserCache(prospectorId);

        res.json({ msg: '✓ Prospecto convertido a cliente' });
    } catch (error) {
        console.error('Error al pasar a cliente:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// POST /api/vendedor/descartar-prospecto/:id
router.post('/descartar-prospecto/:id', [auth, esVendedor], async (req, res) => {
    try {
        const { notas } = req.body;
        const clienteId = parseInt(req.params.id);
        const prospectorId = parseInt(req.usuario.id);

        const cliente = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(clienteId);
        if (!cliente) {
            return res.status(404).json({ msg: 'Prospecto no encontrado' });
        }

        if (!canWriteCliente(cliente, prospectorId)) {
            return res.status(403).json({ msg: 'Solo el propietario puede descartar este prospecto' });
        }

        // UNIFICADO: Acceso por rol
        const rolesPermitidos = ['admin', 'vendedor'];
        if (!rolesPermitidos.includes(String(req.usuario.rol).toLowerCase())) {
            return res.status(403).json({ msg: 'No tienes permiso para modificar este prospecto' });
        }

        const now = new Date().toISOString();
        const { motivoPerdida } = req.body;

        // Registrar la actividad de descarte
        await db.prepare(`
            INSERT INTO actividades (tipo, vendedor, cliente, fecha, descripcion, resultado, notas)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run('prospecto', prospectorId, clienteId, now, 'Prospecto descartado', 'fallido', notas || `Descartado: ${motivoPerdida || 'Sin motivo'}`);

        // Actualizar etapa del prospecto
        const hist = cliente.historialEmbudo ? JSON.parse(cliente.historialEmbudo) : [];
        hist.push({ etapa: 'perdido', fecha: now, vendedor: prospectorId, motivoPerdida });

        await db.prepare('UPDATE clientes SET "etapaEmbudo" = ?, "motivoPerdida" = ?, "fechaUltimaEtapa" = ?, "ultimaInteraccion" = ?, "historialEmbudo" = ?, "proximaLlamada" = NULL WHERE id = ?')
            .run('perdido', motivoPerdida || 'Otro', now, now, JSON.stringify(hist), clienteId);

        // ✅ INVALIDAR CACHÉ: prospecto descartado, afecta dashboard
        invalidateUserCache(prospectorId);

        res.json({ msg: '✓ Prospecto descartado' });
    } catch (error) {
        console.error('Error al descartar prospecto:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// GET /api/vendedor/estadisticas - Estadísticas detalladas del prospector
router.get('/estadisticas', [auth, esVendedor], async (req, res) => {
    try {
        const prospectorId = parseInt(req.usuario.id);
        const ahora = new Date();

        // Función auxiliar para obtener actividades en un período
        const getActividades = async (inicio, fin) => {
            const actividades = await db.prepare(`
                SELECT * FROM actividades WHERE vendedor = ? AND fecha >= ? AND fecha < ?
            `).all(prospectorId, inicio.toISOString(), fin.toISOString());
            return actividades || [];
        };

        // Períodos
        const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
        const inicioSemana = new Date(ahora);
        inicioSemana.setDate(ahora.getDate() - ahora.getDay());
        inicioSemana.setHours(0, 0, 0, 0);

        const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
        const finMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59);

        // Clientes totales
        const rowC1 = await db.prepare('SELECT COUNT(*) as c FROM clientes WHERE prospectorAsignado = ?').get(prospectorId);
        const ClientesTotales = rowC1?.c || 0;

        const hoyStr = hoy.toISOString().slice(0, 10);
        const rowC2 = await db.prepare('SELECT COUNT(*) as c FROM clientes WHERE prospectorAsignado = ? AND fechaRegistro LIKE ?')
            .get(prospectorId, `${hoyStr}%`);
        const clientesHoy = rowC2?.c || 0;

        // ... (actividades se calculan vía getActividades que ya usa rangos ISO) ...

        // Citas agendadas
        const inicioMesStr = inicioMes.toISOString().slice(0, 10);
        const finMesStr = finMes.toISOString().slice(0, 10);
        const inicioMesAnteriorStr = inicioMesAnterior.toISOString().slice(0, 10);
        const finMesAnteriorStr = finMesAnterior.toISOString().slice(0, 10);

        const rowCA1 = await db.prepare(`
            SELECT COUNT(*) as c FROM clientes WHERE prospectorAsignado = ? 
            AND etapaEmbudo = 'reunion_agendada' AND fechaUltimaEtapa >= ? AND fechaUltimaEtapa <= ?
        `).get(prospectorId, `${inicioMesStr} 00:00:00`, `${finMesStr} 23:59:59`);
        const citasAgendadasMes = rowCA1?.c || 0;

        const rowCA2 = await db.prepare(`
            SELECT COUNT(*) as c FROM clientes WHERE prospectorAsignado = ? 
            AND etapaEmbudo = 'reunion_agendada' AND fechaUltimaEtapa >= ? AND fechaUltimaEtapa <= ?
        `).get(prospectorId, `${inicioMesAnteriorStr} 00:00:00`, `${finMesAnteriorStr} 23:59:59`);
        const citasAgendadasMesAnterior = rowCA2?.c || 0;

        // Transferencias
        const rowT1 = await db.prepare(`
            SELECT COUNT(*) as c FROM clientes WHERE prospectorAsignado = ? 
            AND closerAsignado IS NOT NULL AND fechaTransferencia >= ? AND fechaTransferencia <= ?
        `).get(prospectorId, `${inicioMesStr} 00:00:00`, `${finMesStr} 23:59:59`);
        const transferidosMes = rowT1?.c || 0;

        // Distribución actual
        const rowD1 = await db.prepare('SELECT COUNT(*) as c FROM clientes WHERE prospectorAsignado = ? AND etapaEmbudo = ?').get(prospectorId, 'prospecto_nuevo');
        const rowD2 = await db.prepare('SELECT COUNT(*) as c FROM clientes WHERE prospectorAsignado = ? AND etapaEmbudo = ?').get(prospectorId, 'en_contacto');
        const rowD3 = await db.prepare('SELECT COUNT(*) as c FROM clientes WHERE prospectorAsignado = ? AND etapaEmbudo = ?').get(prospectorId, 'reunion_agendada');
        const rowD4 = await db.prepare('SELECT COUNT(*) as c FROM clientes WHERE prospectorAsignado = ? AND closerAsignado IS NOT NULL').get(prospectorId);

        const distribucion = {
            prospecto_nuevo: rowD1?.c || 0,
            en_contacto: rowD2?.c || 0,
            reunion_agendada: rowD3?.c || 0,
            transferidos: rowD4?.c || 0
        };

        // Tasas de conversión
        const tasaContactoMes = llamadasMes > 0 ? ((llamadasExitosasMes / llamadasMes) * 100).toFixed(1) : 0;
        const tasaAgendamiento = llamadasExitosasMes > 0 ? ((citasAgendadasMes / llamadasExitosasMes) * 100).toFixed(1) : 0;

        // Comparación con mes anterior
        const variacionLlamadas = llamadasMesAnterior > 0
            ? (((llamadasMes - llamadasMesAnterior) / llamadasMesAnterior) * 100).toFixed(1)
            : llamadasMes > 0 ? 100 : 0;
        const variacionCitas = citasAgendadasMesAnterior > 0
            ? (((citasAgendadasMes - citasAgendadasMesAnterior) / citasAgendadasMesAnterior) * 100).toFixed(1)
            : citasAgendadasMes > 0 ? 100 : 0;

        // Rendimiento semanal (últimas 4 semanas)
        const rendimientoSemanal = [];
        for (let i = 3; i >= 0; i--) {
            const inicioSemanaI = new Date(ahora);
            inicioSemanaI.setDate(ahora.getDate() - ahora.getDay() - (i * 7));
            inicioSemanaI.setHours(0, 0, 0, 0);

            const finSemanaI = new Date(inicioSemanaI);
            finSemanaI.setDate(inicioSemanaI.getDate() + 6);
            finSemanaI.setHours(23, 59, 59, 999);

            const actividadesSemanaI = await getActividades(inicioSemanaI, finSemanaI);
            const llamadasSemanaI = actividadesSemanaI.filter(a => a.tipo === 'llamada').length;
            const contactosSemanaI = actividadesSemanaI.filter(a => a.tipo === 'llamada' && a.resultado === 'exitoso').length;
            const rowRS = await db.prepare(`
                SELECT COUNT(*) as c FROM clientes WHERE prospectorAsignado = ? 
                AND etapaEmbudo = 'reunion_agendada' AND fechaUltimaEtapa >= ? AND fechaUltimaEtapa <= ?
            `).get(prospectorId, inicioSemanaI.toISOString(), finSemanaI.toISOString());
            const citasSemanaI = rowRS?.c || 0;

            const semanaNum = i + 1;
            const fecha = new Date(inicioSemanaI);
            rendimientoSemanal.push({
                semana: `Sem ${semanaNum}`,
                fecha: fecha.toISOString().split('T')[0],
                llamadas: llamadasSemanaI,
                contactos: contactosSemanaI,
                agendadas: citasSemanaI,
                tasaContacto: llamadasSemanaI > 0 ? ((contactosSemanaI / llamadasSemanaI) * 100).toFixed(1) : 0
            });
        }

        res.json({
            resumen: {
                totalClientes: ClientesTotales,
                clientesNuevosHoy: clientesHoy,
                transferidosMes
            },
            metricas: {
                hoy: {
                    llamadas: llamadasHoy,
                    exitosas: llamadasExitosasHoy,
                    tasaContacto: llamadasHoy > 0 ? ((llamadasExitosasHoy / llamadasHoy) * 100).toFixed(1) : 0
                },
                semana: {
                    llamadas: llamadasSemana,
                    exitosas: llamadasExitosasSemana,
                    tasaContacto: llamadasSemana > 0 ? ((llamadasExitosasSemana / llamadasSemana) * 100).toFixed(1) : 0
                },
                mes: {
                    llamadas: llamadasMes,
                    exitosas: llamadasExitosasMes,
                    citas: citasAgendadasMes,
                    tasaContacto: parseFloat(tasaContactoMes),
                    tasaAgendamiento: parseFloat(tasaAgendamiento)
                }
            },
            distribucion,
            variacion: {
                llamadas: parseFloat(variacionLlamadas),
                citas: parseFloat(variacionCitas)
            },
            rendimientoSemanal
        });
    } catch (error) {
        console.error('Error en estadísticas prospector:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// POST /api/vendedor/importar-csv
router.post('/importar-csv', [auth, esVendedor], async (req, res) => {
    try {
        const prospectorId = parseInt(req.usuario.id);
        const { prospectos } = req.body;
        if (!Array.isArray(prospectos) || prospectos.length === 0) {
            return res.status(400).json({ msg: 'No se recibieron prospectos para importar.' });
        }
        let insertados = 0;
        let duplicados = 0;
        let errores = 0;
        for (const p of prospectos) {
            try {
                if (p.telefono) {
                    const existe = await db.prepare('SELECT id FROM clientes WHERE telefono = ? AND prospectorAsignado = ?').get(String(p.telefono).trim(), prospectorId);
                    if (existe) { duplicados++; continue; }
                }
                const nombres = (p.nombres || '').trim();
                const apellidoPaterno = (p.apellidoPaterno || '').trim();
                const apellidoMaterno = (p.apellidoMaterno || '').trim();
                const telefono = String(p.telefono || '').trim();
                const correo = (p.correo || '').trim();
                const empresa = (p.empresa || '').trim();
                const notas = (p.notas || '').trim();
                const ahora = new Date().toISOString();
                const sql = 'INSERT INTO clientes (nombres, apellidoPaterno, apellidoMaterno, telefono, correo, empresa, notas, etapaEmbudo, vendedorAsignado, prospectorAsignado, "propietarioId", compartido, fechaRegistro, fechaUltimaEtapa) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                await db.prepare(sql).run(nombres, apellidoPaterno, apellidoMaterno, telefono, correo, empresa, notas, 'prospecto_nuevo', prospectorId, prospectorId, prospectorId, false, ahora, ahora);
                insertados++;
            } catch (err) {
                console.error('Error en fila CSV:', err.message);
                errores++;
            }
        }
        // ✅ INVALIDAR CACHÉ: se importaron prospectos nuevos
        invalidateUserCache(prospectorId);
        res.json({ insertados, duplicados, errores, total: prospectos.length });
    } catch (error) {
        console.error('Error en importar-csv:', error);
        res.status(500).json({ msg: 'Error al importar CSV', error: error.message });
    }
});

// DELETE /api/vendedor/prospectos/:id
router.delete('/prospectos/:id', [auth, esVendedor], async (req, res) => {
    try {
        const prospectoId = parseInt(req.params.id);
        const prospectorId = parseInt(req.usuario.id);

        const cliente = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(prospectoId);
        if (!cliente) {
            return res.status(404).json({ msg: 'Prospecto no encontrado' });
        }

        // Solo el propietario puede eliminar
        if (!canWriteCliente(cliente, prospectorId)) {
            return res.status(403).json({ msg: 'No tienes permiso para eliminar este prospecto' });
        }

        // Eliminar registros relacionados primero (integridad referencial)
        await db.prepare('DELETE FROM tareas WHERE cliente = ?').run(prospectoId);
        await db.prepare('DELETE FROM ventas WHERE cliente = ?').run(prospectoId);
        await db.prepare('DELETE FROM actividades WHERE cliente = ?').run(prospectoId);
        // Eliminar el prospecto
        await db.prepare('DELETE FROM clientes WHERE id = ?').run(prospectoId);

        // ✅ INVALIDAR CACHÉ: prospecto eliminado, afecta dashboard y lista
        invalidateUserCache(prospectorId);

        res.json({ msg: 'Prospecto eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar prospecto:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

router.get('/calendario', [auth, esVendedor], async (req, res) => {
    try {
        const closerId = parseInt(req.usuario.id);

        // Obtener todas las citas pendientes de la BD
        const rows = await db.prepare(`
            SELECT a.*, c.nombres as c_nombres, c.apellidoPaterno as c_apellido, c.empresa as c_empresa, c.telefono as c_telefono, c.correo as c_correo, c.etapaEmbudo as c_etapa,
            u.nombre as v_nombre FROM actividades a
            JOIN clientes c ON a.cliente = c.id
            JOIN usuarios u ON a.vendedor = u.id
            WHERE c.closerAsignado = ? AND a.tipo = ? AND a.resultado = 'pendiente'
            ORDER BY a.fecha ASC
        `).all(closerId, 'cita');

        // Filtrar citas que ya pasaron automáticamente
        const ahora = new Date();
        let reuniones = rows.filter(r => {
            const fechaCita = new Date(r.fecha);
            return fechaCita >= ahora;
        }).map(r => ({
            ...toMongoFormat(r),
            cliente: { nombres: r.c_nombres, apellidoPaterno: r.c_apellido, empresa: r.c_empresa, telefono: r.c_telefono, correo: r.c_correo, etapaEmbudo: r.c_etapa },
            vendedor: { nombre: r.v_nombre }
        }));

        // Marcar como fallidas las citas que ya pasaron
        const citasPasadas = rows.filter(r => new Date(r.fecha) < ahora);
        for (const cita of citasPasadas) {
            await db.prepare(`UPDATE actividades SET resultado = 'fallido', notas = COALESCE(notas || ' ', '') || '[Auto] Cita pasada sin registrar' WHERE id = ?`)
                .run(cita.id);
        }

        // Intentar sincronizar con Google Calendar si está conectado
        try {
            const usuario = await db.prepare('SELECT googleRefreshToken, googleAccessToken, googleTokenExpiry FROM usuarios WHERE id = ?').get(closerId);

            if (usuario && (usuario.googleRefreshToken || usuario.googleAccessToken)) {
                const { OAuth2Client } = require('google-auth-library');
                const { google } = require('googleapis');

                const client = new OAuth2Client(
                    process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
                    process.env.GOOGLE_CLIENT_SECRET
                );

                client.setCredentials({
                    refresh_token: usuario.googleRefreshToken,
                    access_token: usuario.googleAccessToken,
                    expiry_date: parseGoogleExpiryToMillis(usuario.googleTokenExpiry)
                });

                // Actualizar tokens si se refrescan
                client.on('tokens', async (tokens) => {
                    try {
                        let updateStr = [];
                        let params = [];
                        if (tokens.refresh_token) { updateStr.push('googleRefreshToken = ?'); params.push(tokens.refresh_token); }
                        if (tokens.access_token) { updateStr.push('googleAccessToken = ?'); params.push(tokens.access_token); }
                        if (tokens.expiry_date) {
                            updateStr.push('googleTokenExpiry = ?');
                            params.push(tokens.expiry_date);
                        }

                        if (updateStr.length > 0) {
                            params.push(closerId);
                            await db.prepare(`UPDATE usuarios SET ${updateStr.join(', ')} WHERE id = ?`).run(...params);
                        }
                    } catch (err) {
                        console.error(`❌ Error actualizando tokens para closer ${closerId}:`, err.message);
                    }
                });


                const calendar = google.calendar({ version: 'v3', auth: client });

                // Obtener eventos de Google Calendar desde ahora hasta 30 días adelante
                const timeMax = new Date();
                timeMax.setDate(timeMax.getDate() + 30);

                // Timeout de 5 segundos para no bloquear Railway
                const gcalTimeout1 = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Google Calendar timeout')), 5000)
                );
                const response = await Promise.race([calendar.events.list({
                    calendarId: 'primary',
                    timeMin: ahora.toISOString(),
                    timeMax: timeMax.toISOString(),
                    singleEvents: true,
                    orderBy: 'startTime'
                }), gcalTimeout1]);

                const eventosGoogle = response.data.items || [];

                // Verificar cada cita pendiente si todavía existe en Google Calendar
                const reunionesActualizadas = [];
                for (const reunion of reuniones) {
                    const fechaReunion = new Date(reunion.fecha);

                    // Buscar si existe un evento en Google Calendar cercano a esta fecha (+/- 5 minutos)
                    const existeEnGoogle = eventosGoogle.some(evento => {
                        if (!evento.start || !evento.start.dateTime) return false;
                        const fechaEvento = new Date(evento.start.dateTime);
                        const diferencia = Math.abs(fechaEvento - fechaReunion);
                        return diferencia < 5 * 60 * 1000; // 5 minutos de tolerancia
                    });

                    if (existeEnGoogle) {
                        // La cita todavía existe en Google Calendar
                        reunionesActualizadas.push(reunion);
                    } else {
                        // La cita fue eliminada de Google Calendar, marcarla como cancelada
                        await db.prepare(`UPDATE actividades SET resultado = 'fallido', notas = COALESCE(notas || ' ', '') || '[Sync] Eliminada de Google Calendar' WHERE id = ?`)
                            .run(reunion.id || reunion._id);
                    }
                }

                reuniones = reunionesActualizadas;
            }
        } catch (syncError) {
            // Si falla la sincronización con Google, continuar con los datos locales
            console.error('Error al sincronizar con Google Calendar:', syncError.message);
        }

        res.json(reuniones);
    } catch (error) {
        console.error('Error en calendario:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

router.get('/reuniones-pendientes', [auth, esVendedor], async (req, res) => {
    try {
        const closerId = parseInt(req.usuario.id);
        const rows = await db.prepare(`
            SELECT c.*, u.nombre as prospectorNombre FROM clientes c
            LEFT JOIN usuarios u ON c.prospectorAsignado = u.id
            WHERE c.closerAsignado = ? AND c.etapaEmbudo = ?
        `).all(closerId, 'reunion_agendada');
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

router.get('/prospectos', [auth, esVendedor], async (req, res) => {
    try {
        const closerId = parseInt(req.usuario.id);
        const rows = await db.prepare(`
            SELECT c.*, u.nombre as prospectorNombre,
            (
                SELECT MIN(a.fecha)
                FROM actividades a
                WHERE a.cliente = c.id
                  AND a.tipo = 'cita'
                  AND (a.resultado = 'pendiente' OR a.resultado IS NULL)
            ) as proximaCita
            FROM clientes c
            LEFT JOIN usuarios u ON c.prospectorAsignado = u.id
            WHERE c.closerAsignado = ? AND c.etapaEmbudo != ?
            ORDER BY c.fechaTransferencia DESC
        `).all(closerId, 'venta_ganada');
        res.json(rows.map(r => {
            const { prospectorNombre, ...c } = r;
            const out = toMongoFormat(c);
            if (out) {
                out.prospectorAsignado = { nombre: prospectorNombre };
                // Asegurar proximaLlamada unificada
                out.proximaLlamada = out.proximaLlamada || out.proximallamada || null;
                out.customSections = parseHistorialSeguro(c.customSections);
                out.historialEmbudo = parseHistorialSeguro(c.historialEmbudo);
            }
            return out;
        }));
    } catch (error) {
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// GET /api/closer/clientes-ganados
router.get('/clientes-ganados', [auth, esVendedor], async (req, res) => {
    try {
        const closerId = parseInt(req.usuario.id);
        const rows = await db.prepare(`
            SELECT c.*, u.nombre as prospectorNombre,
            (
                SELECT MIN(a.fecha)
                FROM actividades a
                WHERE a.cliente = c.id
                  AND a.tipo = 'cita'
                  AND (a.resultado = 'pendiente' OR a.resultado IS NULL)
            ) as proximaCita
            FROM clientes c
            LEFT JOIN usuarios u ON c.prospectorAsignado = u.id
            WHERE c.closerAsignado = ? AND c.etapaEmbudo = ?
            ORDER BY c.fechaUltimaEtapa DESC
        `).all(closerId, 'venta_ganada');

        const ids = rows.map(r => r.id).filter(Boolean);
        const ultimasActs = ids.length > 0
            ? await db.prepare(
                `SELECT a.cliente, a.tipo, COALESCE(NULLIF(a.notas, ''), a.descripcion) as texto
                 FROM actividades a
                 WHERE a.id IN (
                   SELECT MAX(id) FROM actividades WHERE cliente IN (${ids.map(() => '?').join(',')}) GROUP BY cliente
                 )`
            ).all(...ids)
            : [];

        const actMap = {};
        for (const a of ultimasActs) actMap[a.cliente] = { tipo: a.tipo, notas: a.texto };

        res.json(rows.map(r => {
            const { prospectorNombre, totalFacturado, ...c } = r;
            const out = toMongoFormat(c);
            if (out) {
                out.prospectorAsignado = { nombre: prospectorNombre };
                const act = actMap[r.id];
                out.ultimaActTipo = act?.tipo || null;
                out.ultimaActNotas = act?.notas || null;
                // Asegurar proximaLlamada unificada
                out.proximaLlamada = out.proximaLlamada || out.proximallamada || null;
                if (totalFacturado !== undefined && totalFacturado !== null) out.totalFacturado = totalFacturado;
            }
            return out;
        }));
    } catch (error) {
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// POST /api/closer/crear-prospecto
router.post('/crear-prospecto', [auth, esVendedor], async (req, res) => {
    try {
        const { nombres, apellidoPaterno, apellidoMaterno, telefono, telefono2, correo, empresa, notas } = req.body;
        if (!nombres || !telefono) {
            return res.status(400).json({ msg: 'Nombres y teléfono son requeridos' });
        }

        const closerId = parseInt(req.usuario.id);
        const equipoId = req.usuario.equipo_id || null;
        const now = new Date().toISOString();

        // MEJORADO: Incluir vendedorAsignado y prospectorAsignado para consistencia en Postgres
        const stmt = await db.prepare(`
            INSERT INTO clientes (nombres, apellidoPaterno, apellidoMaterno, telefono, telefono2, correo, empresa, notas, vendedorAsignado, prospectorAsignado, closerAsignado, etapaEmbudo, fechaRegistro, "equipo_id")
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'prospecto_nuevo', ?, ?)
        `);
        const result = await stmt.run(
            nombres.trim(),
            (apellidoPaterno || '').trim(),
            (apellidoMaterno || '').trim(),
            String(telefono).trim(),
            String(telefono2 || '').trim(),
            String(correo || '').trim().toLowerCase(),
            (empresa || '').trim(),
            (notas || '').trim(),
            closerId,
            closerId,
            closerId,
            now,
            equipoId
        );

        const row = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(result.lastInsertRowid);
        const cliente = toMongoFormat(row);
        if (cliente) cliente.closerAsignado = { nombre: req.usuario.nombre };

        res.status(201).json({ msg: 'Prospecto creado', cliente: cliente || row });
    } catch (error) {
        console.error('Error al crear prospecto:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// POST /api/closer/registrar-actividad
router.post('/registrar-actividad', [auth, esVendedor], async (req, res) => {
    try {
        const { clienteId, tipo, resultado, descripcion, notas, fechaCita, etapaEmbudo, proximaLlamada, interes, monto } = req.body;
        const tiposValidos = ['llamada', 'mensaje', 'correo', 'whatsapp', 'cita', 'cliente', 'descartado', 'venta', 'suscripcion'];
        const resultadosValidos = ['exitoso', 'pendiente', 'fallido', 'convertido', 'descartado', 'enviado'];

        if (!clienteId || !tipo) {
            return res.status(400).json({ msg: 'Cliente y tipo de actividad son requeridos' });
        }
        if (!tiposValidos.includes(tipo)) {
            return res.status(400).json({ msg: 'Tipo de actividad no válido' });
        }

        const cid = parseInt(clienteId);
        const cliente = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(cid);
        if (!cliente) {
            return res.status(404).json({ msg: 'Cliente no encontrado' });
        }
        const closerId = parseInt(req.usuario.id);

        const rolesPermitidos = ['admin', 'vendedor'];
        if (!rolesPermitidos.includes(String(req.usuario.rol).toLowerCase())) {
            return res.status(403).json({ msg: 'No tienes permiso para registrar actividades' });
        }

        console.log(`✅ Registro de actividad por ${req.usuario.nombre} (${req.usuario.rol}) para cliente ${cid}`);

        const resultadoFinal = resultado && resultadosValidos.includes(resultado) ? resultado : 'pendiente';
        const fechaActividad = tipo === 'cita' && fechaCita ? new Date(fechaCita).toISOString() : new Date().toISOString();

        const ins = await db.prepare(`
            INSERT INTO actividades (tipo, vendedor, cliente, fecha, descripcion, resultado, notas)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(tipo, closerId, cid, fechaActividad, descripcion || `${tipo} registrada`, resultadoFinal, notas || '');

        const now = new Date().toISOString();
        const updates = ['ultimaInteraccion = ?'];
        const params = [now];

        // Actualizar proximaLlamada si se proporcionó
        if (proximaLlamada !== undefined) {
            updates.push('proximaLlamada = ?');
            params.push(proximaLlamada);
        }

        // Actualizar interés si se proporcionó
        if (interes !== undefined) {
            updates.push('interes = ?');
            params.push(parseInt(interes));
        }

        // ============ AUTO-PROMOCIÓN DE ETAPA ============
        const etapaActual = cliente.etapaEmbudo || 'prospecto_nuevo';
        // IMPORTANTE: Incluir todas las etapas posibles en orden ascendente para la protección anti-retroceso
        const ORDEN_ETAPAS = ['prospecto_nuevo', 'en_contacto', 'reunion_agendada', 'reunion_realizada', 'en_negociacion', 'venta_ganada', 'cotizacion_realizada', 'contrato_firmado', 'esperando_pago', 'cliente_activo'];
        const rankActual = ORDEN_ETAPAS.indexOf(etapaActual);
        let nuevaEtapaAuto = null;

        // PROTECCIÓN: Si el cliente ya está en una etapa ganada (CLIENT_STAGES), no permitir
        // ningún cambio automático de etapa que lo regrese al pipeline de ventas.
        const yaEsClienteGanado = CLIENT_STAGES.includes(etapaActual);

        if (!yaEsClienteGanado) {
            if (tipo === 'llamada' && resultadoFinal === 'exitoso') {
                if (etapaActual === 'prospecto_nuevo') nuevaEtapaAuto = 'en_contacto';
            } else if ((tipo === 'whatsapp' || tipo === 'correo' || tipo === 'mensaje') && resultadoFinal === 'exitoso') {
                if (etapaActual === 'prospecto_nuevo') nuevaEtapaAuto = 'en_contacto';
            } else if (tipo === 'cita' && resultadoFinal === 'exitoso') {
                const rankCita = ORDEN_ETAPAS.indexOf('reunion_agendada');
                if (rankActual !== -1 && rankActual < rankCita) nuevaEtapaAuto = 'reunion_agendada';
            } else if (tipo === 'cita' && resultadoFinal === 'convertido') {
                const rankReal = ORDEN_ETAPAS.indexOf('reunion_realizada');
                if (rankActual !== -1 && rankActual < rankReal) nuevaEtapaAuto = 'reunion_realizada';
            } else if (tipo === 'descartado') {
                nuevaEtapaAuto = 'perdido';
            }
        }

        // Si el campo etapaEmbudo viene explícitamente en la petición, solo permitirlo
        // si no hace retroceder a un cliente ganado (a menos que sea 'perdido').
        let nuevaEtapa = yaEsClienteGanado && etapaEmbudo && etapaEmbudo !== 'perdido' && !CLIENT_STAGES.includes(etapaEmbudo)
            ? null  // Bloquear retroceso explícito a etapas de prospección
            : (etapaEmbudo || nuevaEtapaAuto);

        if (nuevaEtapa && nuevaEtapa !== 'perdido') {
            const rankNueva = ORDEN_ETAPAS.indexOf(nuevaEtapa);
            const rankProteccion = rankActual !== -1 ? rankActual : 999; // Si rankActual es -1 (etapa desconocida), tratar como máxima protección
            if (rankNueva !== -1 && rankNueva <= rankProteccion) nuevaEtapa = null;
        }

        if (nuevaEtapa && nuevaEtapa !== cliente.etapaEmbudo) {
            updates.push('etapaEmbudo = ?');
            params.push(nuevaEtapa);
            updates.push('fechaUltimaEtapa = ?');
            params.push(now);

            const hist = cliente.historialEmbudo ? JSON.parse(cliente.historialEmbudo) : [];
            hist.push({
                etapa: nuevaEtapa,
                fecha: now,
                vendedor: closerId,
                descripcion: `Actividad (${tipo}): Cambio a ${nuevaEtapa}`
            });
            updates.push('historialEmbudo = ?');
            params.push(JSON.stringify(hist));
        }

        params.push(cid);
        await db.prepare(`UPDATE clientes SET ${updates.join(', ')} WHERE id = ?`).run(...params);

        const actRow = await db.prepare('SELECT * FROM actividades WHERE id = ?').get(ins.lastInsertRowid);
        const actividad = toMongoFormat(actRow);
        if (actividad) actividad.cliente = { nombres: cliente.nombres, apellidoPaterno: cliente.apellidoPaterno, empresa: cliente.empresa };

        // Si es venta o suscripcion y tiene monto, insertar en tabla ventas para el dashboard
        if ((tipo === 'venta' || tipo === 'suscripcion') && monto !== undefined && monto !== null && monto !== '') {
            const montoNum = parseFloat(monto);
            if (!isNaN(montoNum) && montoNum > 0) {
                try {
                    await db.prepare(`
                        INSERT INTO ventas (cliente, vendedor, monto, fecha, estado, notas)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `).run(cid, closerId, montoNum, new Date().toISOString(), 'completada', descripcion || 'Venta registrada');
                } catch (e) {
                    console.error('Error insertando en tabla ventas:', e);
                }
            }
        }

        res.status(201).json({ msg: 'Actividad registrada', actividad: actividad || actRow });
    } catch (error) {
        console.error('Error al registrar actividad:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// PUT /api/closer/prospectos/:id  — actualización simple (interés, próxima llamada)
router.put('/prospectos/:id', auth, async (req, res) => {
    try {
        const prospectoId = parseInt(req.params.id);
        const usuarioId = parseInt(req.usuario.id, 10);
        const { interes, proximaLlamada, customMetricLabel, customMetricValue, customSections } = req.body;

        const updates = [];
        const params = [];

        if (interes !== undefined) { updates.push('interes = ?'); params.push(interes); }
        if (proximaLlamada !== undefined) { updates.push('proximaLlamada = ?'); params.push(proximaLlamada); }
        if (customMetricLabel !== undefined) { updates.push('customMetricLabel = ?'); params.push(customMetricLabel); }
        if (customMetricValue !== undefined) { updates.push('customMetricValue = ?'); params.push(customMetricValue); }
        if (customSections !== undefined) {
            updates.push('customSections = ?');
            params.push(typeof customSections === 'string' ? customSections : JSON.stringify(customSections));
        }

        if (updates.length > 0) {
            params.push(prospectoId);
            await db.prepare(`UPDATE clientes SET ${updates.join(', ')} WHERE id = ?`).run(...params);
            invalidateUserCache(usuarioId);
        }

        res.json({ msg: 'Prospecto actualizado' });
    } catch (error) {
        console.error('Error al actualizar prospecto:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});


// GET /api/closer/prospecto/:id/historial-completo
// COMPATIBILIDAD: También sirve para /api/closer/Cliente/:id/historial-completo
// REUTILIZADO: Historial COMPLETO visible para prospector o closer
router.get(['/prospecto/:id/historial-completo', '/Cliente/:id/historial-completo'], auth, async (req, res) => {
    try {
        const prospectoId = parseInt(req.params.id);
        const usuarioId = parseInt(req.usuario.id);

        console.log(`🔍 [Closer] Consultando historial de prospecto ${prospectoId} por usuario ${usuarioId} (${req.usuario.rol})`);

        // Obtener cliente
        const cliente = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(prospectoId);
        if (!cliente) {
            return res.status(404).json({ msg: 'Prospecto no encontrado' });
        }

        // UNIFICADO: Cualquier prospector o closer puede ver el historial (acceso compartido)
        const rolesPermitidos = ['admin', 'vendedor'];
        if (!rolesPermitidos.includes(String(req.usuario.rol).toLowerCase())) {
            return res.status(403).json({ msg: 'No tienes permisos de rol para ver esto' });
        }

        // Obtener TODAS las actividades del cliente
        const actividades = await db.prepare(`
            SELECT a.*, u.nombre as vendedorNombre, u.rol as vendedorRol
            FROM actividades a
            LEFT JOIN usuarios u ON a.vendedor = u.id
            WHERE a.cliente = ?
            ORDER BY a."createdAt" ASC
        `).all(prospectoId);

        // Obtener historial del embudo
        const historialEmbudo = cliente.historialEmbudo ? JSON.parse(cliente.historialEmbudo) : [];

        // Construir respuesta enriquecida
        const timeline = [];

        // Agregar cambios de etapa (FILTRAR los redundantes con actividades de cita)
        const etapasRelacionadasConCitas = ['reunion_agendada', 'reunion_realizada'];

        historialEmbudo.forEach(h => {
            const esRedundante = etapasRelacionadasConCitas.includes(h.etapa) &&
                actividades.some(a => a.tipo === 'cita' &&
                    Math.abs(new Date(a.fecha) - new Date(h.fecha)) < 60000);

            if (!esRedundante) {
                timeline.push({
                    tipo: 'cambio_etapa',
                    etapa: h.etapa,
                    fecha: h.fecha,
                    vendedorId: h.vendedor,
                    descripcion: h.descripcion || `Cambio a etapa: ${h.etapa}`,
                    resultado: h.resultado || null
                });
            }
        });

        // Agregar actividades
        actividades.forEach(a => {
            const mongoAct = toMongoFormat(a);
            timeline.push({
                tipo: 'actividad',
                id: mongoAct?.id || a.id,
                tipoActividad: a.tipo,
                fecha: a.fecha,
                vendedorId: a.vendedor,
                vendedorNombre: a.vendedorNombre || 'Desconocido',
                vendedorRol: a.vendedorRol || 'vendedor',
                descripcion: a.descripcion,
                resultado: a.resultado,
                notas: a.notas,
                createdAt: a.createdAt
            });
        });

        // Ordenar por fecha de creación (para que el orden refleje cuándo se registró cada cosa)
        timeline.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.fecha);
            const dateB = new Date(b.createdAt || b.fecha);
            return dateA - dateB;
        });

        res.json({
            cliente: toMongoFormat(cliente) || cliente,
            timeline,
            resumen: {
                totalActividades: actividades.length,
                etapaActual: cliente.etapaEmbudo,
                ultimaInteraccion: cliente.ultimaInteraccion,
                prospectorAsignado: cliente.prospectorAsignado,
                closerAsignado: cliente.closerAsignado
            }
        });
    } catch (error) {
        console.error('Error al obtener historial completo:', error);
        res.status(500).json({ msg: 'Error del servidor', error: error.message });
    }
});

// GET /api/closer/prospectos/:id/actividades
router.get('/prospectos/:id/actividades', auth, async (req, res) => {
    try {
        const prospectoId = parseInt(req.params.id);

        // UNIFICADO: Acceso por rol
        const rolesPermitidos = ['admin', 'vendedor'];
        if (!rolesPermitidos.includes(String(req.usuario.rol).toLowerCase())) {
            return res.status(403).json({ msg: 'No autorizado' });
        }

        const cliente = await db.prepare('SELECT id FROM clientes WHERE id = ?').get(prospectoId);
        if (!cliente) return res.status(404).json({ msg: 'Prospecto no encontrado' });

        const acts = await db.prepare('SELECT a.*, u.nombre as vendedorNombre FROM actividades a LEFT JOIN usuarios u ON a.vendedor = u.id WHERE a.cliente = ? ORDER BY a.fecha DESC').all(prospectoId);
        const actividades = acts.map(a => {
            const { vendedorNombre, ...act } = a;
            const out = toMongoFormat(act);
            if (out && vendedorNombre) out.vendedorNombre = vendedorNombre;
            return out || act;
        });
        res.json(actividades);
    } catch (error) {
        res.status(500).json({ msg: 'Error al obtener actividades' });
    }
});

router.post('/registrar-reunion', [auth, esVendedor], async (req, res) => {
    try {
        const { clienteId, resultado, notas, fechaReunion } = req.body;

        const resultadosValidos = ['no_asistio', 'no_venta', 'otra_reunion', 'cotizacion', 'venta'];
        if (!clienteId || !resultado || !resultadosValidos.includes(resultado)) {
            return res.status(400).json({ msg: 'clienteId y resultado son requeridos' });
        }

        const cid = parseInt(clienteId);
        const closerId = parseInt(req.usuario.id);
        const c = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(cid);
        if (!c) return res.status(404).json({ msg: 'Cliente no encontrado' });

        // UNIFICADO: Acceso por rol
        const rolesPermitidos = ['admin', 'vendedor'];
        if (!rolesPermitidos.includes(String(req.usuario.rol).toLowerCase())) {
            return res.status(403).json({ msg: 'No autorizado' });
        }

        // Mapa de resultado → etapa del embudo
        const etapaMap = {
            no_asistio: 'perdido',
            no_venta: 'perdido',
            otra_reunion: 'reunion_agendada',
            cotizacion: 'en_negociacion',
            venta: 'venta_ganada'
        };

        // Descripción legible para el historial
        const descMap = {
            no_asistio: 'Reunión — Cliente no asistió',
            no_venta: 'Reunión realizada — No le interesó',
            otra_reunion: 'Reunión realizada — Quiere otra reunión',
            cotizacion: 'Reunión realizada — Quiere cotización',
            venta: 'Reunión realizada — ¡Venta cerrada!'
        };

        const currentEtapa = c.etapaEmbudo || 'prospecto_nuevo';
        const isAlreadyClient = CLIENT_STAGES.includes(currentEtapa);
        
        let etapaNueva = etapaMap[resultado];
        // Si ya es un cliente ganado, no retroceder a etapas de prospección
        if (isAlreadyClient && (etapaNueva === 'reunion_agendada' || etapaNueva === 'en_negociacion')) {
            etapaNueva = currentEtapa;
        }

        const huboCambio = etapaNueva !== currentEtapa;
        const descripcion = descMap[resultado];
        const now = new Date().toISOString();

        const hist = c.historialEmbudo ? JSON.parse(c.historialEmbudo) : [];
        if (huboCambio) {
            hist.push({ etapa: etapaNueva, fecha: now, vendedor: closerId, resultado, descripcion });
        }

        const estado = etapaNueva === 'venta_ganada' ? 'ganado'
            : etapaNueva === 'perdido' ? 'perdido'
                : 'proceso';

        // Limpiar proximaLlamada al registrar resultado de reunión
        await db.prepare('UPDATE clientes SET etapaEmbudo = ?, estado = ?, fechaUltimaEtapa = ?, ultimaInteraccion = ?, historialEmbudo = ?, proximaLlamada = NULL WHERE id = ?')
            .run(etapaNueva, estado, now, now, JSON.stringify(hist), cid);

        const resStatus = resultado === 'venta' ? 'exitoso' : (resultado === 'no_asistio' || resultado === 'no_venta' ? 'fallido' : 'exitoso');

        // Cerrar solo la cita pendiente que corresponde a esta reunión.
        // Si llega fechaReunion, toma la más cercana a esa fecha.
        let citaObjetivo = null;
        if (fechaReunion) {
            citaObjetivo = await db.prepare(`
                SELECT id FROM actividades
                WHERE cliente = ? AND tipo = 'cita' AND resultado = 'pendiente'
                ORDER BY ABS(strftime('%s', fecha) - strftime('%s', ?)) ASC
                LIMIT 1
            `).get(cid, new Date(fechaReunion).toISOString());
        }

        if (!citaObjetivo) {
            citaObjetivo = await db.prepare(`
                SELECT id FROM actividades
                WHERE cliente = ? AND tipo = 'cita' AND resultado = 'pendiente'
                ORDER BY fecha ASC
                LIMIT 1
            `).get(cid);
        }

        if (citaObjetivo) {
            await db.prepare('UPDATE actividades SET resultado = ? WHERE id = ?')
                .run(resStatus, citaObjetivo.id);
        }

        await db.prepare('INSERT INTO actividades (tipo, vendedor, cliente, fecha, descripcion, resultado, notas) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .run('cita', closerId, cid, now, descripcion, resStatus, notas || '');

        const row = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(cid);
        
        // Invalidar caché del dashboard
        invalidateUserCache(closerId);

        res.json({ msg: 'Reunión registrada', cliente: toMongoFormat(row) || row });
    } catch (error) {
        console.error('Error al registrar reunión:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// PUT /api/closer/prospectos/:id/editar
router.put('/prospectos/:id/editar', [auth, esVendedor], async (req, res) => {
    try {
        const prospectoId = parseInt(req.params.id);
        const { nombres, apellidoPaterno, apellidoMaterno, telefono, telefono2, correo, empresa, notas, etapaEmbudo, interes, proximaLlamada, customSections, fuente } = req.body;
        const now = new Date().toISOString();

        const c = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(prospectoId);
        if (!c) return res.status(404).json({ msg: 'Prospecto no encontrado' });

        const updates = [
            'nombres = ?', 'apellidoPaterno = ?', 'apellidoMaterno = ?',
            'telefono = ?', 'telefono2 = ?', 'correo = ?', 'empresa = ?', 'notas = ?',
            'ultimaInteraccion = ?'
        ];
        const params = [
            nombres !== undefined ? (nombres || '').trim() : c.nombres,
            apellidoPaterno !== undefined ? (apellidoPaterno || '').trim() : c.apellidoPaterno,
            apellidoMaterno !== undefined ? (apellidoMaterno || '').trim() : c.apellidoMaterno,
            telefono !== undefined ? String(telefono || '').trim() : c.telefono,
            telefono2 !== undefined ? String(telefono2 || '').trim() : c.telefono2,
            correo !== undefined ? String(correo || '').trim().toLowerCase() : c.correo,
            empresa !== undefined ? (empresa || '').trim() : c.empresa,
            notas !== undefined ? (notas || '').trim() : c.notas,
            now
        ];

        if (interes !== undefined) { updates.push('interes = ?'); params.push(interes); }
        if (proximaLlamada !== undefined) { updates.push('proximaLlamada = ?'); params.push(proximaLlamada); }
        if (customSections !== undefined) {
            updates.push('customSections = ?');
            params.push(typeof customSections === 'string' ? customSections : JSON.stringify(customSections));
        }
        if (fuente !== undefined) { updates.push('fuente = ?'); params.push(fuente); }

        // Manejo de cambio de etapa
        if (etapaEmbudo && etapaEmbudo !== c.etapaEmbudo) {
            updates.push('etapaEmbudo = ?');
            params.push(etapaEmbudo);
            updates.push('fechaUltimaEtapa = ?');
            params.push(now);

            const hist = c.historialEmbudo ? JSON.parse(c.historialEmbudo) : [];
            hist.push({
                etapa: etapaEmbudo,
                fecha: now,
                vendedor: parseInt(req.usuario.id),
                descripcion: `Edición (Closer): Cambio de etapa a ${etapaEmbudo}`
            });
            updates.push('historialEmbudo = ?');
            params.push(JSON.stringify(hist));

            // Sincronizar estado
            if (etapaEmbudo === 'venta_ganada') {
                updates.push('estado = ?');
                params.push('ganado');
            } else if (etapaEmbudo === 'perdido') {
                updates.push('estado = ?');
                params.push('perdido');
            }
        }

        params.push(prospectoId);

        await db.prepare(`
            UPDATE clientes 
            SET ${updates.join(', ')}
            WHERE id = ?
        `).run(...params);

        // Invalidar caché del dashboard
        invalidateUserCache(parseInt(req.usuario.id));

        res.json({ msg: 'Prospecto actualizado exitosamente' });
    } catch (error) {
        console.error('Error al editar prospecto:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// DELETE /api/closer/prospectos/:id
router.delete('/prospectos/:id', [auth, esVendedor], async (req, res) => {
    try {
        const prospectoId = parseInt(req.params.id);

        const cliente = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(prospectoId);
        if (!cliente) {
            return res.status(404).json({ msg: 'Prospecto no encontrado' });
        }

        // Eliminar registros relacionados primero (integridad referencial)
        await db.prepare('DELETE FROM tareas WHERE cliente = ?').run(prospectoId);
        await db.prepare('DELETE FROM ventas WHERE cliente = ?').run(prospectoId);
        await db.prepare('DELETE FROM actividades WHERE cliente = ?').run(prospectoId);
        // Eliminar el prospecto
        await db.prepare('DELETE FROM clientes WHERE id = ?').run(prospectoId);

        // Invalidar caché
        invalidateUserCache(parseInt(req.usuario.id));

        res.json({ msg: 'Prospecto eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar prospecto:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// POST /api/closer/pasar-a-cliente/:id
router.post('/pasar-a-cliente/:id', [auth, esVendedor], async (req, res) => {
    try {
        const { notas, fuente } = req.body;
        const clienteId = parseInt(req.params.id);
        const closerId = parseInt(req.usuario.id);

        const cliente = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(clienteId);
        if (!cliente) {
            return res.status(404).json({ msg: 'Prospecto no encontrado' });
        }

        // UNIFICADO: Acceso por rol
        const rolesPermitidos = ['admin', 'vendedor'];
        if (!rolesPermitidos.includes(String(req.usuario.rol).toLowerCase())) {
            return res.status(403).json({ msg: 'No tienes permiso' });
        }

        const now = new Date().toISOString();

        // Registrar la actividad de conversión
        await db.prepare(`
            INSERT INTO actividades(tipo, vendedor, cliente, fecha, descripcion, resultado, notas)
        VALUES(?, ?, ?, ?, ?, ?, ?)
            `).run('prospecto', closerId, clienteId, now, 'Prospecto convertido a cliente', 'exitoso', notas || 'Convertido a cliente');

        // Actualizar etapa del prospecto y asegurar que tenga closerAsignado
        const hist = cliente.historialEmbudo ? JSON.parse(cliente.historialEmbudo) : [];
        hist.push({ etapa: 'venta_ganada', fecha: now, vendedor: closerId });

        const closerParaAsignar = cliente.closerAsignado || closerId;

        await db.prepare('UPDATE clientes SET etapaEmbudo = ?, estado = ?, fechaUltimaEtapa = ?, ultimaInteraccion = ?, historialEmbudo = ?, closerAsignado = ?, fuente = ? WHERE id = ?')
            .run('venta_ganada', 'ganado', now, now, JSON.stringify(hist), closerParaAsignar, (fuente || cliente.fuente || '').trim(), clienteId);

        // Invalidar caché
        invalidateUserCache(closerId);

        res.json({ msg: '✓ Prospecto convertido a cliente' });
    } catch (error) {
        console.error('Error al pasar a cliente:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// POST /api/closer/descartar-prospecto/:id
router.post('/descartar-prospecto/:id', [auth, esVendedor], async (req, res) => {
    try {
        const { notas } = req.body;
        const clienteId = parseInt(req.params.id);
        const closerId = parseInt(req.usuario.id);

        const cliente = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(clienteId);
        if (!cliente) {
            return res.status(404).json({ msg: 'Prospecto no encontrado' });
        }

        // UNIFICADO: Acceso por rol
        const rolesPermitidos = ['admin', 'vendedor'];
        if (!rolesPermitidos.includes(String(req.usuario.rol).toLowerCase())) {
            return res.status(403).json({ msg: 'No tienes permiso' });
        }

        const now = new Date().toISOString();

        // Registrar la actividad de descarte
        await db.prepare(`
            INSERT INTO actividades(tipo, vendedor, cliente, fecha, descripcion, resultado, notas)
        VALUES(?, ?, ?, ?, ?, ?, ?)
        `).run('prospecto', closerId, clienteId, now, 'Prospecto descartado', 'fallido', notas || 'Descartado');

        // Actualizar etapa del prospecto
        const hist = cliente.historialEmbudo ? JSON.parse(cliente.historialEmbudo) : [];
        hist.push({ etapa: 'perdido', fecha: now, vendedor: closerId });

        await db.prepare('UPDATE clientes SET etapaEmbudo = ?, fechaUltimaEtapa = ?, ultimaInteraccion = ?, historialEmbudo = ? WHERE id = ?')
            .run('perdido', now, now, JSON.stringify(hist), clienteId);

        res.json({ msg: '✓ Prospecto descartado' });
    } catch (error) {
        console.error('Error al descartar prospecto:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// POST /api/closer/marcar-evento-completado
// Guarda localmente que un evento de Google Calendar fue completado
router.post('/marcar-evento-completado', [auth, esVendedor], async (req, res) => {
    try {
        const { googleEventId, clienteId, resultado, notas } = req.body;

        if (!googleEventId) {
            return res.status(400).json({ msg: 'googleEventId es requerido' });
        }

        const closerId = parseInt(req.usuario.id);
        const now = new Date().toISOString();

        // Crear tabla si no existe (Ajustado para SERIAL en Postgres)
        const createTableSql = isPostgres
            ? `CREATE TABLE IF NOT EXISTS google_events_completed(
            id SERIAL PRIMARY KEY,
            googleEventId TEXT NOT NULL UNIQUE,
            closerId INTEGER NOT NULL,
            clienteId INTEGER,
            resultado TEXT,
            notas TEXT,
            fechaCompletado TEXT DEFAULT CURRENT_TIMESTAMP
        )`
            : `CREATE TABLE IF NOT EXISTS google_events_completed(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            googleEventId TEXT NOT NULL UNIQUE,
            closerId INTEGER NOT NULL,
            clienteId INTEGER,
            resultado TEXT,
            notas TEXT,
            fechaCompletado TEXT DEFAULT CURRENT_TIMESTAMP
        )`;
        await db.exec(createTableSql);

        // Guardar o actualizar (Compatible con ambos)
        if (isPostgres) {
            await db.prepare(`
                INSERT INTO google_events_completed(googleEventId, closerId, clienteId, resultado, notas)
        VALUES(?, ?, ?, ?, ?)
                ON CONFLICT(googleEventId) DO UPDATE SET
        closerId = EXCLUDED.closerId,
            clienteId = EXCLUDED.clienteId,
            resultado = EXCLUDED.resultado,
            notas = EXCLUDED.notas
                `).run(googleEventId, closerId, clienteId || null, resultado || null, notas || null);
        } else {
            await db.prepare(`
                INSERT OR REPLACE INTO google_events_completed
            (googleEventId, closerId, clienteId, resultado, notas)
        VALUES(?, ?, ?, ?, ?)
            `).run(googleEventId, closerId, clienteId || null, resultado || null, notas || null);
        }

        console.log(`✅ Evento ${googleEventId} marcado como completado en BD`);

        res.json({ msg: 'Evento marcado como completado', googleEventId });
    } catch (error) {
        console.error('❌ Error al marcar evento completado:', error);
        res.status(500).json({ msg: 'Error al marcar evento', error: error.message });
    }
});

// GET /api/closer/google-events-completados
// Obtiene lista de eventos completados para verificar en frontend
router.get('/google-events-completados', [auth, esVendedor], async (req, res) => {
    try {
        const closerId = parseInt(req.usuario.id);

        // Tabla podría no existir aún
        try {
            const completados = await db.prepare(`
                SELECT googleEventId, resultado FROM google_events_completed WHERE closerId = ?
            `).all(closerId);
            res.json(completados);
        } catch (err) {
            // Tabla no existe aún
            res.json([]);
        }
    } catch (error) {
        console.error('Error al traer eventos completados:', error);
        res.json([]);
    }
});


router.get('/dashboard-closer', [auth, esVendedor], async (req, res) => {
    try {
        const closerId = parseInt(req.usuario.id);
        const clientes = await db.prepare(`
            SELECT c.* FROM clientes c
            WHERE c.closerAsignado = ? OR c.id IN (SELECT cliente FROM actividades WHERE vendedor = ?)
        `).all(closerId, closerId);

        const embudo = {
            total: clientes.length,
            reunion_agendada: clientes.length, // Todo cliente asignado pasa por agendada
            reunion_realizada: 0,
            propuesta_enviada: 0,
            venta_ganada: 0,
            en_negociacion: 0,
            perdido: 0
        };

        const analisisPerdidas = {
            no_asistio: 0,
            no_interesado: 0
        };

        for (const c of clientes) {
            if (c.etapaEmbudo === 'en_negociacion') embudo.en_negociacion++;
            if (c.etapaEmbudo === 'perdido') embudo.perdido++;

            const hist = c.historialEmbudo ? JSON.parse(c.historialEmbudo) : [];
            const results = hist.map(h => h.resultado).filter(Boolean);
            const rLast = results.length > 0 ? results[results.length - 1] : null;

            let realized = false;
            let propuesta = false;
            let venta = false;

            if (c.etapaEmbudo === 'venta_ganada') {
                realized = true; propuesta = true; venta = true;
            } else if (c.etapaEmbudo === 'en_negociacion') {
                realized = true; propuesta = true;
            } else if (c.etapaEmbudo === 'reunion_realizada') {
                realized = true;
            } else if (c.etapaEmbudo === 'perdido') {
                if (rLast === 'no_asistio' || results.includes('no_asistio')) {
                    analisisPerdidas.no_asistio++;
                } else {
                    realized = true;
                    analisisPerdidas.no_interesado++;
                }
            } else {
                if (rLast === 'venta') {
                    realized = true; propuesta = true; venta = true;
                } else if (rLast === 'cotizacion') {
                    realized = true; propuesta = true;
                } else if (rLast === 'no_venta' || rLast === 'otra_reunion') {
                    realized = true;
                    if (rLast === 'no_venta') analisisPerdidas.no_interesado++;
                } else if (rLast === 'no_asistio') {
                    analisisPerdidas.no_asistio++;
                }
            }

            if (realized) embudo.reunion_realizada++;
            if (propuesta) embudo.propuesta_enviada++;
            if (venta) embudo.venta_ganada++;
        }

        const hoyInicioDate = new Date();
        hoyInicioDate.setHours(0, 0, 0, 0);
        const hoyInicio = hoyInicioDate.toISOString();

        const hoyFinDate = new Date();
        hoyFinDate.setHours(23, 59, 59, 999);
        const hoyFin = hoyFinDate.toISOString();

        // FIX: Las citas agendadas deben filtrarse por closerAsignado, no por vendedor (que es el prospector)
        const reunionesHoy = await db.prepare(`
            SELECT a.* FROM actividades a
            JOIN clientes c ON a.cliente = c.id
            WHERE c.closerAsignado = ? AND a.tipo = 'cita' AND a.fecha >= ? AND a.fecha <= ?
        `).all(closerId, hoyInicio, hoyFin);

        const actividadesHoy = await db.prepare('SELECT * FROM actividades WHERE vendedor = ? AND fecha >= ? AND fecha <= ?')
            .all(closerId, hoyInicio, hoyFin);

        const reunionesRealizadasHoy = actividadesHoy.filter(a => a.tipo === 'cita' && a.resultado !== 'pendiente').length;
        const propuestasHoy = actividadesHoy.filter(a => a.descripcion && a.descripcion.toLowerCase().includes('cotización')).length;

        const inicioMesDate = new Date();
        inicioMesDate.setDate(1);
        inicioMesDate.setHours(0, 0, 0, 0);
        const inicioMes = inicioMesDate.toISOString();

        const ventasMes = await db.prepare('SELECT * FROM ventas WHERE vendedor = ? AND fecha >= ?').all(closerId, inicioMes);
        const ventasHoy = await db.prepare('SELECT * FROM ventas WHERE vendedor = ? AND fecha >= ? AND fecha <= ?').all(closerId, hoyInicio, hoyFin);
        const montoTotalMes = ventasMes.reduce((sum, v) => sum + Number(v.monto || 0), 0);

        const tasasConversion = {
            asistencia: embudo.reunion_agendada > 0 ? ((embudo.reunion_realizada / embudo.reunion_agendada) * 100).toFixed(1) : '0.0',
            interes: embudo.reunion_realizada > 0 ? ((embudo.propuesta_enviada / embudo.reunion_realizada) * 100).toFixed(1) : '0.0',
            cierre: embudo.propuesta_enviada > 0 ? ((embudo.venta_ganada / embudo.propuesta_enviada) * 100).toFixed(1) : '0.0',
            global: embudo.reunion_agendada > 0 ? ((embudo.venta_ganada / embudo.reunion_agendada) * 100).toFixed(1) : '0.0'
        };

        res.json({
            embudo,
            metricas: {
                reuniones: { hoy: reunionesHoy.length, pendientes: clientes.filter(c => c.etapaEmbudo === 'reunion_agendada').length, realizadas: embudo.reunion_realizada, realizadasHoy: reunionesRealizadasHoy, propuestasHoy: propuestasHoy },
                ventas: { mes: ventasMes.length, montoMes: montoTotalMes, totales: embudo.venta_ganada, ventasHoy: ventasHoy.length },
                negociaciones: { activas: embudo.en_negociacion }
            },
            tasasConversion,
            analisisPerdidas
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

router.get('/calendario', [auth, esVendedor], async (req, res) => {
    try {
        const closerId = parseInt(req.usuario.id);

        // Obtener todas las citas pendientes de la BD
        const rows = await db.prepare(`
            SELECT a.*, c.nombres as c_nombres, c.apellidoPaterno as c_apellido, c.empresa as c_empresa, c.telefono as c_telefono, c.correo as c_correo, c.etapaEmbudo as c_etapa,
            u.nombre as v_nombre FROM actividades a
            JOIN clientes c ON a.cliente = c.id
            JOIN usuarios u ON a.vendedor = u.id
            WHERE c.closerAsignado = ? AND a.tipo = ? AND a.resultado = 'pendiente'
            ORDER BY a.fecha ASC
        `).all(closerId, 'cita');

        // Filtrar citas que ya pasaron automáticamente
        const ahora = new Date();
        let reuniones = rows.filter(r => {
            const fechaCita = new Date(r.fecha);
            return fechaCita >= ahora;
        }).map(r => ({
            ...toMongoFormat(r),
            cliente: { nombres: r.c_nombres, apellidoPaterno: r.c_apellido, empresa: r.c_empresa, telefono: r.c_telefono, correo: r.c_correo, etapaEmbudo: r.c_etapa },
            vendedor: { nombre: r.v_nombre }
        }));

        // Marcar como fallidas las citas que ya pasaron
        const citasPasadas = rows.filter(r => new Date(r.fecha) < ahora);
        for (const cita of citasPasadas) {
            await db.prepare(`UPDATE actividades SET resultado = 'fallido', notas = COALESCE(notas || ' ', '') || '[Auto] Cita pasada sin registrar' WHERE id = ?`)
                .run(cita.id);
        }

        // Intentar sincronizar con Google Calendar si está conectado
        try {
            const usuario = await db.prepare('SELECT googleRefreshToken, googleAccessToken, googleTokenExpiry FROM usuarios WHERE id = ?').get(closerId);

            if (usuario && (usuario.googleRefreshToken || usuario.googleAccessToken)) {
                const { OAuth2Client } = require('google-auth-library');
                const { google } = require('googleapis');

                const client = new OAuth2Client(
                    process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
                    process.env.GOOGLE_CLIENT_SECRET
                );

                client.setCredentials({
                    refresh_token: usuario.googleRefreshToken,
                    access_token: usuario.googleAccessToken,
                    expiry_date: parseGoogleExpiryToMillis(usuario.googleTokenExpiry)
                });

                // Actualizar tokens si se refrescan
                client.on('tokens', async (tokens) => {
                    try {
                        let updateStr = [];
                        let params = [];
                        if (tokens.refresh_token) { updateStr.push('googleRefreshToken = ?'); params.push(tokens.refresh_token); }
                        if (tokens.access_token) { updateStr.push('googleAccessToken = ?'); params.push(tokens.access_token); }
                        if (tokens.expiry_date) {
                            updateStr.push('googleTokenExpiry = ?');
                            params.push(tokens.expiry_date);
                        }

                        if (updateStr.length > 0) {
                            params.push(closerId);
                            await db.prepare(`UPDATE usuarios SET ${updateStr.join(', ')} WHERE id = ?`).run(...params);
                        }
                    } catch (err) {
                        console.error(`❌ Error actualizando tokens para closer ${closerId}:`, err.message);
                    }
                });


                const calendar = google.calendar({ version: 'v3', auth: client });

                // Obtener eventos de Google Calendar desde ahora hasta 30 días adelante
                const timeMax = new Date();
                timeMax.setDate(timeMax.getDate() + 30);

                // Timeout de 5 segundos para no bloquear Railway
                const gcalTimeout2 = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Google Calendar timeout')), 5000)
                );
                const response = await Promise.race([calendar.events.list({
                    calendarId: 'primary',
                    timeMin: ahora.toISOString(),
                    timeMax: timeMax.toISOString(),
                    singleEvents: true,
                    orderBy: 'startTime'
                }), gcalTimeout2]);

                const eventosGoogle = response.data.items || [];

                // Verificar cada cita pendiente si todavía existe en Google Calendar
                const reunionesActualizadas = [];
                for (const reunion of reuniones) {
                    const fechaReunion = new Date(reunion.fecha);

                    // Buscar si existe un evento en Google Calendar cercano a esta fecha (+/- 5 minutos)
                    const existeEnGoogle = eventosGoogle.some(evento => {
                        if (!evento.start || !evento.start.dateTime) return false;
                        const fechaEvento = new Date(evento.start.dateTime);
                        const diferencia = Math.abs(fechaEvento - fechaReunion);
                        return diferencia < 5 * 60 * 1000; // 5 minutos de tolerancia
                    });

                    if (existeEnGoogle) {
                        // La cita todavía existe en Google Calendar
                        reunionesActualizadas.push(reunion);
                    } else {
                        // La cita fue eliminada de Google Calendar, marcarla como cancelada
                        await db.prepare(`UPDATE actividades SET resultado = 'fallido', notas = COALESCE(notas || ' ', '') || '[Sync] Eliminada de Google Calendar' WHERE id = ?`)
                            .run(reunion.id || reunion._id);
                    }
                }

                reuniones = reunionesActualizadas;
            }
        } catch (syncError) {
            // Si falla la sincronización con Google, continuar con los datos locales
            console.error('Error al sincronizar con Google Calendar:', syncError.message);
        }

        res.json(reuniones);
    } catch (error) {
        console.error('Error en calendario:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

router.get('/reuniones-pendientes', [auth, esVendedor], async (req, res) => {
    try {
        const closerId = parseInt(req.usuario.id);
        const rows = await db.prepare(`
            SELECT c.*, u.nombre as prospectorNombre FROM clientes c
            LEFT JOIN usuarios u ON c.prospectorAsignado = u.id
            WHERE c.closerAsignado = ? AND c.etapaEmbudo = ?
        `).all(closerId, 'reunion_agendada');
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

router.get('/prospectos', [auth, esVendedor], async (req, res) => {
    try {
        const closerId = parseInt(req.usuario.id);
        const rows = await db.prepare(`
            SELECT c.*, u.nombre as prospectorNombre,
            (
                SELECT MIN(a.fecha)
                FROM actividades a
                WHERE a.cliente = c.id
                  AND a.tipo = 'cita'
                  AND (a.resultado = 'pendiente' OR a.resultado IS NULL)
            ) as proximaCita
            FROM clientes c
            LEFT JOIN usuarios u ON c.prospectorAsignado = u.id
            WHERE c.closerAsignado = ? AND c.etapaEmbudo != ?
            ORDER BY c.fechaTransferencia DESC
        `).all(closerId, 'venta_ganada');
        res.json(rows.map(r => {
            const { prospectorNombre, ...c } = r;
            const out = toMongoFormat(c);
            if (out) {
                out.prospectorAsignado = { nombre: prospectorNombre };
                // Asegurar proximaLlamada unificada
                out.proximaLlamada = out.proximaLlamada || out.proximallamada || null;
                out.customSections = parseHistorialSeguro(c.customSections);
                out.historialEmbudo = parseHistorialSeguro(c.historialEmbudo);
            }
            return out;
        }));
    } catch (error) {
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// GET /api/closer/clientes-ganados
router.get('/clientes-ganados', [auth, esVendedor], async (req, res) => {
    try {
        const closerId = parseInt(req.usuario.id);
        const rows = await db.prepare(`
            SELECT c.*, u.nombre as prospectorNombre,
            (
                SELECT MIN(a.fecha)
                FROM actividades a
                WHERE a.cliente = c.id
                  AND a.tipo = 'cita'
                  AND (a.resultado = 'pendiente' OR a.resultado IS NULL)
            ) as proximaCita
            FROM clientes c
            LEFT JOIN usuarios u ON c.prospectorAsignado = u.id
            WHERE c.closerAsignado = ? AND c.etapaEmbudo = ?
            ORDER BY c.fechaUltimaEtapa DESC
        `).all(closerId, 'venta_ganada');

        const ids = rows.map(r => r.id).filter(Boolean);
        const ultimasActs = ids.length > 0
            ? await db.prepare(
                `SELECT a.cliente, a.tipo, COALESCE(NULLIF(a.notas, ''), a.descripcion) as texto
                 FROM actividades a
                 WHERE a.id IN (
                   SELECT MAX(id) FROM actividades WHERE cliente IN (${ids.map(() => '?').join(',')}) GROUP BY cliente
                 )`
            ).all(...ids)
            : [];

        const actMap = {};
        for (const a of ultimasActs) actMap[a.cliente] = { tipo: a.tipo, notas: a.texto };

        res.json(rows.map(r => {
            const { prospectorNombre, ...c } = r;
            const out = toMongoFormat(c);
            if (out) {
                out.prospectorAsignado = { nombre: prospectorNombre };
                const act = actMap[r.id];
                out.ultimaActTipo = act?.tipo || null;
                out.ultimaActNotas = act?.notas || null;
                // Asegurar proximaLlamada unificada
                out.proximaLlamada = out.proximaLlamada || out.proximallamada || null;
            }
            return out;
        }));
    } catch (error) {
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// POST /api/closer/crear-prospecto
router.post('/crear-prospecto', [auth, esVendedor], async (req, res) => {
    try {
        const { nombres, apellidoPaterno, apellidoMaterno, telefono, telefono2, correo, empresa, notas } = req.body;
        if (!nombres || !telefono) {
            return res.status(400).json({ msg: 'Nombres y teléfono son requeridos' });
        }

        const closerId = parseInt(req.usuario.id);
        const equipoId = req.usuario.equipo_id || null;
        const now = new Date().toISOString();

        // MEJORADO: Incluir vendedorAsignado y prospectorAsignado para consistencia en Postgres
        const stmt = await db.prepare(`
            INSERT INTO clientes (nombres, apellidoPaterno, apellidoMaterno, telefono, telefono2, correo, empresa, notas, vendedorAsignado, prospectorAsignado, closerAsignado, etapaEmbudo, fechaRegistro, "equipo_id")
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'prospecto_nuevo', ?, ?)
        `);
        const result = await stmt.run(
            nombres.trim(),
            (apellidoPaterno || '').trim(),
            (apellidoMaterno || '').trim(),
            String(telefono).trim(),
            String(telefono2 || '').trim(),
            String(correo || '').trim().toLowerCase(),
            (empresa || '').trim(),
            (notas || '').trim(),
            closerId,
            closerId,
            closerId,
            now,
            equipoId
        );

        const row = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(result.lastInsertRowid);
        const cliente = toMongoFormat(row);
        if (cliente) cliente.closerAsignado = { nombre: req.usuario.nombre };

        res.status(201).json({ msg: 'Prospecto creado', cliente: cliente || row });
    } catch (error) {
        console.error('Error al crear prospecto:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// POST /api/closer/registrar-actividad
router.post('/registrar-actividad', [auth, esVendedor], async (req, res) => {
    try {
        const { clienteId, tipo, resultado, descripcion, notas, fechaCita, etapaEmbudo, proximaLlamada, interes } = req.body;
        const tiposValidos = ['llamada', 'mensaje', 'correo', 'whatsapp', 'cita', 'cliente', 'descartado'];
        const resultadosValidos = ['exitoso', 'pendiente', 'fallido', 'convertido', 'descartado', 'enviado'];

        if (!clienteId || !tipo) {
            return res.status(400).json({ msg: 'Cliente y tipo de actividad son requeridos' });
        }
        if (!tiposValidos.includes(tipo)) {
            return res.status(400).json({ msg: 'Tipo de actividad no válido' });
        }

        const cid = parseInt(clienteId);
        const cliente = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(cid);
        if (!cliente) {
            return res.status(404).json({ msg: 'Cliente no encontrado' });
        }
        const closerId = parseInt(req.usuario.id);

        const rolesPermitidos = ['admin', 'vendedor'];
        if (!rolesPermitidos.includes(String(req.usuario.rol).toLowerCase())) {
            return res.status(403).json({ msg: 'No tienes permiso para registrar actividades' });
        }

        console.log(`✅ Registro de actividad por ${req.usuario.nombre} (${req.usuario.rol}) para cliente ${cid}`);

        const resultadoFinal = resultado && resultadosValidos.includes(resultado) ? resultado : 'pendiente';
        const fechaActividad = tipo === 'cita' && fechaCita ? new Date(fechaCita).toISOString() : new Date().toISOString();

        const ins = await db.prepare(`
            INSERT INTO actividades (tipo, vendedor, cliente, fecha, descripcion, resultado, notas)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(tipo, closerId, cid, fechaActividad, descripcion || `${tipo} registrada`, resultadoFinal, notas || '');

        const now = new Date().toISOString();
        const updates = ['ultimaInteraccion = ?'];
        const params = [now];

        // Actualizar proximaLlamada si se proporcionó
        if (proximaLlamada !== undefined) {
            updates.push('proximaLlamada = ?');
            params.push(proximaLlamada);
        }

        // Actualizar interés si se proporcionó
        if (interes !== undefined) {
            updates.push('interes = ?');
            params.push(parseInt(interes));
        }
        // Ejecutar actualización del cliente
        params.push(cid);
        await db.prepare(`
            UPDATE clientes 
            SET ${updates.join(', ')}
            WHERE id = ?
        `).run(...params);

        const rowFinal = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(cid);
        res.json({ msg: 'Actividad registrada y cliente actualizado', cliente: toMongoFormat(rowFinal) || rowFinal });
    } catch (error) {
        console.error('Error al registrar actividad:', error);
        res.status(500).json({ msg: 'Error al registrar actividad' });
    }
});

// ==========================================
// RUTAS DE ETIQUETAS GLOBALES (NO TERMINADO)
// ==========================================

// GET /api/vendedor/etiquetas
router.get('/etiquetas', [auth, esVendedor], async (req, res) => {
    try {
        const equipoId = req.usuario.equipo_id;
        let sql = 'SELECT * FROM etiquetas_globales';
        let params = [];

        if (equipoId) {
            sql += ' WHERE equipo_id = ? OR equipo_id IS NULL';
            params.push(equipoId);
        } else {
            sql += ' WHERE equipo_id IS NULL';
        }

        sql += ' ORDER BY nombre ASC';
        const etiquetas = await db.prepare(sql).all(...params);
        res.json(etiquetas);
    } catch (error) {
        console.error('Error al obtener etiquetas:', error);
        res.status(500).json({ msg: 'Error al obtener etiquetas' });
    }
});

// POST /api/vendedor/etiquetas
router.post('/etiquetas', [auth, esVendedor], async (req, res) => {
    try {
        const { nombre, color } = req.body;
        if (!nombre) return res.status(400).json({ msg: 'El nombre es requerido' });

        const equipoId = req.usuario.equipo_id;
        const nombreLimpio = nombre.trim();

        // Verificar si ya existe
        let existente;
        if (equipoId) {
            existente = await db.prepare('SELECT * FROM etiquetas_globales WHERE nombre = ? AND (equipo_id = ? OR equipo_id IS NULL)')
                .get(nombreLimpio, equipoId);
        } else {
            existente = await db.prepare('SELECT * FROM etiquetas_globales WHERE nombre = ? AND equipo_id IS NULL')
                .get(nombreLimpio);
        }

        if (existente) {
            return res.json(existente);
        }

        // Crear nueva
        const result = await db.prepare('INSERT INTO etiquetas_globales (nombre, color, equipo_id) VALUES (?, ?, ?)')
            .run(nombreLimpio, color || '#10b981', equipoId);

        res.json({ id: result.lastInsertRowid, nombre: nombreLimpio, color: color || '#10b981' });
    } catch (error) {
        console.error('Error al crear etiqueta:', error);
        res.status(500).json({ msg: 'Error al crear etiqueta' });
    }
});

// DELETE /api/vendedor/etiquetas/:id
router.delete('/etiquetas/:id', [auth, esVendedor], async (req, res) => {
    try {
        const equipoId = req.usuario.equipo_id;
        const etiquetaId = parseInt(req.params.id);

        let existente;
        if (equipoId) {
            existente = await db.prepare('SELECT * FROM etiquetas_globales WHERE id = ? AND (equipo_id = ? OR equipo_id IS NULL)')
                .get(etiquetaId, equipoId);
        } else {
            existente = await db.prepare('SELECT * FROM etiquetas_globales WHERE id = ? AND equipo_id IS NULL')
                .get(etiquetaId);
        }

        if (!existente) {
            return res.status(404).json({ msg: 'Etiqueta no encontrada' });
        }

        // Si es global (equipo_id nulo) pero el usuario es vendedor y pertenece a un equipo, podría denegarse, pero lo dejaremos así
        await db.prepare('DELETE FROM etiquetas_globales WHERE id = ?').run(etiquetaId);

        res.json({ msg: 'Etiqueta eliminada' });
    } catch (error) {
        console.error('Error al eliminar etiqueta:', error);
        res.status(500).json({ msg: 'Error al eliminar etiqueta' });
    }
});

module.exports = router;
