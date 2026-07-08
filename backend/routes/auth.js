const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db } = require('../config/database');
const { auth } = require('../middleware/auth');
const { enviarCorreoBienvenida, enviarCorreoRenovacion, enviarCorreoCancelacion } = require('../services/emailService');
const rateLimit = require('express-rate-limit');

const ROLES_PERMITIDOS = ['vendedor'];

// Rate Limiter para el login: Máximo 5 intentos por IP en 15 minutos
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // Limita cada IP a 5 peticiones por ventana de tiempo
    message: { mensaje: 'Demasiados intentos de inicio de sesión. Por favor, inténtelo de nuevo después de 15 minutos.' },
    standardHeaders: true, // Retorna rate limit info en los headers `RateLimit-*`
    legacyHeaders: false, // Deshabilita los headers `X-RateLimit-*`
});

// @route   POST api/auth/login
// @desc    Autenticar usuario y obtener token
// @access  Public
router.post('/login', loginLimiter, async (req, res) => {
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
        res.status(500).json({ mensaje: `Error del servidor: ${error?.message || error}` });
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
                await enviarCorreoBienvenida(newUser.email, newUser.nombre, newUser.usuario, contraseña, newUser.plan || 'Básico');
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
        res.status(500).json({ mensaje: `Error del servidor: ${error?.message || error}` });
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
        const user = await db.prepare('SELECT id, usuario, nombre, rol, email, telefono, activo, "equipo_id", plan_activo, plan_vencimiento, plan, stripe_customer_id FROM usuarios WHERE id = ?').get(req.usuario.id);
        
        if (user && user.equipo_id) {
            const equipo = await db.prepare('SELECT owner_id FROM equipos WHERE id = ?').get(user.equipo_id);
            if (equipo && equipo.owner_id !== user.id) {
                const owner = await db.prepare('SELECT plan_activo, plan_vencimiento, plan, stripe_customer_id FROM usuarios WHERE id = ?').get(equipo.owner_id);
                if (owner) {
                    user.plan_activo = owner.plan_activo;
                    user.plan_vencimiento = owner.plan_vencimiento;
                    user.plan = owner.plan;
                    // Algunos módulos pueden depender de tener un stripe_customer_id aunque no sea el de ellos
                    // user.stripe_customer_id = owner.stripe_customer_id; 
                }
            }
        }
        
        res.json(user);
    } catch (error) {
        console.error('Error en auth/me:', error);
        res.status(500).json({ mensaje: `Error del servidor: ${error?.message || error}` });
    }
});

// ⚠️ TEMPORAL: Ruta de diagnóstico — ELIMINAR después de depurar
router.get('/debug-users', async (req, res) => {
    try {
        const users = await db.prepare('SELECT id, usuario, nombre, rol, email, activo FROM usuarios').all();
        res.json({ total: users.length, usuarios: users });
    } catch (error) {
        console.error('Error en debug-users:', error);
        res.status(500).json({ mensaje: `Error del servidor: ${error?.message || error}`, error: error.message });
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
        res.status(500).json({ mensaje: `Error del servidor: ${error?.message || error}` });
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

        const { usuario, contraseña_hash, contraseña_plana, nombre, email, telefono, plan, stripe_customer_id, stripe_subscription_id, is_renewal } = req.body;

        if (is_renewal) {
            if (!usuario || !plan) return res.status(400).json({ mensaje: 'Faltan campos para renovación' });
            const existingUser = await db.prepare('SELECT id, email, nombre FROM usuarios WHERE LOWER(usuario) = LOWER(?)').get(usuario.trim());
            if (!existingUser) return res.status(404).json({ mensaje: 'Usuario no encontrado para renovar' });

            // El plan vuelve a estar activo. Stripe enviará el plan_vencimiento más tarde vía el webhook customer.subscription.updated
            // Pero por ahora lo marcamos como activo.
            await db.prepare('UPDATE usuarios SET plan = ?, plan_activo = TRUE, stripe_customer_id = ?, stripe_subscription_id = ? WHERE id = ?').run(
                plan, stripe_customer_id, stripe_subscription_id, existingUser.id
            );

            // Enviar correo de renovación
            if (existingUser.email) {
                try {
                    await enviarCorreoRenovacion(existingUser.email, existingUser.nombre, plan);
                } catch (emailErr) {
                    console.error('Error enviando correo de renovación:', emailErr);
                }
            }

            return res.json({ mensaje: 'Renovación procesada' });
        }

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
                const passEmail = contraseña_plana || 'La contraseña que elegiste en el pago';
                await enviarCorreoBienvenida(newUser.email, newUser.nombre, newUser.usuario, passEmail, newUser.plan);
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
        res.status(500).json({ mensaje: `Error del servidor: ${error?.message || error}` });
    }
});


