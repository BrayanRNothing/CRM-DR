const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { auth } = require('../middleware/auth');

const esCloserOAdmin = (req, res, next) => {
    const rolesPermitidos = ['closer', 'admin', 'superadmin'];
    if (!rolesPermitidos.includes(req.usuario.rol)) {
        return res.status(403).json({ msg: 'Acceso denegado. Solo closers o administradores.' });
    }
    next();
};

const calcularEstado = (llamadas, citas, periodo = 'diario') => {
    if (periodo === 'diario') {
        if (llamadas >= 12 && citas >= 1) return { estado: 'excelente', color: 'green' };
        if (llamadas >= 8 || citas >= 1) return { estado: 'bueno', color: 'yellow' };
        if (llamadas >= 4) return { estado: 'bajo', color: 'orange' };
        return { estado: 'critico', color: 'red' };
    } else if (periodo === 'semanal') {
        if (llamadas >= 60 && citas >= 8) return { estado: 'excelente', color: 'green' };
        if (llamadas >= 40 || citas >= 5) return { estado: 'bueno', color: 'yellow' };
        if (llamadas >= 20 || citas >= 2) return { estado: 'bajo', color: 'orange' };
        return { estado: 'critico', color: 'red' };
    } else if (periodo === 'mensual') {
        if (llamadas >= 240 && citas >= 32) return { estado: 'excelente', color: 'green' };
        if (llamadas >= 160 || citas >= 20) return { estado: 'bueno', color: 'yellow' };
        if (llamadas >= 80 || citas >= 8) return { estado: 'bajo', color: 'orange' };
        return { estado: 'critico', color: 'red' };
    }
    return { estado: 'sin_datos', color: 'gray' };
};

function getDescripcionEstado(estado) {
    const descripciones = {
        'excelente': 'Rendimiento excelente - Cumpliendo metas',
        'bueno': 'Buen rendimiento - En camino',
        'bajo': 'Rendimiento bajo - Necesita atención',
        'critico': 'Rendimiento crítico - Requiere intervención',
        'sin_datos': 'Sin datos suficientes'
    };
    return descripciones[estado] || 'Estado desconocido';
}

