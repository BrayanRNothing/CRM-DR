const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDB() {
    const client = await pool.connect();
    try {
        // Crear tablas (cada una por separado)
        await client.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                usuario TEXT UNIQUE NOT NULL,
                "contraseña" TEXT NOT NULL,
                rol TEXT NOT NULL CHECK(rol IN ('prospector','closer')),
                nombre TEXT NOT NULL,
                email TEXT,
                telefono TEXT,
                activo INTEGER DEFAULT 1,
                "fechaCreacion" TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS clientes (
                id SERIAL PRIMARY KEY,
                nombres TEXT NOT NULL,
                "apellidoPaterno" TEXT NOT NULL,
                "apellidoMaterno" TEXT,
                telefono TEXT NOT NULL,
                correo TEXT NOT NULL,
                empresa TEXT,
                estado TEXT DEFAULT 'proceso',
                "etapaEmbudo" TEXT DEFAULT 'prospecto_nuevo',
                "prospectorAsignado" INTEGER REFERENCES usuarios(id),
                "closerAsignado" INTEGER REFERENCES usuarios(id),
                "fechaTransferencia" TIMESTAMPTZ,
                "fechaUltimaEtapa" TIMESTAMPTZ DEFAULT NOW(),
                "historialEmbudo" TEXT,
                "vendedorAsignado" INTEGER REFERENCES usuarios(id),
                "fechaRegistro" TIMESTAMPTZ DEFAULT NOW(),
                "ultimaInteraccion" TIMESTAMPTZ DEFAULT NOW(),
                notas TEXT
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS actividades (
                id SERIAL PRIMARY KEY,
                tipo TEXT NOT NULL,
                vendedor INTEGER NOT NULL REFERENCES usuarios(id),
                cliente INTEGER NOT NULL REFERENCES clientes(id),
                fecha TIMESTAMPTZ DEFAULT NOW(),
                descripcion TEXT,
                resultado TEXT DEFAULT 'pendiente',
                "cambioEtapa" INTEGER DEFAULT 0,
                "etapaAnterior" TEXT,
                "etapaNueva" TEXT,
                notas TEXT
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS tareas (
                id SERIAL PRIMARY KEY,
                titulo TEXT NOT NULL,
                descripcion TEXT,
                vendedor INTEGER REFERENCES usuarios(id),
                cliente INTEGER REFERENCES clientes(id),
                estado TEXT DEFAULT 'pendiente',
                prioridad TEXT DEFAULT 'media',
                "fechaLimite" TIMESTAMPTZ,
                completada INTEGER DEFAULT 0,
                "fechaCreacion" TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS ventas (
                id SERIAL PRIMARY KEY,
                cliente INTEGER NOT NULL REFERENCES clientes(id),
                vendedor INTEGER NOT NULL REFERENCES usuarios(id),
                monto NUMERIC NOT NULL,
                fecha TIMESTAMPTZ DEFAULT NOW(),
                estado TEXT DEFAULT 'pendiente',
                notas TEXT
            )
        `);

        // Migración: renombrar columnas lowercase → camelCase (si existen en lowercase)
        await client.query(`
            DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='fechacreacion') THEN
                    ALTER TABLE usuarios RENAME COLUMN fechacreacion TO "fechaCreacion";
                END IF;

                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='apellidopaterno') THEN
                    ALTER TABLE clientes RENAME COLUMN apellidopaterno TO "apellidoPaterno";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='apellidomaterno') THEN
                    ALTER TABLE clientes RENAME COLUMN apellidomaterno TO "apellidoMaterno";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='etapaembudo') THEN
                    ALTER TABLE clientes RENAME COLUMN etapaembudo TO "etapaEmbudo";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='prospectorasignado') THEN
                    ALTER TABLE clientes RENAME COLUMN prospectorasignado TO "prospectorAsignado";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='closerasignado') THEN
                    ALTER TABLE clientes RENAME COLUMN closerasignado TO "closerAsignado";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='fechatransferencia') THEN
                    ALTER TABLE clientes RENAME COLUMN fechatransferencia TO "fechaTransferencia";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='fechaultimaetapa') THEN
                    ALTER TABLE clientes RENAME COLUMN fechaultimaetapa TO "fechaUltimaEtapa";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='historialembudo') THEN
                    ALTER TABLE clientes RENAME COLUMN historialembudo TO "historialEmbudo";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='vendedorasignado') THEN
                    ALTER TABLE clientes RENAME COLUMN vendedorasignado TO "vendedorAsignado";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='fecharegristro') THEN
                    ALTER TABLE clientes RENAME COLUMN fecharegristro TO "fechaRegistro";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='fecharegistro') THEN
                    ALTER TABLE clientes RENAME COLUMN fecharegistro TO "fechaRegistro";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='ultimainteraccion') THEN
                    ALTER TABLE clientes RENAME COLUMN ultimainteraccion TO "ultimaInteraccion";
                END IF;

                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='actividades' AND column_name='cambioetapa') THEN
                    ALTER TABLE actividades RENAME COLUMN cambioetapa TO "cambioEtapa";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='actividades' AND column_name='etapaanterior') THEN
                    ALTER TABLE actividades RENAME COLUMN etapaanterior TO "etapaAnterior";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='actividades' AND column_name='etapanueva') THEN
                    ALTER TABLE actividades RENAME COLUMN etapanueva TO "etapaNueva";
                END IF;

                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tareas' AND column_name='fechalimite') THEN
                    ALTER TABLE tareas RENAME COLUMN fechalimite TO "fechaLimite";
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tareas' AND column_name='fechacreacion') THEN
                    ALTER TABLE tareas RENAME COLUMN fechacreacion TO "fechaCreacion";
                END IF;
            END $$;
        `);

        // Índices
        await client.query(`CREATE INDEX IF NOT EXISTS idx_clientes_prospector ON clientes("prospectorAsignado")`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_clientes_vendedor ON clientes("vendedorAsignado")`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_actividades_vendedor ON actividades(vendedor)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_actividades_fecha ON actividades(fecha)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_actividades_cliente ON actividades(cliente)`);

        console.log('✅ PostgreSQL conectado y tablas listas');
    } catch (err) {
        console.error('❌ Error inicializando PostgreSQL:', err.message);
    } finally {
        client.release();
    }
}

initDB();

module.exports = pool;