// @route   POST api/auth/suspend-subscription
// @desc    Inicia periodo de gracia (3 días) cuando Stripe cancela/pausa una suscripcion
// @access  Internal — protegido por WEBHOOK_INTERNAL_SECRET
router.post('/suspend-subscription', async (req, res) => {
    try {
        const internalSecret = req.headers['x-internal-secret'];
        if (!internalSecret || internalSecret !== process.env.WEBHOOK_INTERNAL_SECRET) {
            console.warn('⛔ Intento no autorizado a /suspend-subscription');
            return res.status(403).json({ mensaje: 'No autorizado' });
        }

        const { stripe_subscription_id, stripe_customer_id, action } = req.body;
        // action: 'suspend' (inicia gracia) | 'reactivate' (reactiva plan)

        if (!stripe_subscription_id && !stripe_customer_id) {
            return res.status(400).json({ mensaje: 'Se requiere stripe_subscription_id o stripe_customer_id' });
        }

        let usuario;
        if (stripe_subscription_id) {
            usuario = await db.prepare('SELECT id, usuario, email, nombre FROM usuarios WHERE stripe_subscription_id = ?').get(stripe_subscription_id);
        }
        if (!usuario && stripe_customer_id) {
            usuario = await db.prepare('SELECT id, usuario, email, nombre FROM usuarios WHERE stripe_customer_id = ?').get(stripe_customer_id);
        }

        if (!usuario) {
            console.warn(`⚠️ /suspend-subscription: No se encontró usuario con sub_id=${stripe_subscription_id} o cus_id=${stripe_customer_id}`);
            return res.status(200).json({ mensaje: 'Usuario no encontrado, ignorado' });
        }

        let accion;
        if (action === 'reactivate') {
            // Reactivar completamente: plan activo, sin vencimiento inmediato
            await db.prepare('UPDATE usuarios SET plan_activo = TRUE WHERE id = ?').run(usuario.id);
            accion = 'Cuenta reactivada';
        } else {
            // Iniciar periodo de gracia: plan_activo=false, plan_vencimiento=ahora+3días, activo sigue en 1
            const graciaHasta = new Date(Date.now() + (3 * 24 * 60 * 60 * 1000));
            await db.prepare('UPDATE usuarios SET plan_activo = FALSE, plan_vencimiento = ? WHERE id = ?')
                .run(graciaHasta.toISOString(), usuario.id);
            accion = `Periodo de gracia iniciado (hasta ${graciaHasta.toDateString()})`;
            
            // Enviar correo indicando problema / cancelación / gracia
            if (usuario.email) {
                try {
                    await enviarCorreoCancelacion(usuario.email, usuario.nombre, true);
                } catch (emailErr) {
                    console.error('Error enviando correo de cancelación/gracia:', emailErr);
                }
            }
        }

        console.log(`✅ ${accion} para usuario: ${usuario.usuario} (id: ${usuario.id})`);

        try {
            await db.prepare('INSERT INTO actividades (tipo, vendedor, descripcion, resultado) VALUES (?, ?, ?, ?)')
                .run('registro', usuario.id, `${accion} via Stripe webhook`, 'exitoso');
        } catch (actError) {
            console.error('Error registrando actividad de suspensión:', actError);
        }

        res.json({ mensaje: `${accion} exitosamente`, usuario: usuario.usuario });
    } catch (error) {
        console.error('❌ Error en /suspend-subscription:', error);
        res.status(500).json({ mensaje: `Error del servidor: ${error?.message || error}` });
    }
});

