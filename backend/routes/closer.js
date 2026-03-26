const express = require('express');
const router = express.Router();
const { db, isPostgres } = require('../config/database');
const { auth } = require('../middleware/auth');
const { toMongoFormat, toMongoFormatMany } = require('../lib/helpers');

const parseGoogleExpiryToMillis = (value) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.getTime();

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (/^\d+$/.test(trimmed)) {
            const numeric = Number(trimmed);
            if (Number.isFinite(numeric)) return numeric;
        }
        const parsed = Date.parse(trimmed);
        if (!Number.isNaN(parsed)) return parsed;
    }

    return undefined;
};

const parseGoogleExpiryToIso = (value) => {
    const millis = parseGoogleExpiryToMillis(value);
    if (!millis) return undefined;
    return new Date(millis).toISOString();
};

const esCloser = (req, res, next) => {
    const rol = String(req.usuario.rol).toLowerCase();
    if (rol !== 'closer' && rol !== 'vendedor') {
        return res.status(403).json({ msg: 'Acceso denegado. Solo closers o vendedores.' });
    }
    next();
};

router.get('/dashboard', [auth, esCloser], async (req, res) => {
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

router.get('/calendario', [auth, esCloser], async (req, res) => {
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
                    let updateStr = [];
                    let params = [];
                    if (tokens.refresh_token) { updateStr.push('googleRefreshToken = ?'); params.push(tokens.refresh_token); }
                    if (tokens.access_token) { updateStr.push('googleAccessToken = ?'); params.push(tokens.access_token); }
                    const expiryIso = parseGoogleExpiryToIso(tokens.expiry_date);
                    if (expiryIso) {
                        updateStr.push('googleTokenExpiry = ?');
                        params.push(expiryIso);
                    }

                    if (updateStr.length > 0) {
                        params.push(closerId);
                        await db.prepare(`UPDATE usuarios SET ${updateStr.join(', ')} WHERE id = ?`).run(...params);
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

router.get('/reuniones-pendientes', [auth, esCloser], async (req, res) => {
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

router.get('/prospectos', [auth, esCloser], async (req, res) => {
    try {
        const closerId = parseInt(req.usuario.id);
        const rows = await db.prepare(`
            SELECT c.*, u.nombre as prospectorNombre FROM clientes c
            LEFT JOIN usuarios u ON c.prospectorAsignado = u.id
            WHERE c.closerAsignado = ? AND c.etapaEmbudo != ?
            ORDER BY c.fechaTransferencia DESC
        `).all(closerId, 'venta_ganada');
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

// GET /api/closer/clientes-ganados
router.get('/clientes-ganados', [auth, esCloser], async (req, res) => {
    try {
        const closerId = parseInt(req.usuario.id);
        const rows = await db.prepare(`
            SELECT c.*, u.nombre as prospectorNombre FROM clientes c
            LEFT JOIN usuarios u ON c.prospectorAsignado = u.id
            WHERE c.closerAsignado = ? AND c.etapaEmbudo = ?
            ORDER BY c.fechaUltimaEtapa DESC
        `).all(closerId, 'venta_ganada');
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

// POST /api/closer/crear-prospecto
router.post('/crear-prospecto', [auth, esCloser], async (req, res) => {
    try {
        const { nombres, apellidoPaterno, apellidoMaterno, telefono, telefono2, correo, empresa, notas } = req.body;
        if (!nombres || !telefono) {
            return res.status(400).json({ msg: 'Nombres y teléfono son requeridos' });
        }

        const closerId = parseInt(req.usuario.id);
        const now = new Date().toISOString();

        // MEJORADO: Incluir vendedorAsignado y prospectorAsignado para consistencia en Postgres
        const stmt = await db.prepare(`
            INSERT INTO clientes (nombres, apellidoPaterno, apellidoMaterno, telefono, telefono2, correo, empresa, notas, vendedorAsignado, prospectorAsignado, closerAsignado, etapaEmbudo, fechaRegistro)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'prospecto_nuevo', ?)
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
            now
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
router.post('/registrar-actividad', [auth, esCloser], async (req, res) => {
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
// REUTILIZADO: Historial COMPLETO visible para prospector o closer
router.get('/prospecto/:id/historial-completo', auth, async (req, res) => {
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

        // Obtener TODAS las actividades del cliente (de todos los vendedores que han trabajado en él)
        const actividades = await db.prepare(`
            SELECT a.*, u.nombre as vendedorNombre, u.rol as vendedorRol
            FROM actividades a
            LEFT JOIN usuarios u ON a.vendedor = u.id
            WHERE a.cliente = ?
            ORDER BY a.fecha ASC
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
                notas: a.notas
            });
        });

        // Ordenar por fecha
        timeline.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

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

router.post('/registrar-reunion', [auth, esCloser], async (req, res) => {
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
router.put('/prospectos/:id/editar', [auth, esCloser], async (req, res) => {
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
router.delete('/prospectos/:id', [auth, esCloser], async (req, res) => {
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
router.post('/pasar-a-cliente/:id', [auth, esCloser], async (req, res) => {
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
router.post('/descartar-prospecto/:id', [auth, esCloser], async (req, res) => {
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
router.post('/marcar-evento-completado', [auth, esCloser], async (req, res) => {
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
router.get('/google-events-completados', [auth, esCloser], async (req, res) => {
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

module.exports = router;