router.get('/monitoring', [auth, esCloserOAdmin], async (req, res) => {
    try {
        const { periodo = 'diario' } = req.query;
        const ahora = new Date();

        const hoy = new Date(ahora);
        hoy.setHours(0, 0, 0, 0);
        const hoyStr = hoy.toISOString();

        const semana = new Date(ahora);
        semana.setDate(ahora.getDate() - 7);
        semana.setHours(0, 0, 0, 0);
        const semanaStr = semana.toISOString();

        let fechaInicio = new Date();
        if (periodo === 'diario') {
            fechaInicio.setHours(0, 0, 0, 0);
        } else if (periodo === 'semanal') {
            fechaInicio.setDate(ahora.getDate() - 7);
            fechaInicio.setHours(0, 0, 0, 0);
        } else if (periodo === 'mensual') {
            fechaInicio.setDate(ahora.getDate() - 30);
            fechaInicio.setHours(0, 0, 0, 0);
        }
        const fechaInicioStr = fechaInicio.toISOString();
        const ahoraStr = ahora.toISOString();

        const prospectors = await db.prepare('SELECT id, nombre, email as correo FROM usuarios WHERE rol = ? AND activo = 1 AND usuario != ?').all('prospector', 'julioagk');
        const prospectorsConMetricas = await Promise.all(prospectors.map(async (prospector) => {
            const prospectorId = prospector.id;
            const row1 = await db.prepare('SELECT COUNT(*) as c FROM clientes WHERE prospectorAsignado = ?').get(prospectorId);
            const clientesTotales = row1.c;

            const row2 = await db.prepare('SELECT COUNT(*) as c FROM clientes WHERE prospectorAsignado = ? AND (fechaRegistro >= ? OR (fechaRegistro IS NULL AND fechaUltimaEtapa >= ?))').get(prospectorId, fechaInicioStr, fechaInicioStr);
            const clientesNuevos = row2.c;

            const actividades = await db.prepare('SELECT * FROM actividades WHERE vendedor = ? AND fecha >= ? AND fecha <= ?').all(prospectorId, fechaInicioStr, ahoraStr);

            const llamadas = actividades.filter(a => a.tipo === 'llamada');
            const llamadasExitosas = llamadas.filter(a => a.resultado === 'exitoso');
            const mensajes = actividades.filter(a => ['mensaje', 'correo', 'whatsapp'].includes(a.tipo));

            const row3 = await db.prepare('SELECT COUNT(*) as c FROM clientes WHERE prospectorAsignado = ? AND etapaEmbudo = ? AND fechaUltimaEtapa >= ?').get(prospectorId, 'reunion_agendada', fechaInicioStr);
            const citasAgendadas = row3.c;

            const row4 = await db.prepare('SELECT COUNT(*) as c FROM clientes WHERE prospectorAsignado = ? AND closerAsignado IS NOT NULL AND fechaTransferencia >= ?').get(prospectorId, fechaInicioStr);
            const transferencias = row4.c;

            const rendimiento = calcularEstado(llamadas.length, citasAgendadas, periodo);
            const tasaContacto = llamadas.length > 0 ? ((llamadasExitosas.length / llamadas.length) * 100).toFixed(1) : 0;
            const tasaAgendamiento = llamadasExitosas.length > 0 ? ((citasAgendadas / llamadasExitosas.length) * 100).toFixed(1) : 0;

            const row5 = await db.prepare('SELECT COUNT(*) as c FROM clientes WHERE prospectorAsignado = ? AND etapaEmbudo = ?').get(prospectorId, 'prospecto_nuevo');
            const row6 = await db.prepare('SELECT COUNT(*) as c FROM clientes WHERE prospectorAsignado = ? AND etapaEmbudo = ?').get(prospectorId, 'en_contacto');
            const row7 = await db.prepare('SELECT COUNT(*) as c FROM clientes WHERE prospectorAsignado = ? AND etapaEmbudo = ?').get(prospectorId, 'reunion_agendada');
            const distribucion = {
                prospecto_nuevo: row5.c,
                en_contacto: row6.c,
                reunion_agendada: row7.c
            };

            // NEW DETAILED METRICS for Hoy
            const actsHoy = await db.prepare(`
                SELECT a.*, c.nombres, c.apellidoPaterno
                FROM actividades a
                LEFT JOIN clientes c ON c.id = a.cliente
                WHERE a.vendedor = ? AND a.fecha >= ? AND a.fecha <= ?
            `).all(prospectorId, hoyStr, ahoraStr);
            const llamadasHoy = actsHoy.filter(a => a.tipo === 'llamada');
            const llamadasExitosasHoy = llamadasHoy.filter(a => a.resultado === 'exitoso');
            const mensajesHoy = actsHoy.filter(a => ['mensaje', 'correo', 'whatsapp'].includes(a.tipo));

            const row8 = await db.prepare('SELECT COUNT(*) as c FROM clientes WHERE prospectorAsignado = ? AND etapaEmbudo = ? AND fechaUltimaEtapa >= ?').get(prospectorId, 'reunion_agendada', hoyStr);
            const citasHoy = row8.c;

            // Prospectos registrados HOY
            const prospectosHoyRaw = await db.prepare(`
                SELECT id, nombres, apellidoPaterno, etapaEmbudo, closerAsignado, fechaRegistro
                FROM clientes 
                WHERE prospectorAsignado = ? 
                AND (fechaRegistro >= ? OR (fechaRegistro IS NULL AND fechaUltimaEtapa >= ?))
            `).all(prospectorId, hoyStr, hoyStr);

            const prospectosRegistradosHoy = prospectosHoyRaw.length;
            const prospectosActivosHoy = prospectosHoyRaw.filter(p => p.etapaEmbudo !== 'perdido' && !p.closerAsignado).length;
            const prospectosDescartadosHoy = prospectosHoyRaw.filter(p => p.etapaEmbudo === 'perdido').length;
            const prospectosTransferidosHoy = prospectosHoyRaw.filter(p => p.closerAsignado || p.etapaEmbudo === 'reunion_agendada').length;

            // Add a computed 'nombre' field for convenience in the timeline
            const prospectosHoyConNombre = prospectosHoyRaw.map(p => ({
                ...p,
                nombre: [p.nombres, p.apellidoPaterno].filter(Boolean).join(' ') || 'Sin nombre'
            }));

            const rendimientoHoy = calcularEstado(llamadasHoy.length, citasHoy, 'diario');

            // Build a unified activity timeline for today
            const timelineActividades = actsHoy.map(a => ({
                tipo: 'actividad',
                subTipo: a.tipo,
                fecha: a.fecha,
                descripcion: a.descripcion || null,
                resultado: a.resultado || null,
                notas: a.notas || null,
                prospecto: [a.nombres, a.apellidoPaterno].filter(Boolean).join(' ') || null,
            }));

            const timelineProspectos = prospectosHoyConNombre.map(p => ({
                tipo: 'prospecto_registrado',
                subTipo: 'registro',
                fecha: p.fechaRegistro || null,
                nombre: p.nombre || null,
                etapa: p.etapaEmbudo || null,
            }));

            const actividadesTimeline = [...timelineActividades, ...timelineProspectos]
                .filter(e => e.fecha)
                .sort((a, b) => new Date(b.fecha) - new Date(a.fecha)); // más reciente primero

            const detalleHoy = {
                llamadas: llamadasHoy.length,
                llamadasExitosas: llamadasExitosasHoy.length,
                mensajes: mensajesHoy.length,
                citasAgendadas: citasHoy,
                prospectosRegistrados: prospectosRegistradosHoy,
                prospectosActivos: prospectosActivosHoy,
                prospectosDescartados: prospectosDescartadosHoy,
                prospectosTransferidos: prospectosTransferidosHoy,
                listaProspectosHoy: prospectosHoyConNombre,
                actividadesTimeline,
                estado: rendimientoHoy.estado,
                color: rendimientoHoy.color
            };

            // NEW DETAILED METRICS for Semana — with JOIN for names
            const actsSemana = await db.prepare(`
                SELECT a.*, c.nombres, c.apellidoPaterno
                FROM actividades a
                LEFT JOIN clientes c ON c.id = a.cliente
                WHERE a.vendedor = ? AND a.fecha >= ? AND a.fecha <= ?
            `).all(prospectorId, semanaStr, ahoraStr);
            const llamadasSemana = actsSemana.filter(a => a.tipo === 'llamada');
            const llamadasExitosasSemana = llamadasSemana.filter(a => a.resultado === 'exitoso');
            const mensajesSemana = actsSemana.filter(a => ['mensaje', 'correo', 'whatsapp'].includes(a.tipo));

            const row10 = await db.prepare('SELECT COUNT(*) as c FROM clientes WHERE prospectorAsignado = ? AND etapaEmbudo = ? AND fechaUltimaEtapa >= ?').get(prospectorId, 'reunion_agendada', semanaStr);
            const citasSemana = row10.c;

            const prospectosSemanaRaw = await db.prepare(`
                SELECT id, nombres, apellidoPaterno, etapaEmbudo, closerAsignado, fechaRegistro
                FROM clientes 
                WHERE prospectorAsignado = ? 
                AND (fechaRegistro >= ? OR (fechaRegistro IS NULL AND fechaUltimaEtapa >= ?))
            `).all(prospectorId, semanaStr, semanaStr);

            const prospectosRegistradosSemana = prospectosSemanaRaw.length;
            const prospectosActivosSemana = prospectosSemanaRaw.filter(p => p.etapaEmbudo !== 'perdido' && !p.closerAsignado).length;
            const prospectosDescartadosSemana = prospectosSemanaRaw.filter(p => p.etapaEmbudo === 'perdido').length;
            const prospectosTransferidosSemana = prospectosSemanaRaw.filter(p => p.closerAsignado || p.etapaEmbudo === 'reunion_agendada').length;

            const prospectosSemanaConNombre = prospectosSemanaRaw.map(p => ({
                ...p,
                nombre: [p.nombres, p.apellidoPaterno].filter(Boolean).join(' ') || 'Sin nombre'
            }));

            const rendimientoSemana = calcularEstado(llamadasSemana.length, citasSemana, 'semanal');

            // Timeline for semana
            const timelineActsSemana = actsSemana.map(a => ({
                tipo: 'actividad',
                subTipo: a.tipo,
                fecha: a.fecha,
                descripcion: a.descripcion || null,
                resultado: a.resultado || null,
                notas: a.notas || null,
                prospecto: [a.nombres, a.apellidoPaterno].filter(Boolean).join(' ') || null,
            }));
            const timelineProspectosSemana = prospectosSemanaConNombre.map(p => ({
                tipo: 'prospecto_registrado',
                subTipo: 'registro',
                fecha: p.fechaRegistro || null,
                nombre: p.nombre || null,
                etapa: p.etapaEmbudo || null,
            }));
            const actividadesTimelineSemana = [...timelineActsSemana, ...timelineProspectosSemana]
                .filter(e => e.fecha)
                .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

            // Timeline for "todo" (last 200 activities, no date filter)
            const actsTodo = await db.prepare(`
                SELECT a.*, c.nombres, c.apellidoPaterno
                FROM actividades a
                LEFT JOIN clientes c ON c.id = a.cliente
                WHERE a.vendedor = ?
                ORDER BY a.fecha DESC
                LIMIT 200
            `).all(prospectorId);
            const actividadesTimelineTodo = actsTodo.map(a => ({
                tipo: 'actividad',
                subTipo: a.tipo,
                fecha: a.fecha,
                descripcion: a.descripcion || null,
                resultado: a.resultado || null,
                notas: a.notas || null,
                prospecto: [a.nombres, a.apellidoPaterno].filter(Boolean).join(' ') || null,
            })).filter(e => e.fecha);

            const detalleSemana = {
                llamadas: llamadasSemana.length,
                llamadasExitosas: llamadasExitosasSemana.length,
                mensajes: mensajesSemana.length,
                citasAgendadas: citasSemana,
                prospectosRegistrados: prospectosRegistradosSemana,
                prospectosActivos: prospectosActivosSemana,
                prospectosDescartados: prospectosDescartadosSemana,
                prospectosTransferidos: prospectosTransferidosSemana,
                listaProspectosSemana: prospectosSemanaConNombre,
                actividadesTimeline: actividadesTimelineSemana,
                actividadesTimelineTodo,
                estado: rendimientoSemana.estado,
                color: rendimientoSemana.color
            };

            return {
                prospector: { id: String(prospector.id), nombre: prospector.nombre, correo: prospector.correo || '' },
                metricas: {
                    llamadas: { total: llamadas.length, exitosas: llamadasExitosas.length },
                    mensajes: { total: mensajes.length },
                    citas: { agendadas: citasAgendadas, transferidas: transferencias },
                    prospectos: { total: clientesTotales, nuevos: clientesNuevos, revisados: llamadas.length },
                    tasas: { contacto: parseFloat(tasaContacto), agendamiento: parseFloat(tasaAgendamiento) }
                },
                distribucion,
                rendimiento: {
                    estado: rendimiento.estado,
                    color: rendimiento.color,
                    descripcion: getDescripcionEstado(rendimiento.estado)
                },
                periodo,
                detalleHoy,
                detalleSemana
            };
        }));

        const ordenEstado = { 'excelente': 0, 'bueno': 1, 'bajo': 2, 'critico': 3, 'sin_datos': 4 };
        prospectorsConMetricas.sort((a, b) => ordenEstado[a.rendimiento.estado] - ordenEstado[b.rendimiento.estado]);

        res.json({
            periodo,
            fechaInicio: fechaInicioStr,
            fechaFin: ahoraStr,
            totalProspectors: prospectorsConMetricas.length,
            prospectors: prospectorsConMetricas,
            metas: {
                diario: { excelente: '12+ llam, 1+ cita', bueno: '8+ llam o 1 cita', bajo: '4+ llam' },
                semanal: { excelente: '60+ llam, 8+ citas', bueno: '40+ llam o 5 citas', bajo: '20+ llam o 2 citas' },
                mensual: { excelente: '240+ llam, 32+ citas', bueno: '160+ llam o 20 citas', bajo: '80+ llam o 8 citas' }
            }
        });
    } catch (error) {
        console.error('Error en monitoreo:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// GET /api/closer/prospectors/monitoring/:prospectorId/prospectos
router.get('/monitoring/:prospectorId/prospectos', [auth, esCloserOAdmin], async (req, res) => {
    try {
        const { prospectorId } = req.params;
        const { periodo = 'diario' } = req.query;
        const ahora = new Date();

        let prospectos;
        if (periodo === 'todos') {
            prospectos = await db.prepare(`
                SELECT id, nombres, apellidoPaterno, apellidoMaterno, telefono, correo, empresa, etapaEmbudo, fechaRegistro
                FROM clientes
                WHERE prospectorAsignado = ?
                ORDER BY COALESCE(fechaRegistro, fechaUltimaEtapa) DESC
            `).all(parseInt(prospectorId));
        } else {
            let fechaInicio = new Date();
            if (periodo === 'diario') {
                fechaInicio.setHours(0, 0, 0, 0);
            } else if (periodo === 'semanal') {
                fechaInicio.setDate(ahora.getDate() - 7);
                fechaInicio.setHours(0, 0, 0, 0);
            } else if (periodo === 'mensual') {
                fechaInicio.setDate(ahora.getDate() - 30);
                fechaInicio.setHours(0, 0, 0, 0);
            }
            const fechaInicioStr = fechaInicio.toISOString();
            prospectos = await db.prepare(`
                SELECT id, nombres, apellidoPaterno, apellidoMaterno, telefono, correo, empresa, etapaEmbudo, fechaRegistro
                FROM clientes
                WHERE prospectorAsignado = ? AND (fechaRegistro >= ? OR (fechaRegistro IS NULL AND fechaUltimaEtapa >= ?))
                ORDER BY COALESCE(fechaRegistro, fechaUltimaEtapa) DESC
            `).all(parseInt(prospectorId), fechaInicioStr, fechaInicioStr);
        }

        res.json({ prospectos });
    } catch (error) {
        console.error('Error al obtener prospectos del prospector:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

module.exports = router;