// @route   POST api/auth/update-subscription
// @desc    Actualiza el plan, estado y fechas de vencimiento cuando cambia la suscripcion en Stripe
// @access  Internal — protegido por WEBHOOK_INTERNAL_SECRET
router.post('/update-subscription', async (req, res) => {
    try {
        const internalSecret = req.headers['x-internal-secret'];
        if (!internalSecret || internalSecret !== process.env.WEBHOOK_INTERNAL_SECRET) {
            console.warn('⛔ Intento no autorizado a /update-subscription');
            return res.status(403).json({ mensaje: 'No autorizado' });
        }

        const {
            stripe_subscription_id,
            stripe_customer_id,
            status,          // 'active' | 'past_due' | 'canceled' | 'paused' | 'unpaid'
            plan,            // opcional — si el plan cambió (mensual, anual, mensual_equipo)
            plan_vencimiento // opcional — nueva fecha de vencimiento ISO string
        } = req.body;

        if (!stripe_subscription_id && !stripe_customer_id) {
            return res.status(400).json({ mensaje: 'Se requiere stripe_subscription_id o stripe_customer_id' });
        }

        let usuario;
        if (stripe_subscription_id) {
            usuario = await db.prepare('SELECT id, usuario, email, nombre, plan FROM usuarios WHERE stripe_subscription_id = ?').get(stripe_subscription_id);
        }
        if (!usuario && stripe_customer_id) {
            usuario = await db.prepare('SELECT id, usuario, email, nombre, plan FROM usuarios WHERE stripe_customer_id = ?').get(stripe_customer_id);
        }

        if (!usuario) {
            console.warn(`⚠️ /update-subscription: No se encontró usuario con sub_id=${stripe_subscription_id} o cus_id=${stripe_customer_id}`);
            return res.status(200).json({ mensaje: 'Usuario no encontrado, ignorado' });
        }

        // Determinar si la cuenta debe estar activa según el status de Stripe
        const estaActivo = ['active', 'trialing'].includes(status) ? true : false;
        const planActivo = estaActivo;

        // Construir SET dinámicamente según qué campos llegaron
        const updates = ['activo = ?', 'plan_activo = ?'];
        const params = [estaActivo, planActivo];

        if (plan && plan !== usuario.plan) {
            updates.push('plan = ?');
            params.push(plan);

            // Actualizar max_usuarios según nuevo plan
            const maxUsuariosPorPlan = { mensual: 2, mensual_equipo: 4, anual: 2 };
            const maxUsuarios = maxUsuariosPorPlan[plan] || 2;
            updates.push('max_usuarios = ?');
            params.push(maxUsuarios);
        }

        if (plan_vencimiento) {
            updates.push('plan_vencimiento = ?');
            params.push(plan_vencimiento);
        }

        params.push(usuario.id);
        await db.prepare(`UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`).run(...params);

        const planFinal = plan || usuario.plan;
        console.log(`✅ Suscripción actualizada para ${usuario.usuario}: status=${status}, plan=${planFinal}, activo=${estaActivo}`);

        try {
            await db.prepare('INSERT INTO actividades (tipo, vendedor, descripcion, resultado) VALUES (?, ?, ?, ?)')
                .run('registro', usuario.id, `Suscripción actualizada via Stripe — status: ${status}, plan: ${planFinal}`, 'exitoso');
        } catch (actError) {
            console.error('Error registrando actividad de actualización:', actError);
        }

        res.json({ mensaje: 'Suscripción actualizada exitosamente', usuario: usuario.usuario, status, plan: planFinal });
    } catch (error) {
        console.error('❌ Error en /update-subscription:', error);
        res.status(500).json({ mensaje: `Error del servidor: ${error?.message || error}` });
    }
});

