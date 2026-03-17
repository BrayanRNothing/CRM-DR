const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth } = require('../middleware/auth');

const esCloserOAdmin = (req, res, next) => {
    if (req.usuario.rol !== 'closer') {
        return res.status(403).json({ msg: 'Acceso denegado. Solo closers.' });
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

        const { rows: prospectors } = await pool.query('SELECT id, nombre, email as correo FROM usuarios WHERE rol = $1', ['prospector']);

        const prospectorsConMetricas = await Promise.all(prospectors.map(async (prospector) => {
            const pid = prospector.id;
            const [
                { rows: [{ c: clientesTotales }] },
                { rows: [{ c: clientesNuevos }] },
                { rows: actividades },
                { rows: [{ c: citasAgendadas }] },
                { rows: [{ c: transferencias }] },
                dist
            ] = await Promise.all([
                pool.query('SELECT COUNT(*) as c FROM clientes WHERE "prospectorAsignado" = $1', [pid]),
                pool.query('SELECT COUNT(*) as c FROM clientes WHERE "prospectorAsignado" = $1 AND "fechaRegistro" >= $2', [pid, fechaInicioStr]),
                pool.query('SELECT * FROM actividades WHERE vendedor = $1 AND fecha >= $2 AND fecha <= $3', [pid, fechaInicioStr, ahoraStr]),
                pool.query('SELECT COUNT(*) as c FROM clientes WHERE "prospectorAsignado" = $1 AND "etapaEmbudo" = $2 AND "fechaUltimaEtapa" >= $3', [pid, 'reunion_agendada', fechaInicioStr]),
                pool.query('SELECT COUNT(*) as c FROM clientes WHERE "prospectorAsignado" = $1 AND "closerAsignado" IS NOT NULL AND "fechaTransferencia" >= $2', [pid, fechaInicioStr]),
                Promise.all(['prospecto_nuevo', 'en_contacto', 'reunion_agendada'].map(e =>
                    pool.query('SELECT COUNT(*) as c FROM clientes WHERE "prospectorAsignado" = $1 AND "etapaEmbudo" = $2', [pid, e])
                ))
            ]);

            const llamadas = actividades.filter(a => a.tipo === 'llamada');
            const llamadasExitosas = llamadas.filter(a => a.resultado === 'exitoso');
            const mensajes = actividades.filter(a => ['mensaje', 'correo', 'whatsapp'].includes(a.tipo));

            const rendimiento = calcularEstado(llamadas.length, parseInt(citasAgendadas), periodo);
            const tasaContacto = llamadas.length > 0 ? ((llamadasExitosas.length / llamadas.length) * 100).toFixed(1) : 0;
            const tasaAgendamiento = llamadasExitosas.length > 0 ? ((parseInt(citasAgendadas) / llamadasExitosas.length) * 100).toFixed(1) : 0;

            const distribucion = {
                prospecto_nuevo: parseInt(dist[0].rows[0].c),
                en_contacto: parseInt(dist[1].rows[0].c),
                reunion_agendada: parseInt(dist[2].rows[0].c)
            };

            return {
                prospector: { id: String(prospector.id), nombre: prospector.nombre, correo: prospector.correo || '' },
                metricas: {
                    llamadas: { total: llamadas.length, exitosas: llamadasExitosas.length },
                    mensajes: { total: mensajes.length },
                    citas: { agendadas: parseInt(citasAgendadas), transferidas: parseInt(transferencias) },
                    prospectos: { total: parseInt(clientesTotales), nuevos: parseInt(clientesNuevos), revisados: llamadas.length },
                    tasas: { contacto: parseFloat(tasaContacto), agendamiento: parseFloat(tasaAgendamiento) }
                },
                distribucion,
                rendimiento: {
                    estado: rendimiento.estado,
                    color: rendimiento.color,
                    descripcion: getDescripcionEstado(rendimiento.estado)
                },
                periodo
            };
        }));

        const ordenEstado = { 'excelente': 0, 'bueno': 1, 'bajo': 2, 'critico': 3, 'sin_datos': 4 };
        prospectorsConMetricas.sort((a, b) => ordenEstado[a.rendimiento.estado] - ordenEstado[b.rendimiento.estado]);

        res.json({
            periodo,
            fechaInicio: fechaInicioStr,
            fechaFin: ahoraStr,
            totalProspectors: prospectorsConMetricas.length,
            prospectors: prospectorsConMetricas
        });
    } catch (error) {
        console.error('Error en monitoreo:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

module.exports = router;
