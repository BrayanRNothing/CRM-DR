/**
 * Migration: Add performance indexes
 * Run once to add indexes that make queries fast.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const indexes = [
    // clientes
    'CREATE INDEX IF NOT EXISTS idx_clientes_prospector ON clientes ("prospectorAsignado")',
    'CREATE INDEX IF NOT EXISTS idx_clientes_closer ON clientes ("closerAsignado")',
    'CREATE INDEX IF NOT EXISTS idx_clientes_vendedor ON clientes ("vendedorAsignado")',
    'CREATE INDEX IF NOT EXISTS idx_clientes_propietario ON clientes ("propietarioId")',
    'CREATE INDEX IF NOT EXISTS idx_clientes_equipo ON clientes (equipo_id)',
    'CREATE INDEX IF NOT EXISTS idx_clientes_etapa ON clientes ("etapaEmbudo")',
    'CREATE INDEX IF NOT EXISTS idx_clientes_estado ON clientes (estado)',
    // actividades
    'CREATE INDEX IF NOT EXISTS idx_actividades_vendedor ON actividades (vendedor)',
    'CREATE INDEX IF NOT EXISTS idx_actividades_cliente ON actividades (cliente)',
    'CREATE INDEX IF NOT EXISTS idx_actividades_tipo ON actividades (tipo)',
    'CREATE INDEX IF NOT EXISTS idx_actividades_vendedor_tipo ON actividades (vendedor, tipo)',
    'CREATE INDEX IF NOT EXISTS idx_actividades_equipo ON actividades (equipo_id)',
    'CREATE INDEX IF NOT EXISTS idx_actividades_fecha ON actividades (fecha)',
    'CREATE INDEX IF NOT EXISTS idx_actividades_created ON actividades ("createdAt")',
    // tareas
    'CREATE INDEX IF NOT EXISTS idx_tareas_vendedor ON tareas (vendedor)',
    'CREATE INDEX IF NOT EXISTS idx_tareas_equipo ON tareas (equipo_id)',
    'CREATE INDEX IF NOT EXISTS idx_tareas_cliente ON tareas (cliente)',
    'CREATE INDEX IF NOT EXISTS idx_tareas_estado ON tareas (estado)',
    // ventas
    'CREATE INDEX IF NOT EXISTS idx_ventas_vendedor ON ventas (vendedor)',
    'CREATE INDEX IF NOT EXISTS idx_ventas_cliente ON ventas (cliente)',
    // usuarios
    'CREATE INDEX IF NOT EXISTS idx_usuarios_equipo ON usuarios (equipo_id)',
    'CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios (rol)',
];

async function run() {
    console.log('🚀 Creando índices...');
    for (const sql of indexes) {
        try {
            await pool.query(sql);
            const name = sql.match(/idx_\w+/)?.[0] || '?';
            console.log(`  ✅ ${name}`);
        } catch (e) {
            console.error(`  ❌ Error: ${e.message}`);
        }
    }
    console.log('✅ Todos los índices creados');
    await pool.end();
}

run();