// @route   POST api/auth/billing-portal
// @desc    Genera una sesión del Portal de Cliente de Stripe para gestionar suscripción
// @access  Private (requiere JWT del usuario autenticado)
router.post('/billing-portal', async (req, res) => {
    try {
        // Verificar token (reutilizamos lógica directa aquí para no depender del middleware)
        const jwt = require('jsonwebtoken');
        const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ mensaje: 'No autenticado' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

        // Buscar usuario y su stripe_customer_id
        const usuario = await db.prepare(
            'SELECT id, usuario, email, stripe_customer_id FROM usuarios WHERE id = ?'
        ).get(decoded.id);

        if (!usuario) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

        if (!usuario.stripe_customer_id) {
            return res.status(400).json({
                mensaje: 'Tu cuenta no tiene una suscripción de Stripe asociada.',
                code: 'NO_STRIPE_CUSTOMER'
            });
        }

        // Importar Stripe dinámicamente (es un paquete server-side)
        const Stripe = require('stripe');
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

        const returnUrl = process.env.CRM_URL
            ? `${process.env.CRM_URL}/configuracion`
            : 'https://app.solomycrm.com/configuracion';

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: usuario.stripe_customer_id,
            return_url: returnUrl,
        });

        console.log(`✅ Portal de facturación generado para: ${usuario.usuario}`);
        res.json({ url: portalSession.url });

    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ mensaje: 'Sesión inválida o expirada' });
        }
        console.error('❌ Error en register-paid:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});


// @route   POST api/auth/suspend-subscription
// @desc    Inicia periodo de gracia (3 días) cuando Stripe cancela/pausa una suscripcion
// @access  Internal — protegido por WEBHOOK_INTERNAL_SECRET
router.post('/suspend-subscription', async (req, res) => {
    try {
        const internalSecret = req.headers['x-internal-secret'];
        if (!internalSecret || internalSecret !== process.env.WEBHOOK_INTERNAL_SECRET) {
            console.warn('⛔ Intento no autorizado a /suspend-subscription');
            return res.status(403).json({ mensaje: 'No autorizado' });
        }

        const { stripe_subscription_id, stripe_customer_id, action } = req.body;
        // action: 'suspend' (inicia gracia) | 'reactivate' (reactiva plan)

        if (!stripe_subscription_id && !stripe_customer_id) {
            return res.status(400).json({ mensaje: 'Se requiere stripe_subscription_id o stripe_customer_id' });
        }

        let usuario;
        if (stripe_subscription_id) {
            usuario = await db.prepare('SELECT id, usuario, email, nombre FROM usuarios WHERE stripe_subscription_id = ?').get(stripe_subscription_id);
        }
        if (!usuario && stripe_customer_id) {
            usuario = await db.prepare('SELECT id, usuario, email, nombre FROM usuarios WHERE stripe_customer_id = ?').get(stripe_customer_id);
        }

        if (!usuario) {
            console.warn(`⚠️ /suspend-subscription: No se encontró usuario con sub_id=${stripe_subscription_id} o cus_id=${stripe_customer_id}`);
            return res.status(200).json({ mensaje: 'Usuario no encontrado, ignorado' });
        }

        let accion;
        if (action === 'reactivate') {
            // Reactivar completamente: plan activo, sin vencimiento inmediato
            await db.prepare('UPDATE usuarios SET plan_activo = TRUE WHERE id = ?').run(usuario.id);
            accion = 'Cuenta reactivada';
        } else {
            // Iniciar periodo de gracia: plan_activo=false, plan_vencimiento=ahora+3días, activo sigue en 1
            const graciaHasta = new Date(Date.now() + (3 * 24 * 60 * 60 * 1000));
            await db.prepare('UPDATE usuarios SET plan_activo = FALSE, plan_vencimiento = ? WHERE id = ?')
                .run(graciaHasta.toISOString(), usuario.id);
            accion = `Periodo de gracia iniciado (hasta ${graciaHasta.toDateString()})`;
        }

        console.log(`✅ ${accion} para usuario: ${usuario.usuario} (id: ${usuario.id})`);

        try {
            await db.prepare('INSERT INTO actividades (tipo, vendedor, descripcion, resultado) VALUES (?, ?, ?, ?)')
                .run('registro', usuario.id, `${accion} via Stripe webhook`, 'exitoso');
        } catch (actError) {
            console.error('Error registrando actividad de suspensión:', actError);
        }

        res.json({ mensaje: `${accion} exitosamente`, usuario: usuario.usuario });
    } catch (error) {
        console.error('❌ Error en /suspend-subscription:', error);
        res.status(500).json({ mensaje: `Error del servidor: ${error?.message || error}` });
    }
});

// @route   POST api/auth/renew-subscription
// @desc    Disparado cuando Stripe emite invoice.paid (renovación de ciclo)
// @access  Internal — protegido por WEBHOOK_INTERNAL_SECRET
router.post('/renew-subscription', async (req, res) => {
    try {
        const internalSecret = req.headers['x-internal-secret'];
        if (!internalSecret || internalSecret !== process.env.WEBHOOK_INTERNAL_SECRET) {
            console.warn('⛔ Intento no autorizado a /renew-subscription');
            return res.status(403).json({ mensaje: 'No autorizado' });
        }

        const { stripe_subscription_id, stripe_customer_id } = req.body;

        let usuario;
        if (stripe_subscription_id) {
            usuario = await db.prepare('SELECT id, usuario, email, nombre, plan FROM usuarios WHERE stripe_subscription_id = ?').get(stripe_subscription_id);
        }
        if (!usuario && stripe_customer_id) {
            usuario = await db.prepare('SELECT id, usuario, email, nombre, plan FROM usuarios WHERE stripe_customer_id = ?').get(stripe_customer_id);
        }

        if (!usuario) {
            return res.status(200).json({ mensaje: 'Usuario no encontrado' });
        }

        // Asegurar plan activo (aunque ya lo hace update-subscription)
        await db.prepare('UPDATE usuarios SET plan_activo = TRUE WHERE id = ?').run(usuario.id);

        try {
            await db.prepare('INSERT INTO actividades (tipo, vendedor, descripcion, resultado) VALUES (?, ?, ?, ?)')
                .run('registro', usuario.id, `Renovación de suscripción exitosa (${usuario.plan})`, 'exitoso');
        } catch (actError) {}

        // Enviar correo de renovación
        try {
            await enviarCorreoRenovacion(usuario.email, usuario.nombre, usuario.plan);
        } catch (e) {
            console.error('Error enviando correo de renovación:', e);
        }

        console.log(`✅ Renovación procesada y correo enviado para: ${usuario.usuario}`);
        res.json({ mensaje: 'Renovación procesada', usuario: usuario.usuario });
    } catch (error) {
        console.error('❌ Error en /renew-subscription:', error);
        res.status(500).json({ mensaje: `Error del servidor: ${error?.message || error}` });
    }
});

// @route   POST api/auth/update-subscription
// @desc    Actualiza el plan, estado y fechas de vencimiento cuando cambia la suscripcion en Stripe
// @access  Internal — protegido por WEBHOOK_INTERNAL_SECRET
router.post('/update-subscription', async (req, res) => {
    try {
        const internalSecret = req.headers['x-internal-secret'];
        if (!internalSecret || internalSecret !== process.env.WEBHOOK_INTERNAL_SECRET) {
            console.warn('⛔ Intento no autorizado a /update-subscription');
            return res.status(403).json({ mensaje: 'No autorizado' });
        }

        const {
            stripe_subscription_id,
            stripe_customer_id,
            status,          // 'active' | 'past_due' | 'canceled' | 'paused' | 'unpaid'
            plan,            // opcional — si el plan cambió (mensual, anual, mensual_equipo)
            plan_vencimiento // opcional — nueva fecha de vencimiento ISO string
        } = req.body;

        if (!stripe_subscription_id && !stripe_customer_id) {
            return res.status(400).json({ mensaje: 'Se requiere stripe_subscription_id o stripe_customer_id' });
        }

        let usuario;
        if (stripe_subscription_id) {
            usuario = await db.prepare('SELECT id, usuario, email, nombre, plan FROM usuarios WHERE stripe_subscription_id = ?').get(stripe_subscription_id);
        }
        if (!usuario && stripe_customer_id) {
            usuario = await db.prepare('SELECT id, usuario, email, nombre, plan FROM usuarios WHERE stripe_customer_id = ?').get(stripe_customer_id);
        }

        if (!usuario) {
            console.warn(`⚠️ /update-subscription: No se encontró usuario con sub_id=${stripe_subscription_id} o cus_id=${stripe_customer_id}`);
            return res.status(200).json({ mensaje: 'Usuario no encontrado, ignorado' });
        }

        // Determinar si la cuenta debe estar activa según el status de Stripe
        const estaActivo = ['active', 'trialing'].includes(status) ? true : false;
        const planActivo = estaActivo;

        // Construir SET dinámicamente según qué campos llegaron
        const updates = ['activo = ?', 'plan_activo = ?'];
        const params = [estaActivo, planActivo];

        if (plan && plan !== usuario.plan) {
            updates.push('plan = ?');
            params.push(plan);

            // Actualizar max_usuarios según nuevo plan
            const maxUsuariosPorPlan = { mensual: 2, mensual_equipo: 4, anual: 2 };
            const maxUsuarios = maxUsuariosPorPlan[plan] || 2;
            updates.push('max_usuarios = ?');
            params.push(maxUsuarios);
        }

        if (plan_vencimiento) {
            updates.push('plan_vencimiento = ?');
            params.push(plan_vencimiento);
        }

        params.push(usuario.id);
        await db.prepare(`UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`).run(...params);

        const planFinal = plan || usuario.plan;
        console.log(`✅ Suscripción actualizada para ${usuario.usuario}: status=${status}, plan=${planFinal}, activo=${estaActivo}`);

        try {
            await db.prepare('INSERT INTO actividades (tipo, vendedor, descripcion, resultado) VALUES (?, ?, ?, ?)')
                .run('registro', usuario.id, `Suscripción actualizada via Stripe — status: ${status}, plan: ${planFinal}`, 'exitoso');
        } catch (actError) {
            console.error('Error registrando actividad de actualización:', actError);
        }

        res.json({ mensaje: 'Suscripción actualizada exitosamente', usuario: usuario.usuario, status, plan: planFinal });
    } catch (error) {
        console.error('❌ Error en /update-subscription:', error);
        res.status(500).json({ mensaje: `Error del servidor: ${error?.message || error}` });
    }
});

// @route   POST api/auth/billing-portal
// @desc    Genera una sesión del Portal de Cliente de Stripe para gestionar suscripción
// @access  Private (requiere JWT del usuario autenticado)
router.post('/billing-portal', async (req, res) => {
    try {
        // Verificar token (reutilizamos lógica directa aquí para no depender del middleware)
        const jwt = require('jsonwebtoken');
        const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ mensaje: 'No autenticado' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

        // Buscar usuario y su stripe_customer_id
        const usuario = await db.prepare(
            'SELECT id, usuario, email, stripe_customer_id FROM usuarios WHERE id = ?'
        ).get(decoded.id);

        if (!usuario) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

        if (!usuario.stripe_customer_id) {
            return res.status(400).json({
                mensaje: 'Tu cuenta no tiene una suscripción de Stripe asociada.',
                code: 'NO_STRIPE_CUSTOMER'
            });
        }

        // Importar Stripe dinámicamente (es un paquete server-side)
        const Stripe = require('stripe');
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

        const returnUrl = process.env.CRM_URL
            ? `${process.env.CRM_URL}/vendedor/ajustes`
            : 'https://app.solomycrm.com/vendedor/ajustes';

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: usuario.stripe_customer_id,
            return_url: returnUrl,
        });

        console.log(`✅ Portal de facturación generado para: ${usuario.usuario}`);
        res.json({ url: portalSession.url });

    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ mensaje: 'Sesión inválida o expirada' });
        }
        console.error('❌ Error en /billing-portal:', error);
        res.status(500).json({ mensaje: 'Error al generar el portal de facturación' });
    }
});

