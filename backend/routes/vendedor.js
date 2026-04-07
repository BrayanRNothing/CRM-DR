const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { auth } = require('../middleware/auth');
const { toMongoFormat, toMongoFormatMany, parseGoogleExpiryToMillis } = require('../lib/helpers');

const esVendedor = (req, res, next) => {
    const rol = String(req.usuario.rol).toLowerCase();
    // Aceptamos vendedor (o los dueños 'admin' si existen), pero simplificamos a vendedor.
    if (rol !== 'vendedor' && rol !== 'prospector' && rol !== 'closer') { // Temp backwards comp.
        return res.status(403).json({ msg: 'Acceso denegado. Solo vendedores.' });
    }
    next();
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
         AND etapaEmbudo NOT IN ('perdido', 'venta_ganada') ${where}`
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
        // UNIFICADO: Ver todos los clientes donde el usuario está asignado o ha tenido actividad
        const clientes = await db.prepare(`
            SELECT DISTINCT c.* FROM clientes c
            LEFT JOIN actividades a ON c.id = a.cliente
            WHERE c.prospectorAsignado = ? OR a.vendedor = ? OR c.prospectorAsignado IS NULL
        `).all(prospectorId, prospectorId);

        // Filtrar solo prospectos activos (excluir perdidos y ventas ganadas)
        const clientesActivos = clientes.filter(c =>
            c.etapaEmbudo !== 'perdido' && c.etapaEmbudo !== 'venta_ganada'
        );

        // Embudo siempre sobre totales (Acumulativo)
        const embudo = {
            total: clientesActivos.length,
            prospecto_nuevo: 0,
            en_contacto: 0,
            reunion_agendada: 0,
            transferidos: 0
        };

        for (const c of clientesActivos) {
            embudo.prospecto_nuevo++; // Todos empiezan como prospecto

            let contactado = false;
            let agendado = false;
            let transferido = !!c.closerAsignado;

            // Etapas que implican contacto
            const etapasContacto = ['en_contacto', 'reunion_agendada', 'venta_ganada', 'en_negociacion', 'reunion_realizada', 'perdido'];
            // Etapas que implican reunión agendada
            const etapasAgendado = ['reunion_agendada', 'venta_ganada', 'en_negociacion', 'reunion_realizada'];

            if (c.etapaEmbudo !== 'prospecto_nuevo' && c.etapaEmbudo) contactado = true;
            if (etapasAgendado.includes(c.etapaEmbudo) || transferido) {
                contactado = true;
                agendado = true;
            }

            // Historial por si fue regresado a alguna etapa
            const hist = parseHistorialSeguro(c.historialEmbudo);
            const etapasHist = hist.map(h => h.etapa);
            if (etapasHist.some(e => etapasContacto.includes(e))) contactado = true;
            if (etapasHist.some(e => etapasAgendado.includes(e))) {
                contactado = true;
                agendado = true;
            }

            if (contactado) embudo.en_contacto++;
            if (agendado) embudo.reunion_agendada++;
            if (transferido) embudo.transferidos++;
        }

        const tasasConversion = {
            contacto: embudo.total > 0
                ? (embudo.en_contacto / embudo.total * 100).toFixed(1)
                : 0,
            agendamiento: embudo.en_contacto > 0
                ? (embudo.reunion_agendada / embudo.en_contacto * 100).toFixed(1)
                : 0
        };

        // Filtros por período calculados en JS para compatibilidad total (SQLite/Postgres)
        const nowLocal = new Date();
        const startOfDay = new Date(nowLocal.getFullYear(), nowLocal.getMonth(), nowLocal.getDate()).toISOString().slice(0, 10);
        const endOfDay = startOfDay + 'T23:59:59.999Z';
        const startOfDayISO = startOfDay + 'T00:00:00.000Z';

        const sixDaysAgo = new Date(nowLocal);
        sixDaysAgo.setDate(nowLocal.getDate() - 6);
        const startOfWeek = new Date(sixDaysAgo.getFullYear(), sixDaysAgo.getMonth(), sixDaysAgo.getDate()).toISOString().slice(0, 10) + 'T00:00:00.000Z';

        const startOfMonth = new Date(nowLocal.getFullYear(), nowLocal.getMonth(), 1).toISOString().slice(0, 10) + 'T00:00:00.000Z';

        // Actividades: campo 'fecha'
        const FILTROS_ACT = {
            dia: `fecha >= '${startOfDayISO}' AND fecha <= '${endOfDay}'`,
            semana: `fecha >= '${startOfWeek}'`,
            mes: `fecha >= '${startOfMonth}'`,
            total: null
        };
        // Prospectos nuevos: campo 'fechaRegistro'
        const FILTROS_CLI = {
            dia: `(fechaRegistro >= '${startOfDayISO}' AND fechaRegistro <= '${endOfDay}' OR (fechaRegistro IS NULL AND fechaUltimaEtapa >= '${startOfDayISO}' AND fechaUltimaEtapa <= '${endOfDay}'))`,
            semana: `(fechaRegistro >= '${startOfWeek}' OR (fechaRegistro IS NULL AND fechaUltimaEtapa >= '${startOfWeek}'))`,
            mes: `(fechaRegistro >= '${startOfMonth}' OR (fechaRegistro IS NULL AND fechaUltimaEtapa >= '${startOfMonth}'))`,
            total: null
        };
        // Reuniones agendadas: campo 'fecha' (en tabla actividades)
        const FILTROS_REUNION = {
            dia: `fecha >= '${startOfDayISO}' AND fecha <= '${endOfDay}'`,
            semana: `fecha >= '${startOfWeek}'`,
            mes: `fecha >= '${startOfMonth}'`,
            total: null
        };

        const periodos = {};
        for (const key of ['dia', 'semana', 'mes', 'total']) {
            const { llamadas, mensajes } = await calcularPeriodoActividades(db, prospectorId, FILTROS_ACT[key]);
            const prospectos = await calcularPeriodoClientes(db, prospectorId, FILTROS_CLI[key]);
            const reuniones = await calcularPeriodoReuniones(db, prospectorId, FILTROS_REUNION[key]);
            periodos[key] = { llamadas, mensajes, prospectos, reuniones };
        }

        // Compatibilidad backward con metricas (por si hay otros consumidores)
        const metricas = {
            llamadas: { hoy: periodos.dia.llamadas, totales: periodos.total.llamadas },
            contactosExitosos: { hoy: 0, totales: 0 },
            reunionesAgendadas: { hoy: periodos.dia.reuniones, totales: periodos.total.reuniones, semana: periodos.semana.reuniones },
            prospectosHoy: periodos.dia.prospectos,
            correosEnviados: periodos.dia.mensajes
        };

        res.json({ embudo, metricas, tasasConversion, periodos });
    } catch (error) {
        console.error('Error en dashboard prospector:', error);
        // Fallback para no romper la UI del dashboard si hay datos históricos corruptos.
        return res.json({
            embudo: { total: 0, prospecto_nuevo: 0, en_contacto: 0, reunion_agendada: 0, transferidos: 0 },
            metricas: {
                llamadas: { hoy: 0, totales: 0 },
                contactosExitosos: { hoy: 0, totales: 0 },
                reunionesAgendadas: { hoy: 0, totales: 0, semana: 0 },
                prospectosHoy: 0,
                correosEnviados: 0
            },
            tasasConversion: { contacto: 0, agendamiento: 0 },
            periodos: {
                dia: { llamadas: 0, mensajes: 0, prospectos: 0, reuniones: 0 },
                semana: { llamadas: 0, mensajes: 0, prospectos: 0, reuniones: 0 },
                mes: { llamadas: 0, mensajes: 0, prospectos: 0, reuniones: 0 },
                total: { llamadas: 0, mensajes: 0, prospectos: 0, reuniones: 0 }
            },
            degraded: true
        });
    }
});


// GET /api/vendedor/dashboard-closer
router.get('/dashboard-closer', [auth, esVendedor], async (req, res) => {
    try {
        const closerId = parseInt(req.usuario.id);
        const equipoId = req.usuario.equipo_id;

        // Si hay equipo, ver clientes del equipo, si no, solo los propios
        let sql = 'SELECT * FROM clientes WHERE ';
        let params = [];
        if (equipoId) {
            sql += 'equipo_id = ?';
            params.push(equipoId);
        } else {
            sql += 'closerAsignado = ?';
            params.push(closerId);
        }

        const clientes = await db.prepare(sql).all(...params);

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

        const hoyInicio = new Date();
        hoyInicio.setHours(0, 0, 0, 0);
        const hoyFin = new Date();
        hoyFin.setHours(23, 59, 59, 999);

        // Reuniones hoy (pertenecientes al usuario o equipo)
        let sqlReuniones = `
            SELECT a.* FROM actividades a
            JOIN clientes c ON a.cliente = c.id
            WHERE a.tipo = 'cita' AND a.fecha >= ? AND a.fecha <= ?
        `;
        let paramsReuniones = [hoyInicio.toISOString(), hoyFin.toISOString()];

        if (equipoId) {
            sqlReuniones += ' AND c.equipo_id = ?';
            paramsReuniones.push(equipoId);
        } else {
            sqlReuniones += ' AND c.closerAsignado = ?';
            paramsReuniones.push(closerId);
        }

        const reunionesHoy = await db.prepare(sqlReuniones).all(...paramsReuniones);

        const actividadesHoy = await db.prepare('SELECT * FROM actividades WHERE vendedor = ? AND fecha >= ? AND fecha <= ?')
            .all(closerId, hoyInicio.toISOString(), hoyFin.toISOString());

        const reunionesRealizadasHoy = actividadesHoy.filter(a => a.tipo === 'cita' && a.resultado !== 'pendiente').length;
        const propuestasHoy = actividadesHoy.filter(a => a.descripcion && a.descripcion.toLowerCase().includes('cotización')).length;

        const inicioMes = new Date();
        inicioMes.setDate(1);
        inicioMes.setHours(0, 0, 0, 0);

        const ventasMes = await db.prepare('SELECT * FROM ventas WHERE vendedor = ? AND fecha >= ?').all(closerId, inicioMes.toISOString());
        const ventasHoy = await db.prepare('SELECT * FROM ventas WHERE vendedor = ? AND fecha >= ? AND fecha <= ?').all(closerId, hoyInicio.toISOString(), hoyFin.toISOString());
        const montoTotalMes = ventasMes.reduce((sum, v) => sum + (v.monto || 0), 0);

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

        // Sincronización Google Calendar
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

                const response = await calendar.events.list({
                    calendarId: 'primary',
                    timeMin: ahora.toISOString(),
                    timeMax: timeMax.toISOString(),
                    singleEvents: true,
                    orderBy: 'startTime'
                });

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
            console.error('Error al sincronizar con Google Calendar:', syncError.message);
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
        const prospectorId = parseInt(req.usuario.id);
        const equipoId = req.usuario.equipo_id;
        const { etapa, busqueda } = req.query;

        let sql = `SELECT c.*, u.nombre as closerNombre,
            (
                SELECT MIN(t.fechaLimite)
                FROM tareas t
                WHERE t.cliente = c.id
                  AND t.titulo = 'Recordatorio de llamada'
                  AND t.estado = 'pendiente'
            ) as proximoRecordatorio,
            (
                SELECT MIN(a.fecha)
                FROM actividades a
                WHERE a.cliente = c.id
                  AND a.tipo = 'cita'
                  AND (a.resultado = 'pendiente' OR a.resultado IS NULL)
            ) as proximaCita
            FROM clientes c LEFT JOIN usuarios u ON c.closerAsignado = u.id WHERE`;

        const params = [];

        if (equipoId) {
            // Con equipo: ver todos los prospectos del equipo (colaborativo)
            sql += ` c."equipo_id" = ? AND c.etapaEmbudo NOT IN (?, ?)`;
            params.push(equipoId, 'venta_ganada', 'perdido');
        } else {
            // Fallback: solo los propios
            sql += ` c.prospectorAsignado = ? AND c.etapaEmbudo NOT IN (?, ?)`;
            params.push(prospectorId, 'venta_ganada', 'perdido');
        }

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
                 INNER JOIN (
                   SELECT cliente, MAX(createdAt) as maxCreatedAt FROM actividades WHERE cliente IN (${ids.map(() => '?').join(',')}) GROUP BY cliente
                 ) ult ON a.cliente = ult.cliente AND a.createdAt = ult.maxCreatedAt`
            ).all(...ids)
            : [];

        const actMap = {};
        for (const a of ultimasActs) actMap[a.cliente] = { tipo: a.tipo, notas: a.texto };

        const prospectos = rows.map(r => {
            const { closerNombre, ...c } = r;
            if (!c.etapaEmbudo) c.etapaEmbudo = 'prospecto_nuevo';
            const out = toMongoFormat(c);
            if (out && closerNombre) out.closerAsignado = { nombre: closerNombre };
            const act = actMap[r.id];
            if (out) {
                // Unificar fuente de seguimiento para la UI: proximaLlamada propia o recordatorio pendiente.
                out.proximaLlamada = out.proximaLlamada || out.proximallamada || out.proximoRecordatorio || out.proximorecordatorio || null;
                out.ultimaActTipo = act?.tipo || null;
                out.ultimaActNotas = act?.notas || null;
            }
            return out || c;
        });

        res.json(prospectos);
    } catch (error) {
        console.error('Error al obtener prospectos:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// GET /api/vendedor/clientes-ganados
router.get('/clientes-ganados', [auth, esVendedor], async (req, res) => {
    try {
        const prospectorId = parseInt(req.usuario.id);
        const equipoId = req.usuario.equipo_id;
        const { busqueda } = req.query;

        let sql = `SELECT c.*, u.nombre as closerNombre,
            (
                SELECT MIN(a.fecha)
                FROM actividades a
                WHERE a.cliente = c.id
                  AND a.tipo = 'cita'
                  AND (a.resultado = 'pendiente' OR a.resultado IS NULL)
            ) as proximaCita
            FROM clientes c LEFT JOIN usuarios u ON c.closerAsignado = u.id WHERE`;

        const params = [];

        if (equipoId) {
            sql += ` c."equipo_id" = ? AND c.etapaEmbudo = ?`;
            params.push(equipoId, 'venta_ganada');
        } else {
            sql += ` c.prospectorAsignado = ? AND c.etapaEmbudo = ?`;
            params.push(prospectorId, 'venta_ganada');
        }

        if (busqueda) {
            sql += ' AND (c.nombres LIKE ? OR c.apellidoPaterno LIKE ? OR c.empresa LIKE ? OR c.telefono LIKE ?)';
            const like = '%' + busqueda + '%';
            params.push(like, like, like, like);
        }
        sql += ' ORDER BY c.fechaUltimaEtapa DESC';

        const rows = await db.prepare(sql).all(...params);
        const clientes = rows.map(r => {
            const { closerNombre, ...c } = r;
            const out = toMongoFormat(c);
            if (out && closerNombre) out.closerAsignado = { nombre: closerNombre };
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
        const { nombres, apellidoPaterno, apellidoMaterno, telefono, telefono2, correo, empresa, notas, sitioWeb, ubicacion } = req.body;

        const prospectorId = parseInt(req.usuario.id);
        const rol = String(req.usuario.rol).toLowerCase();
        const closerId = rol === 'closer' ? prospectorId : null;
        const equipoId = req.usuario.equipo_id || null;
        const now = new Date().toISOString();

        const stmt = await db.prepare(`
            INSERT INTO clientes (nombres, apellidoPaterno, apellidoMaterno, telefono, telefono2, correo, empresa, notas, sitioWeb, ubicacion, customMetricLabel, customMetricValue, vendedorAsignado, prospectorAsignado, closerAsignado, etapaEmbudo, fechaRegistro, fechaUltimaEtapa, "equipo_id")
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'prospecto_nuevo', ?, ?, ?)
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
            (req.body.customMetricLabel || '').trim(),
            (req.body.customMetricValue || '').trim(),
            prospectorId,
            prospectorId,
            closerId,
            now,
            now,
            equipoId
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

        res.status(201).json({ msg: 'Prospecto creado', cliente: cliente || row });
    } catch (error) {
        console.error('Error al crear prospecto:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// POST /api/vendedor/registrar-actividad
router.post('/registrar-actividad', [auth, esVendedor], async (req, res) => {
    try {
        const { clienteId, tipo, resultado, descripcion, notas, fechaCita, etapaEmbudo, proximaLlamada, interes, customMetricLabel, customMetricValue } = req.body;
        const tiposValidos = ['llamada', 'mensaje', 'correo', 'whatsapp', 'cita', 'prospecto'];
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

        // UNIFICADO: Cualquier prospector o closer puede registrar actividades (acceso compartido)
        const rolesPermitidos = ['prospector', 'closer', 'vendedor'];
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
        let nuevaEtapa = (tipo === 'llamada' && resultadoFinal === 'exitoso' && cliente.etapaEmbudo === 'prospecto_nuevo')
            ? 'en_contacto'
            : etapaEmbudo;

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

            // Sincronizar estado
            if (nuevaEtapa === 'perdido') {
                updates.push('estado = ?');
                params.push('perdido');
            }
        }

        params.push(cid);
        await db.prepare(`UPDATE clientes SET ${updates.join(', ')} WHERE id = ?`).run(...params);

        const actRow = await db.prepare('SELECT * FROM actividades WHERE id = ?').get(ins.lastInsertRowid);
        const actividad = toMongoFormat(actRow);
        if (actividad) actividad.cliente = { nombres: cliente.nombres, apellidoPaterno: cliente.apellidoPaterno, empresa: cliente.empresa };

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

        // UNIFICADO: Cualquier prospector o closer puede ver el historial (acceso compartido)
        const rolesPermitidos = ['prospector', 'closer', 'vendedor'];
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
        const vendedorId = parseInt(req.usuario.id);
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
        const vendedorId = parseInt(req.usuario.id);
        const { fechaLimite, descripcion } = req.body;

        if (!fechaLimite) return res.status(400).json({ msg: 'La fecha es requerida' });

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
        const { interes, proximaLlamada, customMetricLabel, customMetricValue } = req.body;

        const updates = [];
        const params = [];

        if (interes !== undefined) { updates.push('interes = ?'); params.push(interes); }
        if (proximaLlamada !== undefined) { updates.push('proximaLlamada = ?'); params.push(proximaLlamada); }
        if (customMetricLabel !== undefined) { updates.push('customMetricLabel = ?'); params.push(customMetricLabel); }
        if (customMetricValue !== undefined) { updates.push('customMetricValue = ?'); params.push(customMetricValue); }

        if (updates.length > 0) {
            params.push(prospectoId);
            await db.prepare(`UPDATE clientes SET ${updates.join(', ')} WHERE id = ?`).run(...params);
        }

        res.json({ msg: 'Prospecto actualizado' });
    } catch (error) {
        console.error('Error al actualizar prospecto:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// PUT /api/vendedor/prospectos/:id/editar
router.put('/prospectos/:id/editar', [auth, esVendedor], async (req, res) => {
    try {
        const prospectoId = parseInt(req.params.id);
        const { nombres, apellidoPaterno, apellidoMaterno, telefono, telefono2, correo, empresa, ubicacion, notas, etapaEmbudo, sitioWeb, customMetricLabel, customMetricValue } = req.body;
        const prospectorId = parseInt(req.usuario.id);
        const now = new Date().toISOString();

        const cliente = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(prospectoId);
        if (!cliente) {
            return res.status(404).json({ msg: 'Prospecto no encontrado' });
        }

        const updates = [
            'nombres = ?', 'apellidoPaterno = ?', 'apellidoMaterno = ?',
            'telefono = ?', 'telefono2 = ?', 'correo = ?', 'empresa = ?', 'notas = ?', 'sitioWeb = ?', 'ubicacion = ?',
            'interes = ?', 'proximaLlamada = ?', 'customMetricLabel = ?', 'customMetricValue = ?'
            // ultimaInteraccion NO se actualiza al editar datos — solo al registrar actividades reales
        ];
        const params = [
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
            req.body.interes !== undefined ? req.body.interes : cliente.interes,
            req.body.proximaLlamada || null,
            customMetricLabel !== undefined ? customMetricLabel : cliente.customMetricLabel,
            customMetricValue !== undefined ? customMetricValue : cliente.customMetricValue
        ];

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
        }

        params.push(prospectoId);

        await db.prepare(`
            UPDATE clientes 
            SET ${updates.join(', ')}
            WHERE id = ?
        `).run(...params);

        res.json({ msg: 'Prospecto actualizado exitosamente' });
    } catch (error) {
        console.error('Error al editar prospecto:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// POST /api/vendedor/agendar-reunion
router.post('/agendar-reunion', [auth, esVendedor], async (req, res) => {
    try {
        const { clienteId, closerId, fechaReunion, notas } = req.body;
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

        // UNIFICADO: Acceso por rol
        const rolesPermitidos = ['prospector', 'closer', 'vendedor'];
        if (!rolesPermitidos.includes(String(req.usuario.rol).toLowerCase())) {
            return res.status(403).json({ msg: 'No tienes permiso para agendar reunión' });
        }

        const now = new Date().toISOString();
        const hist = cliente.historialEmbudo ? JSON.parse(cliente.historialEmbudo) : [];
        hist.push({ etapa: 'reunion_agendada', fecha: now, vendedor: prospectorId });

        await db.prepare(`
            UPDATE clientes SET etapaEmbudo = ?, closerAsignado = ?, fechaTransferencia = ?, fechaUltimaEtapa = ?, ultimaInteraccion = ?, historialEmbudo = ?
            WHERE id = ?
        `).run('reunion_agendada', closerIdNum, now, now, now, JSON.stringify(hist), cid);

        const fechaReunionISO = new Date(fechaReunion).toISOString();
        const finReunionISO = new Date(new Date(fechaReunion).getTime() + 45 * 60000).toISOString();

        // ** GOOGLE CALENDAR INTEGRATION **
        let hangoutLink = null;
        try {
            const closerDetails = await db.prepare('SELECT email, googleRefreshToken, googleAccessToken, googleTokenExpiry FROM usuarios WHERE id = ?').get(closerIdNum);

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


        const fechaDisplayMX = new Date(fechaReunion).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'short', timeStyle: 'short' });
        await db.prepare(`
            INSERT INTO actividades (tipo, vendedor, cliente, fecha, descripcion, resultado, notas, cambioEtapa, etapaAnterior, etapaNueva, "googleMeetLink")
            VALUES (?, ?, ?, ?, ?, 'pendiente', ?, 1, 'en_contacto', 'reunion_agendada', ?)
        `).run('cita', prospectorId, cid, fechaReunionISO, `Reunión agendada para el ${fechaDisplayMX} por prospector ${req.usuario.nombre} → Asignada a closer`, notas || '', hangoutLink || '');

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
        const { notas } = req.body;
        const clienteId = parseInt(req.params.id);
        const prospectorId = parseInt(req.usuario.id);

        const cliente = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(clienteId);
        if (!cliente) {
            return res.status(404).json({ msg: 'Prospecto no encontrado' });
        }

        // UNIFICADO: Acceso por rol
        const rolesPermitidos = ['prospector', 'closer', 'vendedor'];
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

        await db.prepare('UPDATE clientes SET etapaEmbudo = ?, estado = ?, fechaUltimaEtapa = ?, ultimaInteraccion = ?, historialEmbudo = ?, proximaLlamada = NULL, closerAsignado = ? WHERE id = ?')
            .run('venta_ganada', 'ganado', now, now, JSON.stringify(hist), closerParaAsignar, clienteId);

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

        // UNIFICADO: Acceso por rol
        const rolesPermitidos = ['prospector', 'closer', 'vendedor'];
        if (!rolesPermitidos.includes(String(req.usuario.rol).toLowerCase())) {
            return res.status(403).json({ msg: 'No tienes permiso para modificar este prospecto' });
        }

        const now = new Date().toISOString();

        // Registrar la actividad de descarte
        await db.prepare(`
            INSERT INTO actividades (tipo, vendedor, cliente, fecha, descripcion, resultado, notas)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run('prospecto', prospectorId, clienteId, now, 'Prospecto descartado', 'fallido', notas || 'Descartado');

        // Actualizar etapa del prospecto
        const hist = cliente.historialEmbudo ? JSON.parse(cliente.historialEmbudo) : [];
        hist.push({ etapa: 'perdido', fecha: now, vendedor: prospectorId });

        await db.prepare('UPDATE clientes SET etapaEmbudo = ?, fechaUltimaEtapa = ?, ultimaInteraccion = ?, historialEmbudo = ?, proximaLlamada = NULL WHERE id = ?')
            .run('perdido', now, now, JSON.stringify(hist), clienteId);

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
                const sql = 'INSERT INTO clientes (nombres, apellidoPaterno, apellidoMaterno, telefono, correo, empresa, notas, etapaEmbudo, vendedorAsignado, prospectorAsignado, fechaRegistro, fechaUltimaEtapa) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                await db.prepare(sql).run(nombres, apellidoPaterno, apellidoMaterno, telefono, correo, empresa, notas, 'prospecto_nuevo', prospectorId, prospectorId, ahora, ahora);
                insertados++;
            } catch (err) {
                console.error('Error en fila CSV:', err.message);
                errores++;
            }
        }
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

        // Solo el prospector asignado puede eliminar
        if (parseInt(cliente.prospectorAsignado) !== prospectorId) {
            return res.status(403).json({ msg: 'No tienes permiso para eliminar este prospecto' });
        }

        // Eliminar registros relacionados primero (integridad referencial)
        await db.prepare('DELETE FROM tareas WHERE cliente = ?').run(prospectoId);
        await db.prepare('DELETE FROM ventas WHERE cliente = ?').run(prospectoId);
        await db.prepare('DELETE FROM actividades WHERE cliente = ?').run(prospectoId);
        // Eliminar el prospecto
        await db.prepare('DELETE FROM clientes WHERE id = ?').run(prospectoId);

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

                const response = await calendar.events.list({
                    calendarId: 'primary',
                    timeMin: ahora.toISOString(),
                    timeMax: timeMax.toISOString(),
                    singleEvents: true,
                    orderBy: 'startTime'
                });

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
                 INNER JOIN (
                   SELECT cliente, MAX(createdAt) as maxCreatedAt FROM actividades WHERE cliente IN (${ids.map(() => '?').join(',')}) GROUP BY cliente
                 ) ult ON a.cliente = ult.cliente AND a.createdAt = ult.maxCreatedAt`
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

        const rolesPermitidos = ['prospector', 'closer', 'vendedor'];
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
        const ORDEN_ETAPAS = ['prospecto_nuevo', 'en_contacto', 'reunion_agendada', 'reunion_realizada', 'en_negociacion', 'venta_ganada'];
        const rankActual = ORDEN_ETAPAS.indexOf(etapaActual);
        let nuevaEtapaAuto = null;

        if (tipo === 'llamada' && resultadoFinal === 'exitoso') {
            if (etapaActual === 'prospecto_nuevo') nuevaEtapaAuto = 'en_contacto';
        } else if ((tipo === 'whatsapp' || tipo === 'correo' || tipo === 'mensaje') && resultadoFinal === 'exitoso') {
            if (etapaActual === 'prospecto_nuevo') nuevaEtapaAuto = 'en_contacto';
        } else if (tipo === 'cita' && resultadoFinal === 'exitoso') {
            const rankCita = ORDEN_ETAPAS.indexOf('reunion_agendada');
            if (rankActual < rankCita) nuevaEtapaAuto = 'reunion_agendada';
        } else if (tipo === 'cita' && resultadoFinal === 'convertido') {
            const rankReal = ORDEN_ETAPAS.indexOf('reunion_realizada');
            if (rankActual < rankReal) nuevaEtapaAuto = 'reunion_realizada';
        } else if (tipo === 'descartado') {
            nuevaEtapaAuto = 'perdido';
        }

        let nuevaEtapa = etapaEmbudo || nuevaEtapaAuto;
        if (nuevaEtapa && nuevaEtapa !== 'perdido') {
            const rankNueva = ORDEN_ETAPAS.indexOf(nuevaEtapa);
            if (rankNueva !== -1 && rankNueva <= rankActual) nuevaEtapa = null;
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
        const { interes, proximaLlamada } = req.body;

        const updates = [];
        const params = [];

        if (interes !== undefined) { updates.push('interes = ?'); params.push(interes); }
        if (proximaLlamada !== undefined) { updates.push('proximaLlamada = ?'); params.push(proximaLlamada); }

        if (updates.length > 0) {
            params.push(prospectoId);
            await db.prepare(`UPDATE clientes SET ${updates.join(', ')} WHERE id = ?`).run(...params);
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
        const rolesPermitidos = ['prospector', 'closer', 'vendedor'];
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
        const rolesPermitidos = ['prospector', 'closer', 'vendedor'];
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
        const rolesPermitidos = ['prospector', 'closer', 'vendedor'];
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

        const etapaNueva = etapaMap[resultado];
        const descripcion = descMap[resultado];
        const now = new Date().toISOString();

        const hist = c.historialEmbudo ? JSON.parse(c.historialEmbudo) : [];
        hist.push({ etapa: etapaNueva, fecha: now, vendedor: closerId, resultado, descripcion });

        const estado = etapaNueva === 'venta_ganada' ? 'ganado'
            : etapaNueva === 'perdido' ? 'perdido'
                : 'proceso';

        // Limpiar proximaLlamada al registrar resultado de reunión (ya no aplica follow-up anterior)
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
        const { nombres, apellidoPaterno, apellidoMaterno, telefono, telefono2, correo, empresa, notas, etapaEmbudo, interes, proximaLlamada } = req.body;
        const now = new Date().toISOString();

        const c = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(prospectoId);
        if (!c) return res.status(404).json({ msg: 'Prospecto no encontrado' });

        const updates = [
            'nombres = ?', 'apellidoPaterno = ?', 'apellidoMaterno = ?',
            'telefono = ?', 'telefono2 = ?', 'correo = ?', 'empresa = ?', 'notas = ?',
            'ultimaInteraccion = ?'
        ];
        const params = [
            nombres.trim(),
            (apellidoPaterno || '').trim(),
            (apellidoMaterno || '').trim(),
            String(telefono).trim(),
            String(telefono2 || '').trim(),
            String(correo || '').trim().toLowerCase(),
            (empresa || '').trim(),
            (notas || '').trim(),
            now
        ];

        if (interes !== undefined) { updates.push('interes = ?'); params.push(interes); }
        if (proximaLlamada !== undefined) { updates.push('proximaLlamada = ?'); params.push(proximaLlamada); }

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

        res.json({ msg: 'Prospecto eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar prospecto:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// POST /api/closer/pasar-a-cliente/:id
router.post('/pasar-a-cliente/:id', [auth, esVendedor], async (req, res) => {
    try {
        const { notas } = req.body;
        const clienteId = parseInt(req.params.id);
        const closerId = parseInt(req.usuario.id);

        const cliente = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(clienteId);
        if (!cliente) {
            return res.status(404).json({ msg: 'Prospecto no encontrado' });
        }

        // UNIFICADO: Acceso por rol
        const rolesPermitidos = ['prospector', 'closer', 'vendedor'];
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

        await db.prepare('UPDATE clientes SET etapaEmbudo = ?, estado = ?, fechaUltimaEtapa = ?, ultimaInteraccion = ?, historialEmbudo = ?, closerAsignado = ? WHERE id = ?')
            .run('venta_ganada', 'ganado', now, now, JSON.stringify(hist), closerParaAsignar, clienteId);

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
        const rolesPermitidos = ['prospector', 'closer', 'vendedor'];
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
        const clientes = await db.prepare('SELECT * FROM clientes WHERE closerAsignado = ?').all(closerId);

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
        const montoTotalMes = ventasMes.reduce((sum, v) => sum + (v.monto || 0), 0);

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

                const response = await calendar.events.list({
                    calendarId: 'primary',
                    timeMin: ahora.toISOString(),
                    timeMax: timeMax.toISOString(),
                    singleEvents: true,
                    orderBy: 'startTime'
                });

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
                 INNER JOIN (
                   SELECT cliente, MAX(createdAt) as maxCreatedAt FROM actividades WHERE cliente IN (${ids.map(() => '?').join(',')}) GROUP BY cliente
                 ) ult ON a.cliente = ult.cliente AND a.createdAt = ult.maxCreatedAt`
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

        const rolesPermitidos = ['prospector', 'closer', 'vendedor'];
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

module.exports = router;
