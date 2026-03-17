const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth } = require('../middleware/auth');
const { toMongoFormat, toMongoFormatMany } = require('../lib/helpers');

const esProspector = (req, res, next) => {
    if (req.usuario.rol !== 'prospector') {
        return res.status(403).json({ msg: 'Acceso denegado. Solo prospectores.' });
    }
    next();
};

// GET /api/prospector/dashboard
router.get('/dashboard', [auth, esProspector], async (req, res) => {
    try {
        const prospectorId = parseInt(req.usuario.id);
        const { rows: clientes } = await pool.query(
            'SELECT * FROM clientes WHERE "prospectorAsignado" = $1',
            [prospectorId]
        );

        const embudo = {
            total: clientes.length,
            prospecto_nuevo: clientes.filter(c => c.etapaEmbudo === 'prospecto_nuevo').length,
            en_contacto: clientes.filter(c => c.etapaEmbudo === 'en_contacto').length,
            reunion_agendada: clientes.filter(c => c.etapaEmbudo === 'reunion_agendada').length,
            transferidos: clientes.filter(c => c.closerAsignado).length
        };

        const { rows: actividadesHoy } = await pool.query(
            `SELECT * FROM actividades WHERE vendedor = $1 AND DATE(fecha::timestamptz AT TIME ZONE 'America/Mexico_City') = CURRENT_DATE`,
            [prospectorId]
        );

        const llamadasHoy = actividadesHoy.filter(a => a.tipo === 'llamada').length;
        const contactosExitosos = actividadesHoy.filter(a => a.tipo === 'llamada' && a.resultado === 'exitoso').length;

        const [{ rows: [totalLlamadasRow] }, { rows: [totalExitosasRow] }] = await Promise.all([
            pool.query('SELECT COUNT(*) as c FROM actividades WHERE vendedor = $1 AND tipo = $2', [prospectorId, 'llamada']),
            pool.query('SELECT COUNT(*) as c FROM actividades WHERE vendedor = $1 AND tipo = $2 AND resultado = $3', [prospectorId, 'llamada', 'exitoso'])
        ]);

        const metricas = {
            llamadas: { hoy: llamadasHoy, totales: parseInt(totalLlamadasRow?.c || 0) },
            contactosExitosos: { hoy: contactosExitosos, totales: parseInt(totalExitosasRow?.c || 0) },
            reunionesAgendadas: {
                hoy: clientes.filter(c => c.etapaEmbudo === 'reunion_agendada').length,
                totales: embudo.reunion_agendada
            }
        };

        const tasasConversion = {
            contacto: embudo.total > 0 ? ((embudo.en_contacto + embudo.reunion_agendada) / embudo.total * 100).toFixed(1) : 0,
            agendamiento: (embudo.en_contacto + embudo.reunion_agendada) > 0 ? (embudo.reunion_agendada / (embudo.en_contacto + embudo.reunion_agendada) * 100).toFixed(1) : 0
        };

        // Campos que el frontend espera
        if (!metricas.prospectosHoy) metricas.prospectosHoy = 0;
        if (!metricas.reunionesAgendadas.semana) metricas.reunionesAgendadas.semana = metricas.reunionesAgendadas.totales;
        if (!metricas.correosEnviados) metricas.correosEnviados = 0;

        res.json({ embudo, metricas, tasasConversion });
    } catch (error) {
        console.error('Error en dashboard prospector:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// GET /api/prospector/prospectos
router.get('/prospectos', [auth, esProspector], async (req, res) => {
    try {
        const prospectorId = parseInt(req.usuario.id);
        const { etapa, busqueda } = req.query;

        let sql = `SELECT c.*, u.nombre as "closerNombre" FROM clientes c LEFT JOIN usuarios u ON c."closerAsignado" = u.id WHERE c."prospectorAsignado" = $1 AND COALESCE(c.estado, '') <> 'ganado'`;
        const params = [prospectorId];
        let idx = 2;

        if (etapa && etapa !== 'todos') {
            sql += ` AND c."etapaEmbudo" = $${idx}`;
            params.push(etapa);
            idx++;
        }
        if (busqueda) {
            sql += ` AND (c.nombres ILIKE $${idx} OR c."apellidoPaterno" ILIKE $${idx} OR c.empresa ILIKE $${idx} OR c.telefono ILIKE $${idx})`;
            params.push('%' + busqueda + '%');
            idx++;
        }
        sql += ' ORDER BY c."fechaUltimaEtapa" DESC';

        const { rows } = await pool.query(sql, params);
        const prospectos = rows.map(r => {
            const { closerNombre, ...c } = r;
            const out = toMongoFormat(c);
            if (out && closerNombre) out.closerAsignado = { nombre: closerNombre };
            return out || c;
        });

        res.json(prospectos);
    } catch (error) {
        console.error('Error al obtener prospectos:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// DELETE /api/prospector/prospectos/:id
router.delete('/prospectos/:id', [auth, esProspector], async (req, res) => {
    const client = await pool.connect();
    try {
        const prospectorId = parseInt(req.usuario.id);
        const prospectoId = parseInt(req.params.id);

        if (!prospectoId) {
            client.release();
            return res.status(400).json({ msg: 'ID de prospecto inválido' });
        }

        const { rows: [cliente] } = await client.query('SELECT * FROM clientes WHERE id = $1', [prospectoId]);
        if (!cliente) {
            client.release();
            return res.status(404).json({ msg: 'Prospecto no encontrado' });
        }

        if (parseInt(cliente.prospectorAsignado) !== prospectorId) {
            client.release();
            return res.status(403).json({ msg: 'No tienes permiso para eliminar este prospecto' });
        }

        await client.query('BEGIN');
        await client.query('DELETE FROM actividades WHERE cliente = $1', [prospectoId]);
        await client.query('DELETE FROM clientes WHERE id = $1', [prospectoId]);
        await client.query('COMMIT');

        res.json({ msg: 'Prospecto eliminado correctamente' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al eliminar prospecto:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    } finally {
        client.release();
    }
});

// PUT /api/prospector/prospectos/:id
router.put('/prospectos/:id', [auth, esProspector], async (req, res) => {
    try {
        const prospectorId = parseInt(req.usuario.id);
        const prospectoId = parseInt(req.params.id);
        const { nombres, apellidoPaterno, apellidoMaterno, telefono, correo, empresa, notas } = req.body;

        if (!prospectoId) {
            return res.status(400).json({ msg: 'ID de prospecto inválido' });
        }

        const { rows: [cliente] } = await pool.query('SELECT * FROM clientes WHERE id = $1', [prospectoId]);
        if (!cliente) {
            return res.status(404).json({ msg: 'Prospecto no encontrado' });
        }

        if (parseInt(cliente.prospectorAsignado) !== prospectorId) {
            return res.status(403).json({ msg: 'No tienes permiso para editar este prospecto' });
        }

        if (!nombres || !apellidoPaterno || !telefono || !correo) {
            return res.status(400).json({ msg: 'Nombres, apellido paterno, teléfono y correo son requeridos' });
        }

        await pool.query(
            `UPDATE clientes SET nombres = $1, "apellidoPaterno" = $2, "apellidoMaterno" = $3, telefono = $4, correo = $5, empresa = $6, notas = $7, "ultimaInteraccion" = $8 WHERE id = $9`,
            [
                String(nombres).trim(),
                String(apellidoPaterno).trim(),
                String(apellidoMaterno || '').trim(),
                String(telefono).trim(),
                String(correo).trim().toLowerCase(),
                String(empresa || '').trim(),
                String(notas || '').trim(),
                new Date().toISOString(),
                prospectoId
            ]
        );

        const { rows: [updated] } = await pool.query('SELECT * FROM clientes WHERE id = $1', [prospectoId]);
        res.json({ msg: 'Prospecto actualizado', prospecto: toMongoFormat(updated) || updated });
    } catch (error) {
        console.error('Error al editar prospecto:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// POST /api/prospector/crear-prospecto
router.post('/crear-prospecto', [auth, esProspector], async (req, res) => {
    try {
        const { nombres, apellidoPaterno, apellidoMaterno, telefono, correo, empresa, notas } = req.body;
        if (!nombres || !apellidoPaterno || !telefono || !correo) {
            return res.status(400).json({ msg: 'Nombres, apellido paterno, teléfono y correo son requeridos' });
        }

        const prospectorId = parseInt(req.usuario.id);

        const { rows: [row] } = await pool.query(
            `INSERT INTO clientes (nombres, "apellidoPaterno", "apellidoMaterno", telefono, correo, empresa, notas, "vendedorAsignado", "prospectorAsignado", "etapaEmbudo")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'prospecto_nuevo') RETURNING *`,
            [
                nombres.trim(),
                (apellidoPaterno || '').trim(),
                (apellidoMaterno || '').trim(),
                String(telefono).trim(),
                String(correo).trim().toLowerCase(),
                (empresa || '').trim(),
                (notas || '').trim(),
                prospectorId,
                prospectorId
            ]
        );

        const cliente = toMongoFormat(row);
        if (cliente) cliente.prospectorAsignado = { nombre: req.usuario.nombre };

        res.status(201).json({ msg: 'Prospecto creado', cliente: cliente || row });
    } catch (error) {
        console.error('Error al crear prospecto:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// POST /api/prospector/registrar-actividad
router.post('/registrar-actividad', [auth, esProspector], async (req, res) => {
    try {
        const { clienteId, tipo, resultado, descripcion, notas, fechaCita, etapaEmbudo } = req.body;
        const tiposValidos = ['llamada', 'mensaje', 'correo', 'whatsapp', 'cita', 'prospecto'];
        const resultadosValidos = ['exitoso', 'pendiente', 'fallido', 'no_interes', 'otro'];
        const etapasValidasLlamadaExitosa = ['en_contacto', 'reunion_agendada'];

        if (!clienteId || !tipo) {
            return res.status(400).json({ msg: 'Cliente y tipo de actividad son requeridos' });
        }
        if (!tiposValidos.includes(tipo)) {
            return res.status(400).json({ msg: 'Tipo de actividad no válido' });
        }

        const cid = parseInt(clienteId);
        const { rows: [cliente] } = await pool.query('SELECT * FROM clientes WHERE id = $1', [cid]);
        if (!cliente) {
            return res.status(404).json({ msg: 'Cliente no encontrado' });
        }
        const prospectorId = parseInt(req.usuario.id);
        if (parseInt(cliente.prospectorAsignado) !== prospectorId) {
            return res.status(403).json({ msg: 'No tienes permiso para registrar actividades de este cliente' });
        }

        if (tipo === 'llamada') {
            const { rows: [llamadaExistente] } = await pool.query(
                "SELECT id FROM actividades WHERE cliente = $1 AND tipo = 'llamada' LIMIT 1",
                [cid]
            );
            if (llamadaExistente) {
                return res.status(400).json({ msg: 'Solo se permite una llamada por prospecto. Continúa el seguimiento por mensaje o cita.' });
            }
        }

        const resultadoSolicitado = resultado && resultadosValidos.includes(resultado) ? resultado : 'pendiente';
        const resultadoFinal = resultadoSolicitado === 'exitoso'
            ? 'exitoso'
            : resultadoSolicitado === 'no_interes'
                ? 'fallido'
                : (resultadoSolicitado === 'fallido' ? 'fallido' : 'pendiente');

        if (tipo === 'llamada' && resultadoSolicitado === 'no_interes' && !String(notas || '').trim()) {
            return res.status(400).json({ msg: 'Debes indicar el motivo cuando el cliente no está interesado' });
        }

        const fechaActividad = tipo === 'cita' && fechaCita ? new Date(fechaCita).toISOString() : new Date().toISOString();

        const { rows: [insRow] } = await pool.query(
            `INSERT INTO actividades (tipo, vendedor, cliente, fecha, descripcion, resultado, notas)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [tipo, prospectorId, cid, fechaActividad, descripcion || `${tipo} registrada`, resultadoFinal, notas || '']
        );

        const now = new Date().toISOString();
        await pool.query('UPDATE clientes SET "ultimaInteraccion" = $1 WHERE id = $2', [now, cid]);

        if (tipo === 'llamada' && resultadoSolicitado === 'exitoso') {
            const etapaDestino = etapasValidasLlamadaExitosa.includes(etapaEmbudo)
                ? etapaEmbudo
                : (cliente.etapaEmbudo === 'prospecto_nuevo' ? 'en_contacto' : null);

            if (etapaDestino) {
                const hist = cliente.historialEmbudo ? JSON.parse(cliente.historialEmbudo) : [];
                hist.push({ etapa: etapaDestino, fecha: now, vendedor: prospectorId });
                await pool.query(
                    'UPDATE clientes SET "etapaEmbudo" = $1, "fechaUltimaEtapa" = $2, "historialEmbudo" = $3 WHERE id = $4',
                    [etapaDestino, now, JSON.stringify(hist), cid]
                );
            }
        }

        if (tipo === 'llamada' && resultadoSolicitado === 'no_interes') {
            const hist = cliente.historialEmbudo ? JSON.parse(cliente.historialEmbudo) : [];
            hist.push({ etapa: 'perdido', fecha: now, vendedor: prospectorId, motivo: String(notas || '').trim() });
            await pool.query(
                'UPDATE clientes SET "etapaEmbudo" = $1, estado = $2, "fechaUltimaEtapa" = $3, "historialEmbudo" = $4, "ultimaInteraccion" = $5 WHERE id = $6',
                ['perdido', 'perdido', now, JSON.stringify(hist), now, cid]
            );
        }

        if (tipo === 'llamada' && resultadoSolicitado === 'pendiente') {
            await pool.query(
                `INSERT INTO actividades (tipo, vendedor, cliente, fecha, descripcion, resultado, notas)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                ['mensaje', prospectorId, cid, now, 'Seguimiento por mensaje después de llamada sin respuesta clara', 'pendiente', notas || '']
            );

            if (cliente.etapaEmbudo === 'prospecto_nuevo') {
                const hist = cliente.historialEmbudo ? JSON.parse(cliente.historialEmbudo) : [];
                hist.push({ etapa: 'en_contacto', fecha: now, vendedor: prospectorId });
                await pool.query(
                    'UPDATE clientes SET "etapaEmbudo" = $1, "fechaUltimaEtapa" = $2, "historialEmbudo" = $3 WHERE id = $4',
                    ['en_contacto', now, JSON.stringify(hist), cid]
                );
            }
        }

        const { rows: [actRow] } = await pool.query('SELECT * FROM actividades WHERE id = $1', [insRow.id]);
        const actividad = toMongoFormat(actRow);
        if (actividad) actividad.cliente = { nombres: cliente.nombres, apellidoPaterno: cliente.apellidoPaterno, empresa: cliente.empresa };

        res.status(201).json({ msg: 'Actividad registrada', actividad: actividad || actRow });
    } catch (error) {
        console.error('Error al registrar actividad:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// GET /api/prospector/actividades-hoy
router.get('/actividades-hoy', [auth, esProspector], async (req, res) => {
    try {
        const prospectorId = parseInt(req.usuario.id);
        const { rows } = await pool.query(
            `SELECT a.*, c.nombres as c_nombres, c."apellidoPaterno" as c_apellidopaterno, c.empresa as c_empresa, c.telefono as c_telefono, c.correo as c_correo
             FROM actividades a
             JOIN clientes c ON a.cliente = c.id
             WHERE a.vendedor = $1 AND DATE(a.fecha::timestamptz AT TIME ZONE 'America/Mexico_City') = CURRENT_DATE
             ORDER BY a.fecha DESC`,
            [prospectorId]
        );

        const actividades = rows.map(r => ({
            ...toMongoFormat(r),
            clienteId: r.cliente,
            cliente: {
                nombres: r.c_nombres,
                apellidoPaterno: r.c_apellidopaterno,
                empresa: r.c_empresa,
                telefono: r.c_telefono,
                correo: r.c_correo
            }
        }));

        res.json(actividades);
    } catch (error) {
        console.error('Error al obtener actividades:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// GET /api/prospector/actividades?rango=hoy|semana|mes
router.get('/actividades', [auth, esProspector], async (req, res) => {
    try {
        const prospectorId = parseInt(req.usuario.id);
        const rango = (req.query.rango || 'hoy').toLowerCase();

        let condicionFecha;
        if (rango === 'semana') {
            condicionFecha = "a.fecha >= NOW() - INTERVAL '6 days'";
        } else if (rango === 'mes') {
            condicionFecha = "a.fecha >= NOW() - INTERVAL '29 days'";
        } else {
            condicionFecha = "DATE(a.fecha::timestamptz AT TIME ZONE 'America/Mexico_City') = CURRENT_DATE";
        }

        const { rows } = await pool.query(
            `SELECT a.*, c.nombres as c_nombres, c."apellidoPaterno" as c_apellidopaterno, c.empresa as c_empresa, c.telefono as c_telefono, c.correo as c_correo
             FROM actividades a
             JOIN clientes c ON a.cliente = c.id
             WHERE a.vendedor = $1 AND ${condicionFecha}
             ORDER BY a.fecha DESC`,
            [prospectorId]
        );

        const actividades = rows.map(r => ({
            ...toMongoFormat(r),
            clienteId: r.cliente,
            cliente: {
                nombres: r.c_nombres,
                apellidoPaterno: r.c_apellidopaterno,
                empresa: r.c_empresa,
                telefono: r.c_telefono,
                correo: r.c_correo
            }
        }));

        res.json(actividades);
    } catch (error) {
        console.error('Error al obtener actividades por rango:', error);
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
        const { rows: [cliente] } = await pool.query('SELECT * FROM clientes WHERE id = $1', [cid]);
        if (!cliente) {
            return res.status(404).json({ msg: 'Cliente no encontrado' });
        }

        const prospectorId = parseInt(req.usuario.id);
        if (parseInt(cliente.prospectorAsignado) !== prospectorId) {
            return res.status(403).json({ msg: 'No tienes permiso para agendar reunión con este cliente' });
        }

        const now = new Date().toISOString();
        const hist = cliente.historialEmbudo ? JSON.parse(cliente.historialEmbudo) : [];
        hist.push({ etapa: 'reunion_agendada', fecha: now, vendedor: prospectorId });

        await pool.query(
            `UPDATE clientes SET "etapaEmbudo" = $1, "closerAsignado" = $2, "fechaTransferencia" = $3, "fechaUltimaEtapa" = $4, "ultimaInteraccion" = $5, "historialEmbudo" = $6 WHERE id = $7`,
            ['reunion_agendada', closerIdNum, now, now, now, JSON.stringify(hist), cid]
        );

        const fechaReunionISO = new Date(fechaReunion).toISOString();

        const { rows: [insProspectorRow] } = await pool.query(
            `INSERT INTO actividades (tipo, vendedor, cliente, fecha, descripcion, resultado, notas, "cambioEtapa", "etapaAnterior", "etapaNueva")
             VALUES ($1, $2, $3, $4, $5, 'pendiente', $6, 1, 'en_contacto', 'reunion_agendada') RETURNING id`,
            ['cita', prospectorId, cid, now, `Cita agendada por prospector ${req.usuario.nombre}`, notas || '']
        );

        await pool.query(
            `INSERT INTO actividades (tipo, vendedor, cliente, fecha, descripcion, resultado, notas, "cambioEtapa", "etapaAnterior", "etapaNueva")
             VALUES ($1, $2, $3, $4, $5, 'pendiente', $6, 1, 'en_contacto', 'reunion_agendada')`,
            ['cita', closerIdNum, cid, fechaReunionISO, `Reunión asignada al closer por prospector ${req.usuario.nombre}`, notas || '']
        );

        const { rows: [clienteActualizado] } = await pool.query('SELECT * FROM clientes WHERE id = $1', [cid]);
        const { rows: [actividadRow] } = await pool.query('SELECT * FROM actividades WHERE id = $1', [insProspectorRow.id]);

        const actividad = toMongoFormat(actividadRow);
        if (actividad) {
            actividad.cliente = {
                nombres: cliente.nombres,
                apellidoPaterno: cliente.apellidoPaterno,
                empresa: cliente.empresa,
                telefono: cliente.telefono,
                correo: cliente.correo
            };
            actividad.clienteId = cid;
        }

        res.json({
            msg: 'Reunión agendada exitosamente',
            cliente: toMongoFormat(clienteActualizado),
            actividad: actividad || toMongoFormat(actividadRow)
        });
    } catch (error) {
        console.error('Error al agendar reunión:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// GET /api/prospector/estadisticas
router.get('/estadisticas', [auth, esProspector], async (req, res) => {
    try {
        const prospectorId = parseInt(req.usuario.id);
        const [{ rows: clientes }, { rows: actividades }] = await Promise.all([
            pool.query('SELECT * FROM clientes WHERE "prospectorAsignado" = $1', [prospectorId]),
            pool.query('SELECT * FROM actividades WHERE vendedor = $1', [prospectorId])
        ]);

        const llamadas = actividades.filter(a => a.tipo === 'llamada');
        const llamadasExitosas = llamadas.filter(a => a.resultado === 'exitoso');
        const reunionesAgendadas = clientes.filter(c => c.etapaEmbudo === 'reunion_agendada' || c.closerAsignado);

        const tasaContacto = llamadas.length > 0 ? (llamadasExitosas.length / llamadas.length * 100).toFixed(1) : 0;
        const tasaAgendamiento = llamadasExitosas.length > 0 ? (reunionesAgendadas.length / llamadasExitosas.length * 100).toFixed(1) : 0;

        const distribucion = {
            prospecto_nuevo: clientes.filter(c => c.etapaEmbudo === 'prospecto_nuevo').length,
            en_contacto: clientes.filter(c => c.etapaEmbudo === 'en_contacto').length,
            reunion_agendada: clientes.filter(c => c.etapaEmbudo === 'reunion_agendada').length,
            transferidos: reunionesAgendadas.length
        };

        res.json({
            totalClientes: clientes.length,
            totalLlamadas: llamadas.length,
            llamadasExitosas: llamadasExitosas.length,
            reunionesAgendadas: reunionesAgendadas.length,
            tasaContacto: parseFloat(tasaContacto),
            tasaAgendamiento: parseFloat(tasaAgendamiento),
            distribucion
        });
    } catch (error) {
        console.error('Error en estadísticas prospector:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

module.exports = router;
