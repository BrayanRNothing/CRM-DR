const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db } = require('../config/database');
const { auth } = require('../middleware/auth');

const ROLES_PERMITIDOS = ['prospector', 'closer', 'vendedor'];

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
            rol: row.rol
        };

        // Firmar Token
        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '7d' },
            (err, token) => {
                if (err) throw err;
                res.json({
                    token,
                    usuario: {
                        id: row.id,
                        usuario: row.usuario,
                        nombre: row.nombre,
                        rol: row.rol,
                        email: row.email,
                        telefono: row.telefono
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

        if (!rol) rol = 'closer';

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

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(contraseña, salt);

        const stmt = await db.prepare('INSERT INTO usuarios (usuario, contraseña, rol, nombre, email, telefono) VALUES (?, ?, ?, ?, ?, ?)');
        const result = await stmt.run(usuario.trim(), hash, rol, nombre.trim(), (email || '').trim(), (telefono || '').trim());

        const newUser = await db.prepare('SELECT id, usuario, nombre, rol, email FROM usuarios WHERE id = ?').get(result.lastInsertRowid);

        console.log('✅ Usuario registrado con éxito:', newUser.usuario);
        res.status(201).json({
            mensaje: 'Usuario registrado exitosamente',
            usuario: newUser
        });
    } catch (error) {
        console.error('❌ Error en registro:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

// @route   GET api/auth/me
// @desc    Obtener usuario autenticado
// @access  Private
router.get('/me', auth, async (req, res) => {
    try {
        const user = await db.prepare('SELECT id, usuario, nombre, rol, email, telefono, activo FROM usuarios WHERE id = ?').get(req.usuario.id);
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

module.exports = router;
