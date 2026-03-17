require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
require('./config/database'); // Inicializa PostgreSQL

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/actividades', require('./routes/actividades'));
app.use('/api/ventas', require('./routes/ventas'));
app.use('/api/tareas', require('./routes/tareas'));
app.use('/api/metricas', require('./routes/metricas'));
app.use('/api/embudo', require('./routes/embudo'));
app.use('/api/prospector', require('./routes/prospector'));
app.use('/api/closer', require('./routes/closer'));
app.use('/api/closer/prospectors', require('./routes/prospector-monitoring'));

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({ mensaje: '🚀 API CRM Infiniguard SYS funcionando correctamente' });
});

// Manejo de errores 404
app.use((req, res) => {
    res.status(404).json({ mensaje: 'Ruta no encontrada' });
});

const pool = require('./config/database');
const bcrypt = require('bcryptjs');

const autoSeed = async () => {
    try {
        const { rows } = await pool.query('SELECT COUNT(*) as total FROM usuarios');
        if (parseInt(rows[0].total) > 0) return; // Ya hay usuarios, no hace falta

        const hashProspector = await bcrypt.hash('prospector123', 10);
        const hashCloser = await bcrypt.hash('closer123', 10);

        await pool.query(
            `INSERT INTO usuarios (usuario, "contraseña", rol, nombre, email, telefono) VALUES ($1, $2, $3, $4, $5, $6)`,
            ['prospector', hashProspector, 'prospector', 'Alex Mendoza', 'prospector@crm.com', '5554444444']
        );
        await pool.query(
            `INSERT INTO usuarios (usuario, "contraseña", rol, nombre, email, telefono) VALUES ($1, $2, $3, $4, $5, $6)`,
            ['closer', hashCloser, 'closer', 'Fernando Ruiz', 'closer@crm.com', '5555555555']
        );

        console.log('🌱 Cuentas por defecto creadas:');
        console.log('   prospector / prospector123');
        console.log('   closer     / closer123');
    } catch (err) {
        console.error('⚠️  Auto-seed error:', err.message);
    }
};

const PORT = process.env.PORT || 4000;

app.listen(PORT, async () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📡 Modo: ${process.env.NODE_ENV || 'development'}`);
    await autoSeed();
});

