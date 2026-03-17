#!/usr/bin/env node

/**
 * Script para limpiar y reinicializar la base de datos
 * Usa: node backend/cleanup_db.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const isProd = process.env.NODE_ENV === 'production';

async function cleanDatabase() {
    if (!isProd || !process.env.DATABASE_URL) {
        console.log('⚠️ Este script solo funciona con PostgreSQL en producción');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🧹 Limpiando base de datos de Railway...');
        
        // 1. Eliminar todas las tablas
        console.log('🗑️ Eliminando tablas existentes...');
        const dropSQL = `
            DROP TABLE IF EXISTS ventas CASCADE;
            DROP TABLE IF EXISTS tareas CASCADE;
            DROP TABLE IF EXISTS actividades CASCADE;
            DROP TABLE IF EXISTS clientes CASCADE;
            DROP TABLE IF EXISTS usuarios CASCADE;
        `;

        const dropStatements = dropSQL.split(';').filter(s => s.trim());
        for (const statement of dropStatements) {
            await pool.query(statement);
        }
        console.log('✅ Tablas eliminadas');

        // 2. Recrear schema limpio
        console.log('🔨 Recreando schema...');
        const createTablesSQL = `
            CREATE TABLE usuarios (
                id SERIAL PRIMARY KEY,
                usuario TEXT UNIQUE NOT NULL,
                contraseña TEXT NOT NULL,
                rol TEXT NOT NULL CHECK(rol IN ('prospector','closer','admin')),
                nombre TEXT NOT NULL,
                email TEXT UNIQUE,
                telefono TEXT,
                activo INTEGER DEFAULT 1,
                fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                googleRefreshToken TEXT,
                googleAccessToken TEXT,
                googleTokenExpiry DOUBLE PRECISION
            );

            CREATE TABLE clientes (
                id SERIAL PRIMARY KEY,
                nombres TEXT NOT NULL,
                apellidoPaterno TEXT NOT NULL,
                apellidoMaterno TEXT,
                telefono TEXT NOT NULL,
                correo TEXT NOT NULL,
                empresa TEXT,
                estado TEXT DEFAULT 'proceso' CHECK(estado IN ('ganado','perdido','proceso')),
                etapaEmbudo TEXT DEFAULT 'prospecto_nuevo',
                prospectorAsignado INTEGER REFERENCES usuarios(id),
                closerAsignado INTEGER REFERENCES usuarios(id),
                fechaTransferencia TIMESTAMP,
                fechaUltimaEtapa TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                historialEmbudo TEXT,
                vendedorAsignado INTEGER NOT NULL REFERENCES usuarios(id),
                fechaRegistro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ultimaInteraccion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                notas TEXT,
                interes INTEGER DEFAULT 0,
                proximaLlamada TIMESTAMP
            );

            CREATE TABLE actividades (
                id SERIAL PRIMARY KEY,
                tipo TEXT NOT NULL CHECK(tipo IN ('llamada','reunion','email','whatsapp','otro')),
                resultado TEXT,
                cliente INTEGER NOT NULL REFERENCES clientes(id),
                usuario INTEGER NOT NULL REFERENCES usuarios(id),
                descripcion TEXT,
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                duracion INTEGER
            );

            CREATE TABLE tareas (
                id SERIAL PRIMARY KEY,
                descripcion TEXT NOT NULL,
                estado TEXT DEFAULT 'pendiente' CHECK(estado IN ('pendiente','completada','cancelada')),
                cliente INTEGER REFERENCES clientes(id),
                usuario INTEGER NOT NULL REFERENCES usuarios(id),
                fechaAsignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                fechaVencimiento TIMESTAMP,
                fechaCompletacion TIMESTAMP,
                prioridad TEXT DEFAULT 'normal' CHECK(prioridad IN ('baja','normal','alta','urgente'))
            );

            CREATE TABLE ventas (
                id SERIAL PRIMARY KEY,
                cliente INTEGER NOT NULL REFERENCES clientes(id),
                monto DECIMAL(12, 2),
                estado TEXT DEFAULT 'abierta' CHECK(estado IN ('abierta','ganada','perdida')),
                fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                fechaCierre TIMESTAMP,
                usuario INTEGER NOT NULL REFERENCES usuarios(id),
                descripcion TEXT
            );

            CREATE INDEX idx_clientes_prospector ON clientes(prospectorAsignado);
            CREATE INDEX idx_clientes_closer ON clientes(closerAsignado);
            CREATE INDEX idx_actividades_cliente ON actividades(cliente);
            CREATE INDEX idx_actividades_usuario ON actividades(usuario);
            CREATE INDEX idx_tareas_usuario ON tareas(usuario);
            CREATE INDEX idx_ventas_usuario ON ventas(usuario);
        `;

        const createStatements = createTablesSQL.split(';').filter(s => s.trim());
        for (const statement of createStatements) {
            await pool.query(statement);
        }
        console.log('✅ Schema recreado');

        // 3. Crear usuarios de prueba
        console.log('👤 Creando usuarios de prueba...');
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        
        const usuarios = [
            {
                usuario: 'prospector',
                contraseña: await bcrypt.hash('prospector', salt),
                rol: 'prospector',
                nombre: 'Usuario Prospector',
                email: 'prospector@test.com'
            },
            {
                usuario: 'closer',
                contraseña: await bcrypt.hash('closer', salt),
                rol: 'closer',
                nombre: 'Usuario Closer',
                email: 'closer@test.com'
            },
            {
                usuario: 'admin',
                contraseña: await bcrypt.hash('admin123', salt),
                rol: 'admin',
                nombre: 'Administrador',
                email: 'admin@test.com'
            }
        ];

        for (const user of usuarios) {
            await pool.query(
                'INSERT INTO usuarios (usuario, contraseña, rol, nombre, email) VALUES ($1, $2, $3, $4, $5)',
                [user.usuario, user.contraseña, user.rol, user.nombre, user.email]
            );
        }
        console.log('✅ Usuarios de prueba creados');

        console.log('\n🎉 Base de datos limpiada y reinicializada exitosamente');
        console.log('\n📝 Credenciales de prueba:');
        console.log('   • prospector / prospector');
        console.log('   • closer / closer');
        console.log('   • admin / admin123');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

cleanDatabase();
