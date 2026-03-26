const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { auth } = require('../middleware/auth');
const { toMongoFormat, toMongoFormatMany } = require('../lib/helpers');

const esProspector = (req, res, next) => {
    const rol = String(req.usuario.rol).toLowerCase();
    if (rol !== 'prospector' && rol !== 'closer' && rol !== 'vendedor') {
        return res.status(403).json({ msg: 'Acceso denegado. Solo prospectores, closers o vendedores.' });
    }
    next();
};

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

// GET /api/prospector/dashboard
router.get('/dashboard', [auth, esProspector], async (req, res) => {
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

// GET /api/prospector/prospectos
router.get('/prospectos', [auth, esProspector], async (req, res) => {
    try {
        const prospectorId = parseInt(req.usuario.id);
        const { etapa, busqueda } = req.query;

        let sql = `SELECT c.*, u.nombre as closerNombre
            FROM clientes c LEFT JOIN usuarios u ON c.closerAsignado = u.id WHERE c.prospectorAsignado = ? AND c.etapaEmbudo NOT IN (?, ?)`;
        const params = [prospectorId, 'venta_ganada', 'perdido'];

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
        const ids = rows.map(r => r.id).filter(Boolean);
        const ultimasActs = ids.length > 0
            ? await db.prepare(
                `SELECT a.cliente, a.tipo, COALESCE(NULLIF(a.notas, ''), a.descripcion) as texto
                 FROM actividades a
                 INNER JOIN (
                   SELECT cliente, MAX(fecha) as maxFecha FROM actividades WHERE cliente IN (${ids.map(() => '?').join(',')}) GROUP BY cliente
                 ) ult ON a.cliente = ult.cliente AND a.fecha = ult.maxFecha`
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

// GET /api/prospector/clientes-ganados
router.get('/clientes-ganados', [auth, esProspector], async (req, res) => {
    try {
        const prospectorId = parseInt(req.usuario.id);
        const { busqueda } = req.query;

        let sql = 'SELECT c.*, u.nombre as closerNombre FROM clientes c LEFT JOIN usuarios u ON c.closerAsignado = u.id WHERE c.prospectorAsignado = ? AND c.etapaEmbudo = ?';
        const params = [prospectorId, 'venta_ganada'];

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

// POST /api/prospector/crear-prospecto
router.post('/crear-prospecto', [auth, esProspector], async (req, res) => {
    try {
        const { nombres, apellidoPaterno, apellidoMaterno, telefono, telefono2, correo, empresa, notas, sitioWeb, ubicacion } = req.body;

        const prospectorId = parseInt(req.usuario.id);
        const rol = String(req.usuario.rol).toLowerCase();
        const closerId = rol === 'closer' ? prospectorId : null;
        const now = new Date().toISOString();

        const stmt = await db.prepare(`
            INSERT INTO clientes (nombres, apellidoPaterno, apellidoMaterno, telefono, telefono2, correo, empresa, notas, sitioWeb, ubicacion, vendedorAsignado, prospectorAsignado, closerAsignado, etapaEmbudo, fechaRegistro, fechaUltimaEtapa)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'prospecto_nuevo', ?, ?)
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
            prospectorId,
            prospectorId,
            closerId,
            now,
            now
        );

        const row = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(result.lastInsertRowid);
        const cliente = toMongoFormat(row);
        if (cliente) cliente.prospectorAsignado = { nombre: req.usuario.nombre };

        // 🚀 Web Sockets: Emitir evento de actualización
        if (req.app.get('io')) {
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

// POST /api/prospector/registrar-actividad
router.post('/registrar-actividad', [auth, esProspector], async (req, res) => {
    try {
        const { clienteId, tipo, resultado, descripcion, notas, fechaCita, etapaEmbudo, proximaLlamada, interes } = req.body;
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

// GET /api/prospector/prospecto/:id/historial-completo
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

// GET /api/prospector/actividades-hoy
router.get('/actividades-hoy', [auth, esProspector], async (req, res) => {
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

// GET /api/prospector/prospectos/:id/actividades
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

// GET /api/prospector/prospectos/:id/recordatorios
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

// POST /api/prospector/prospectos/:id/recordatorios
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

// DELETE /api/prospector/recordatorios/:recordatorioId
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

// PUT /api/prospector/recordatorios/:recordatorioId
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

// PUT /api/prospector/prospectos/:id
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

// PUT /api/prospector/prospectos/:id/editar
router.put('/prospectos/:id/editar', [auth, esProspector], async (req, res) => {
    try {
        const prospectoId = parseInt(req.params.id);
        const { nombres, apellidoPaterno, apellidoMaterno, telefono, telefono2, correo, empresa, ubicacion, notas, etapaEmbudo, sitioWeb } = req.body;
        const prospectorId = parseInt(req.usuario.id);
        const now = new Date().toISOString();

        const cliente = await db.prepare('SELECT * FROM clientes WHERE id = ?').get(prospectoId);
        if (!cliente) {
            return res.status(404).json({ msg: 'Prospecto no encontrado' });
        }

        const updates = [
            'nombres = ?', 'apellidoPaterno = ?', 'apellidoMaterno = ?',
            'telefono = ?', 'telefono2 = ?', 'correo = ?', 'empresa = ?', 'notas = ?', 'sitioWeb = ?', 'ubicacion = ?',
            'interes = ?', 'proximaLlamada = ?'
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
            req.body.interes !== undefined ? req.body.interes : 0,
            req.body.proximaLlamada || null
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

// POST /api/prospector/agendar-reunion
router.post('/agendar-reunion', [auth, esProspector], async (req, res) => {
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
                    expiry_date: closerDetails.googleTokenExpiry
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
                    description: `Cliente: ${cliente.telefono} - ${cliente.empresa || 'Sin empresa'}\nNotas: ${notas || 'Sin notas'}\nAgendado por Prospecter ${req.usuario.nombre}.`,
                    start: { dateTime: fechaReunionISO, timeZone: 'America/Mexico_City' },
                    end: { dateTime: finReunionISO, timeZone: 'America/Mexico_City' },
                    attendees: attendeesList,
                    conferenceData: {
                        createRequest: { requestId: 'meeting-' + Date.now().toString() }
                    }
                };

                const createdEvent = await calendar.events.insert({
                    calendarId: 'primary',
                    conferenceDataVersion: 1,
                    requestBody: event
                });

                if (createdEvent.data && createdEvent.data.hangoutLink) {
                    hangoutLink = createdEvent.data.hangoutLink;
                }
            }
        } catch (calendarError) {
            console.error('Error al intentar crear cita en Google Calendar:', calendarError);
            // No detenemos el flujo del CRM si google falla, solo registramos log
        }
        // ** END GOOGLE CALENDAR INTEGRATION **


        const fechaDisplayMX = new Date(fechaReunion).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'short', timeStyle: 'short' });
        await db.prepare(`
            INSERT INTO actividades (tipo, vendedor, cliente, fecha, descripcion, resultado, notas, cambioEtapa, etapaAnterior, etapaNueva)
            VALUES (?, ?, ?, ?, ?, 'pendiente', ?, 1, 'en_contacto', 'reunion_agendada')
        `).run('cita', prospectorId, cid, fechaReunionISO, `Reunión agendada para el ${fechaDisplayMX} por prospector ${req.usuario.nombre} → Asignada a closer`, notas || '');

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

// POST /api/prospector/pasar-a-cliente/:id
router.post('/pasar-a-cliente/:id', [auth, esProspector], async (req, res) => {
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

// POST /api/prospector/descartar-prospecto/:id
router.post('/descartar-prospecto/:id', [auth, esProspector], async (req, res) => {
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

// GET /api/prospector/estadisticas - Estadísticas detalladas del prospector
router.get('/estadisticas', [auth, esProspector], async (req, res) => {
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

// POST /api/prospector/importar-csv
router.post('/importar-csv', [auth, esProspector], async (req, res) => {
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

// DELETE /api/prospector/prospectos/:id
router.delete('/prospectos/:id', [auth, esProspector], async (req, res) => {
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

module.exports = router;