const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db } = require('../config/database');
const { auth } = require('../middleware/auth');
const { enviarCorreoBienvenida } = require('../services/emailService');

const ROLES_PERMITIDOS = ['vendedor'];

// @route   POST api/auth/login
// @desc    Autenticar usuario y obtener token
// @access  Public
router.post('/login', async (req, res) => {
    try {
        console.log('--- INICIO INTENTO DE LOGIN ---');
        console.log('Body recibido (sin contraseña):', { ...req.body, contraseña: '***' });
        
        // El frontend envía { usuario, contraseña } pero el input puede ser un email
        const identificador = req.body.usuario || req.body.email; 
        const { contraseña } = req.body;

        if (!identificador || !contraseña) {
            console.warn('⚠️ Login fallido: Faltan credenciales', { identificador: !!identificador, contraseña: !!contraseña });
            return res.status(400).json({ mensaje: 'Por favor ingrese usuario/email y contraseña' });
        }

        console.log(`🔑 Intento de login para: "${identificador}"`);
        
        // Búsqueda en Postgres por usuario (LOWER) o email (LOWER)
        const query = 'SELECT * FROM usuarios WHERE LOWER(usuario) = LOWER(?) OR LOWER(email) = LOWER(?)';
        const row = await db.prepare(query).get(identificador.trim(), identificador.trim());
        
        if (!row) {
            console.log(`❌ Login fallido: Usuario/Email no encontrado: "${identificador}"`);
            return res.status(400).json({ mensaje: 'Credenciales inválidas' });
        }

        console.log(`👤 Usuario encontrado: ${row.usuario} (ID: ${row.id}, Activo: ${row.activo}, Tipo de activo: ${typeof row.activo})`);

        if (row.activo == null || row.activo == 0 || row.activo === false) {
            console.warn(`⚠️ Intento de login en cuenta desactivada. Usuario: ${row.usuario}`);
            return res.status(401).json({ mensaje: 'Usuario desactivado. Contacte al administrador' });
        }

        const contraseñaValida = await bcrypt.compare(contraseña, row.contraseña);
        if (!contraseñaValida) {
            console.log(`❌ Login fallido: Contraseña incorrecta para el usuario: "${row.usuario}"`);
            return res.status(400).json({ mensaje: 'Credenciales inválidas' });
        }

        console.log(`✅ Login exitoso para el usuario: "${row.usuario}"`);

        // Crear Payload
        const payload = {
            id: row.id,
            rol: row.rol,
            equipo_id: row.equipo_id || null
        };

        // Firmar Token
        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '7d' },
            async (err, token) => {
                if (err) throw err;

                // Registrar actividad de inicio de sesión
                try {
                    await db.prepare('INSERT INTO actividades (tipo, vendedor, descripcion, resultado) VALUES (?, ?, ?, ?)')
                        .run('login', row.id, `Inicio de sesión exitoso`, 'exitoso');
                } catch (actError) {
                    console.error('Error al registrar actividad de login:', actError);
                }

                res.json({
                    token,
                    usuario: {
                        id: row.id,
                        usuario: row.usuario,
                        nombre: row.nombre,
                        rol: row.rol,
                        email: row.email,
                        telefono: row.telefono,
                        equipo_id: row.equipo_id || null
                    }
                });
            }
        );
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

// @route   POST api/auth/register
// @desc    Registrar un nuevo usuario
// @access  Public
router.post('/register', async (req, res) => {
    try {
        console.log('📝 Intento de registro recibido:', { ...req.body, contraseña: '***' });
        let { usuario, contraseña, nombre, email, telefono, rol } = req.body;

        if (!rol) rol = 'vendedor';

        if (!ROLES_PERMITIDOS.includes(rol)) {
            return res.status(400).json({ mensaje: `Rol inválido. Roles permitidos: ${ROLES_PERMITIDOS.join(', ')}` });
        }

        if (!usuario || !contraseña || !nombre) {
            console.log('⚠️ Registro fallido: Faltan campos obligatorios');
            return res.status(400).json({ mensaje: 'Por favor complete todos los campos obligatorios (usuario, contraseña, nombre)' });
        }

        const existe = await db.prepare('SELECT * FROM usuarios WHERE usuario = ?').get(usuario.trim());
        if (existe) {
            console.log('⚠️ Registro fallido: Usuario ya existe:', usuario);
            return res.status(400).json({ mensaje: 'El nombre de usuario ya está en uso' });
        }

        if (email && email.trim()) {
            const emailExiste = await db.prepare('SELECT * FROM usuarios WHERE LOWER(email) = LOWER(?)').get(email.trim());
            if (emailExiste) {
                console.log('⚠️ Registro fallido: Correo ya existe:', email);
                return res.status(400).json({ mensaje: 'El correo electrónico ya está en uso' });
            }
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(contraseña, salt);

        const stmt = await db.prepare('INSERT INTO usuarios (usuario, contraseña, rol, nombre, email, telefono) VALUES (?, ?, ?, ?, ?, ?)');
        const result = await stmt.run(usuario.trim(), hash, rol, nombre.trim(), (email || '').trim(), (telefono || '').trim());

        const nuevoUserId = result.lastInsertRowid;

        // Crear equipo personal automáticamente para el nuevo usuario
        const equipoStmt = await db.prepare('INSERT INTO equipos (nombre, owner_id) VALUES (?, ?)');
        const equipoResult = await equipoStmt.run(`Equipo de ${nombre.trim()}`, nuevoUserId);
        const nuevoEquipoId = equipoResult.lastInsertRowid;

        // Asignar el equipo al usuario
        await db.prepare('UPDATE usuarios SET "equipo_id" = ? WHERE id = ?').run(nuevoEquipoId, nuevoUserId);

        const newUser = await db.prepare('SELECT id, usuario, nombre, rol, email, "equipo_id" FROM usuarios WHERE id = ?').get(nuevoUserId);

        console.log(`✅ Usuario registrado con éxito: ${newUser.usuario} (equipo_id: ${newUser.equipo_id})`);
        
        // Registrar actividad de registro
        try {
            await db.prepare('INSERT INTO actividades (tipo, vendedor, descripcion, resultado) VALUES (?, ?, ?, ?)')
                .run('registro', nuevoUserId, `Nuevo usuario registrado: ${newUser.usuario}`, 'exitoso');
        } catch (actError) {
            console.error('Error al registrar actividad de registro:', actError);
        }

        // Enviar correo de bienvenida si tiene email
        if (newUser.email) {
            try {
                await enviarCorreoBienvenida(newUser.email, newUser.nombre, newUser.usuario, newUser.plan || 'Básico');
            } catch (emailError) {
                console.error('No se pudo enviar el correo de bienvenida:', emailError);
            }
        }

        res.status(201).json({
            mensaje: 'Usuario registrado exitosamente',
            usuario: newUser
        });
    } catch (error) {
        console.error('❌ Error en registro:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

// @route   POST api/auth/demo-login
// @desc    Crear usuario demo temporal y auto-login
// @access  Public
router.post('/demo-login', async (req, res) => {
    try {
        const demoId = `demo_${Date.now().toString().slice(-6)}_${Math.floor(Math.random() * 1000)}`;
        const usuario = demoId;
        const nombre = 'Usuario Demo';
        const rol = 'vendedor';
        const passwordHash = await bcrypt.hash('demo123', 10);

        // Crear usuario
        const stmt = await db.prepare('INSERT INTO usuarios (usuario, contraseña, rol, nombre, activo) VALUES (?, ?, ?, ?, 1)');
        const result = await stmt.run(usuario, passwordHash, rol, nombre);
        const userId = result.lastInsertRowid;

        // Crear equipo
        const equipoStmt = await db.prepare('INSERT INTO equipos (nombre, owner_id) VALUES (?, ?)');
        const equipoResult = await equipoStmt.run(`Equipo Demo`, userId);
        const equipoId = equipoResult.lastInsertRowid;

        // Asignar equipo al usuario
        await db.prepare('UPDATE usuarios SET "equipo_id" = ? WHERE id = ?').run(equipoId, userId);

        // Crear 5 prospectos/clientes de ejemplo
        const prospects = [
            { n: 'Carlos', aP: 'Gómez', aM: 'Pérez', t: '5551112222', c: 'carlos@ejemplo.com', emp: 'Tech Solutions', est: 'proceso', eta: 'prospecto_nuevo' },
            { n: 'María', aP: 'López', aM: 'Díaz', t: '5553334444', c: 'maria@ejemplo.com', emp: 'Innovación SA', est: 'proceso', eta: 'en_contacto' },
            { n: 'Ana', aP: 'Martínez', aM: 'Ruiz', t: '5555556666', c: 'ana@ejemplo.com', emp: 'Consultoría Plus', est: 'proceso', eta: 'reunion_agendada' },
            { n: 'Roberto', aP: 'Sánchez', aM: '', t: '5557778888', c: 'roberto@ejemplo.com', emp: 'Servicios XYZ', est: 'ganado', eta: 'venta_ganada' },
            { n: 'Laura', aP: 'Torres', aM: 'Vega', t: '5559990000', c: 'laura@ejemplo.com', emp: 'Comercializadora Global', est: 'proceso', eta: 'en_negociacion' }
        ];

        const insertClient = await db.prepare(`
            INSERT INTO clientes 
            (nombres, apellidoPaterno, apellidoMaterno, telefono, correo, empresa, estado, etapaEmbudo, vendedorAsignado, prospectorAsignado, "equipo_id", "propietarioId") 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        let primerClienteId = null;
        for (const p of prospects) {
            const clientRes = await insertClient.run(p.n, p.aP, p.aM, p.t, p.c, p.emp, p.est, p.eta, userId, userId, equipoId, userId);
            if (!primerClienteId) primerClienteId = clientRes.lastInsertRowid;
        }

        // Crear una reunión de prueba hoy para el calendario
        if (primerClienteId) {
            // Reunión programada para la próxima hora (en el futuro garantizado)
            const d = new Date();
            d.setHours(d.getHours() + 1);
            d.setMinutes(0, 0, 0);

            await db.prepare(`
                INSERT INTO actividades (tipo, vendedor, cliente, fecha, descripcion, resultado, notas, "googleMeetLink")
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                'cita', 
                userId, 
                primerClienteId, 
                d.toISOString(), 
                'Reunión de Demostración CRM', 
                'pendiente', 
                '¡Pruébame! Haz clic en "Unirse" para ver cómo funcionan las videollamadas con 1 clic.', 
                'https://meet.google.com/ebw-jddj-tuh'
            );
        }

        console.log(`✅ Cuenta Demo creada y login exitoso: ${usuario}`);

        // Crear Token
        const payload = {
            id: userId,
            rol: rol,
            equipo_id: equipoId
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });

        res.json({
            token,
            usuario: {
                id: userId,
                usuario: usuario,
                nombre: nombre,
                rol: rol,
                equipo_id: equipoId
            }
        });

    } catch (error) {
        console.error('❌ Error en demo-login:', error);
        res.status(500).json({ mensaje: 'Error al crear la cuenta demo' });
    }
});

// @route   GET api/auth/me
// @desc    Obtener usuario autenticado
// @access  Private
router.get('/me', auth, async (req, res) => {
    try {
        const user = await db.prepare('SELECT id, usuario, nombre, rol, email, telefono, activo, "equipo_id" FROM usuarios WHERE id = ?').get(req.usuario.id);
        res.json(user);
    } catch (error) {
        console.error('Error en auth/me:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

// ⚠️ TEMPORAL: Ruta de diagnóstico — ELIMINAR después de depurar
router.get('/debug-users', async (req, res) => {
    try {
        const users = await db.prepare('SELECT id, usuario, nombre, rol, email, activo FROM usuarios').all();
        res.json({ total: users.length, usuarios: users });
    } catch (error) {
        console.error('Error en debug-users:', error);
        res.status(500).json({ mensaje: 'Error del servidor', error: error.message });
    }
});

// @route   GET api/auth/validate-availability
// @desc    Verifica si usuario y email están disponibles antes del pago en Stripe
// @access  Public (llamado desde el serverless de Vercel)
router.get('/validate-availability', async (req, res) => {
    try {
        const { usuario, email } = req.query;

        if (!usuario && !email) {
            return res.status(400).json({ mensaje: 'Se requiere usuario o email' });
        }

        const errors = {};

        if (usuario && usuario.trim()) {
            const existe = await db.prepare('SELECT id FROM usuarios WHERE LOWER(usuario) = LOWER(?)').get(usuario.trim());
            if (existe) errors.usuario = 'El nombre de usuario ya está en uso';
        }

        if (email && email.trim()) {
            const existe = await db.prepare('SELECT id FROM usuarios WHERE LOWER(email) = LOWER(?)').get(email.trim());
            if (existe) errors.email = 'El correo electrónico ya está en uso';
        }

        if (Object.keys(errors).length > 0) {
            return res.status(409).json({ disponible: false, errors });
        }

        res.json({ disponible: true });
    } catch (error) {
        console.error('Error en validate-availability:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

// @route   POST api/auth/register-paid
// @desc    Crea cuenta tras pago exitoso de Stripe (solo llamado desde webhook interno)
// @access  Internal — protegido por WEBHOOK_INTERNAL_SECRET
router.post('/register-paid', async (req, res) => {
    try {
        // Verificar secret interno para que solo el webhook de Vercel pueda llamar esto
        const internalSecret = req.headers['x-internal-secret'];
        if (!internalSecret || internalSecret !== process.env.WEBHOOK_INTERNAL_SECRET) {
            console.warn('⛔ Intento no autorizado a /register-paid');
            return res.status(403).json({ mensaje: 'No autorizado' });
        }

        const { usuario, contraseña_hash, nombre, email, telefono, plan, stripe_customer_id, stripe_subscription_id } = req.body;

        if (!usuario || !contraseña_hash || !nombre || !plan) {
            return res.status(400).json({ mensaje: 'Faltan campos obligatorios' });
        }

        // Verificar disponibilidad (por si acaso hubo race condition)
        const usuarioExiste = await db.prepare('SELECT id FROM usuarios WHERE LOWER(usuario) = LOWER(?)').get(usuario.trim());
        if (usuarioExiste) {
            return res.status(409).json({ mensaje: 'El usuario ya existe', code: 'USUARIO_DUPLICADO' });
        }

        if (email && email.trim()) {
            const emailExiste = await db.prepare('SELECT id FROM usuarios WHERE LOWER(email) = LOWER(?)').get(email.trim());
            if (emailExiste) {
                return res.status(409).json({ mensaje: 'El email ya existe', code: 'EMAIL_DUPLICADO' });
            }
        }

        // Determinar max_usuarios según plan
        const maxUsuariosPorPlan = {
            mensual: 2,
            mensual_equipo: 4,
            anual: 2,
        };
        const maxUsuarios = maxUsuariosPorPlan[plan] || 2;

        // Calcular fecha de vencimiento según plan
        const ahora = new Date();
        let planVencimiento;
        if (plan === 'anual') {
            planVencimiento = new Date(ahora.setFullYear(ahora.getFullYear() + 1));
        } else {
            planVencimiento = new Date(ahora.setMonth(ahora.getMonth() + 1));
        }

        // Insertar usuario con plan activo
        const stmt = await db.prepare(`
            INSERT INTO usuarios (usuario, contraseña, rol, nombre, email, telefono, activo,
              stripe_customer_id, stripe_subscription_id, plan, plan_activo, plan_vencimiento, max_usuarios)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, TRUE, ?, ?)
        `);
        const result = await stmt.run(
            usuario.trim(),
            contraseña_hash,
            'vendedor',
            nombre.trim(),
            (email || '').trim(),
            (telefono || '').trim(),
            stripe_customer_id || null,
            stripe_subscription_id || null,
            plan,
            planVencimiento.toISOString(),
            maxUsuarios
        );

        const nuevoUserId = result.lastInsertRowid;

        // Crear equipo personal automáticamente
        const equipoStmt = await db.prepare('INSERT INTO equipos (nombre, owner_id) VALUES (?, ?)');
        const equipoResult = await equipoStmt.run(`Equipo de ${nombre.trim()}`, nuevoUserId);
        const nuevoEquipoId = equipoResult.lastInsertRowid;

        // Asignar equipo al usuario
        await db.prepare('UPDATE usuarios SET "equipo_id" = ? WHERE id = ?').run(nuevoEquipoId, nuevoUserId);

        const newUser = await db.prepare('SELECT id, usuario, nombre, rol, email, "equipo_id", plan, plan_activo FROM usuarios WHERE id = ?').get(nuevoUserId);

        console.log(`✅ Cuenta creada via Stripe para: ${newUser.usuario} (plan: ${plan})`);

        // Registrar actividad
        try {
            await db.prepare('INSERT INTO actividades (tipo, vendedor, descripcion, resultado) VALUES (?, ?, ?, ?)')
                .run('registro', nuevoUserId, `Cuenta creada via pago Stripe — Plan: ${plan}`, 'exitoso');
        } catch (actError) {
            console.error('Error al registrar actividad:', actError);
        }

        // Enviar correo de bienvenida
        if (newUser.email) {
            try {
                await enviarCorreoBienvenida(newUser.email, newUser.nombre, newUser.usuario, newUser.plan);
            } catch (emailError) {
                console.error('No se pudo enviar correo de bienvenida:', emailError);
            }
        }

        res.status(201).json({
            mensaje: 'Cuenta creada exitosamente',
            usuario: newUser
        });
    } catch (error) {
        console.error('❌ Error en register-paid:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

module.exports = router;

