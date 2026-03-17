require('dotenv').config();
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
    res.json({ mensaje: '🚀 API CRM-DR funcionando correctamente' });
});

// Manejo de errores 404
app.use((req, res) => {
    res.status(404).json({ mensaje: 'Ruta no encontrada' });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📡 Modo: ${process.env.NODE_ENV || 'development'}`);
});
