require('dotenv').config();
// Build trigger: 2026-04-23
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Inicializar base de datos
require('./config/database');

const app = express();

// ✅ HEALTHCHECK - FIRST PRIORITY (Railway require 200 fast)
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        uptime: process.uptime(),
        env: process.env.NODE_ENV,
        db_connected: !!process.env.DATABASE_URL
    });
});
console.log('✅ Healthcheck endpoint ready');

// ✅ CORS CONFIGURATION - MUST BE FIRST
app.use(cors({
    origin: '*', // Allows all origins. For production, you might want to restrict this later.
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
    exposedHeaders: ['x-auth-token'],
    credentials: true
}));

// ✅ Google Identity Services Popup Fix
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    next();
});

// Preflight manually handles OPTIONS if needed, but cors middleware usually does it.
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// ✅ Servir archivos subidos (contratos PDF) antes de cualquier otra ruta
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });
app.use('/archivos', express.static(uploadsPath));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/actividades', require('./routes/actividades'));
app.use('/api/ventas', require('./routes/ventas'));
app.use('/api/tareas', require('./routes/tareas'));
app.use('/api/metricas', require('./routes/metricas'));
app.use('/api/embudo', require('./routes/embudo'));
// Rol único: vendedor
app.use('/api/vendedor', require('./routes/vendedor'));
app.use('/api/google', require('./routes/google'));
app.use('/api/equipos', require('./routes/equipos'));
app.use('/api/plantillas', require('./routes/plantillas'));
app.use('/api/documentos', require('./routes/documentos'));
console.log('🚀 Rutas registradas correctamente');


// Ruta de prueba API
app.get('/api', (req, res) => {
    res.json({
        mensaje: '🚀 API CRM Infiniguard SYS funcionando correctamente',
        env: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
    });
});

// Health check (Duplicate for safety, keep original location too)

// ✅ SERVIR ARCHIVOS ESTÁTICOS DEL FRONTEND (React compilado)
const distPath = path.join(__dirname, '../dist');

if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));

    // ✅ FALLBACK PARA SPA REACT - Solo si existe dist
    app.get('*', (req, res) => {
        if (req.path.startsWith('/api')) {
            return res.status(404).json({ mensaje: 'Ruta API no encontrada' });
        }
        res.sendFile(path.join(distPath, 'index.html'));
    });
} else {
    // Si no existe dist (entorno desacoplado como Railway + Vercel)
    // Manejador global para cualquier ruta no encontrada
    app.use((req, res) => {
        if (req.path.startsWith('/api')) {
            return res.status(404).json({ mensaje: `Ruta API no encontrada: ${req.method} ${req.path}` });
        }
        res.json({
            mensaje: '🚀 API CRM Infiniguard SYS - Backend Activo',
            estado: 'El frontend se sirve por separado (Vercel)',
            endpoint_api: '/api'
        });
    });
}

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.message);
    res.status(500).json({
        mensaje: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

const PORT = process.env.PORT || 4000;
const HOST = '0.0.0.0'; // Railway requiere escuchar en 0.0.0.0

const server = app.listen(PORT, HOST, () => {
    console.log(`🚀 Servidor corriendo en ${HOST}:${PORT}`);
    console.log(`📡 Modo: ${process.env.NODE_ENV || 'development'}`);
});

// ✅ INICIALIZAR SOCKET.IO
const { Server } = require('socket.io');
const io = new Server(server, {
    cors: {
        origin: '*', // Permitir desde cualquier frontend
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['x-auth-token']
    }
});

// Guardar io en la app para usarlo en las rutas
app.set('io', io);

io.on('connection', (socket) => {
    console.log(`⚡ Cliente conectado a WebSockets: ${socket.id}`);

    // Unirse a la sala del equipo (el frontend debe emitir este evento tras el login)
    socket.on('join_team', (equipoId) => {
        if (equipoId) {
            socket.join(`team_${equipoId}`);
            console.log(`👥 Socket ${socket.id} unió al equipo: team_${equipoId}`);
        }
    });

    socket.on('leave_team', (equipoId) => {
        if (equipoId) {
            socket.leave(`team_${equipoId}`);
        }
    });

    socket.on('disconnect', () => {
        console.log(`🔌 Cliente desconectado: ${socket.id}`);
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('📴 Recibido SIGTERM, cerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor cerrado');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('📴 Recibido SIGINT, cerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor cerrado');
        process.exit(0);
    });
});

// ✅ ANTI-CRASH: Atrapar cualquier promesa rechazada sin manejar para que el servidor NUNCA se caiga
process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ [unhandledRejection] Promesa rechazada no manejada:');
    console.error('  Reason:', reason?.message || reason);
    // No llamamos process.exit() – el servidor sigue en pie
});

process.on('uncaughtException', (err) => {
    console.error('⚠️ [uncaughtException] Excepción no capturada:');
    console.error('  Error:', err.message);
    console.error('  Stack:', err.stack?.split('\n')[1]);
    // No llamamos process.exit() – el servidor sigue en pie
    // Si en el futuro quieres que algunos errores fatales sí maten el proceso, añade lógica aquí
});