// @route   POST api/auth/create-renewal-checkout
// @desc    Genera una sesión de Checkout de Stripe para reactivar una suscripción expirada
// @access  Private (requiere JWT)
router.post('/create-renewal-checkout', async (req, res) => {
    try {
        const jwt = require('jsonwebtoken');
        const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ mensaje: 'No autenticado' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

        const usuario = await db.prepare(
            'SELECT id, usuario, email, plan, stripe_customer_id FROM usuarios WHERE id = ?'
        ).get(decoded.id);

        if (!usuario) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

        const Stripe = require('stripe');
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

        // Precios por defecto si no mandan uno
        const PLAN_PRICES = {
            'mensual': process.env.STRIPE_PRICE_MENSUAL || 'price_1Tp9yNPKUtOAyTecD3XfVORb',
            'mensual_equipo': process.env.STRIPE_PRICE_MENSUAL_EQUIPO || 'price_1Tp9yNPKUtOAyTecD3XfVORb', // fallback a mensual si no existe
            'anual': process.env.STRIPE_PRICE_ANUAL || 'price_1TpA70PKUtOAyTecTHMTUmfy',
        };

        const planDeseado = req.body.plan || usuario.plan || 'mensual';
        const priceId = PLAN_PRICES[planDeseado] || PLAN_PRICES['mensual'];

        if (!priceId) {
            return res.status(400).json({ mensaje: 'Plan no válido' });
        }

        const returnUrl = process.env.CRM_URL || 'https://app.solomycrm.com';

        // Opciones del checkout
        const sessionConfig = {
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${returnUrl}/vendedor`,
            cancel_url: `${returnUrl}/vendedor`,
            locale: 'es',
            metadata: {
                usuario: usuario.usuario || "",
                email: usuario.email || "",
                plan: planDeseado || "",
                is_renewal: "true"
            }
        };

        // Si tiene un customer en Stripe, usamos ese mismo para no duplicar
        if (usuario.stripe_customer_id) {
            sessionConfig.customer = usuario.stripe_customer_id;
        } else if (usuario.email) {
            sessionConfig.customer_email = usuario.email;
        }

        const session = await stripe.checkout.sessions.create(sessionConfig);

        console.log(`✅ Checkout de reactivación generado para: ${usuario.usuario}`);
        res.json({ url: session.url });

    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ mensaje: 'Sesión inválida o expirada' });
        }
        console.error('❌ Error en /create-renewal-checkout:', error);
        res.status(500).json({ mensaje: 'Error del servidor al crear checkout' });
    }
});

module.exports = router;
