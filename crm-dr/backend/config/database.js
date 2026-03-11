/**
 * Configuración de base de datos
 * Soporta SQLite (desarrollo) y PostgreSQL (producción)
 */

const { Pool } = require('pg');
const path = require('path');

let internalDb;
let isPostgres = false;

if (process.env.DATABASE_URL) {
  console.log('🌐 Conectando a PostgreSQL (Producción)...');
  internalDb = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  isPostgres = true;
} else {
  console.log('🔧 Inicializando base de datos local SQLite...');
  const Database = require('better-sqlite3');
  const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '..', 'database.db');
  internalDb = new Database(dbPath);
  internalDb.pragma('journal_mode = WAL');
}

// Lista de columnas camelCase que Postgres almacena en minúsculas
const CAMEL_COLS = [
  'apellidoPaterno', 'apellidoMaterno', 'etapaEmbudo', 'prospectorAsignado',
  'closerAsignado', 'fechaTransferencia', 'fechaUltimaEtapa', 'historialEmbudo',
  'vendedorAsignado', 'fechaRegistro', 'ultimaInteraccion', 'proximaLlamada',
  'cambioEtapa', 'etapaAnterior', 'etapaNueva', 'fechaLimite', 'fechaCreacion',
  'googleRefreshToken', 'googleAccessToken', 'googleTokenExpiry',
  'vendedorNombre', 'vendedorRol', 'closerNombre', 'sitioWeb'
];

// Helper: convierte '?' a '$1', '$2', etc. para Postgres  y  normaliza columnas camelCase a minúsculas
const convertSql = (sql) => {
  if (!isPostgres) return sql;
  let count = 1;
  let res = sql.replace(/\?/g, () => `$${count++}`);
  // Postgres guarda los nombres sin comillas en minúsculas; reemplazamos las referencias camelCase
  CAMEL_COLS.forEach(col => {
    const lower = col.toLowerCase();
    // Reemplaza col exacta (word boundary) que NO esté entre comillas simples
    const reg = new RegExp(`(?<!['"]\\w*)\\b${col}\\b(?!\\w*['"])`, 'g');
    res = res.replace(reg, lower);
  });
  return res;
};

// Mapa para restaurar camelCase de postgres que devuelve todo en minúsculas
const pgMap = {
  apellidopaterno: 'apellidoPaterno', apellidomaterno: 'apellidoMaterno',
  etapaembudo: 'etapaEmbudo', prospectorasignado: 'prospectorAsignado',
  closerasignado: 'closerAsignado', fechatransferencia: 'fechaTransferencia',
  fechaultimaetapa: 'fechaUltimaEtapa', historialembudo: 'historialEmbudo',
  vendedorasignado: 'vendedorAsignado', fecharegistro: 'fechaRegistro',
  ultimainteraccion: 'ultimaInteraccion', proximallamada: 'proximaLlamada',
  cambioetapa: 'cambioEtapa', etapaanterior: 'etapaAnterior',
  etapanueva: 'etapaNueva', fechalimite: 'fechaLimite',
  fechacreacion: 'fechaCreacion', googlerefreshtoken: 'googleRefreshToken',
  googleaccesstoken: 'googleAccessToken', googletokenexpiry: 'googleTokenExpiry',
  vendedornombre: 'vendedorNombre', vendedorrol: 'vendedorRol', closernombre: 'closerNombre',
  sitioweb: 'sitioWeb'
};

const mapPgRow = (row) => {
  if (!row) return row;
  const mapped = {};
  for (const key in row) {
    mapped[pgMap[key] || key] = row[key];
  }
  return mapped;
};

// Shim para imitar better-sqlite3 de forma asíncrona
const db = {
  pragma: (sql) => {
    if (isPostgres) return; // No-op en Postgres
    return internalDb.pragma(sql);
  },
  prepare: (sql) => {
    const finalSql = convertSql(sql);
    return {
      get: async (...params) => {
        if (isPostgres) {
          const res = await internalDb.query(finalSql, params);
          return mapPgRow(res.rows[0]);
        } else {
          return internalDb.prepare(sql).get(...params);
        }
      },
      all: async (...params) => {
        if (isPostgres) {
          const res = await internalDb.query(finalSql, params);
          return res.rows.map(mapPgRow);
        } else {
          return internalDb.prepare(sql).all(...params);
        }
      },
      run: async (...params) => {
        if (isPostgres) {
          let query = finalSql;
          // Si es un INSERT y no tiene RETURNING, lo agregamos para obtener el ID
          const trimmed = query.trim().toUpperCase();
          if (trimmed.startsWith('INSERT') && !trimmed.includes('RETURNING')) {
            query += ' RETURNING id';
            const res = await internalDb.query(query, params);
            return {
              lastInsertRowid: res.rows[0]?.id || null,
              changes: res.rowCount
            };
          }
          const res = await internalDb.query(query, params);
          return { lastInsertRowid: null, changes: res.rowCount };
        } else {
          return internalDb.prepare(sql).run(...params);
        }
      }
    };
  },
  exec: async (sql) => {
    if (isPostgres) {
      return internalDb.query(sql);
    } else {
      return internalDb.exec(sql);
    }
  }
};

// Inicializar tablas
const initDb = async () => {
  const sql = `
  CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    usuario TEXT UNIQUE NOT NULL,
    contraseña TEXT NOT NULL,
    rol TEXT NOT NULL,
    nombre TEXT NOT NULL,
    email TEXT,
    telefono TEXT,
    activo INTEGER DEFAULT 1,
    fechaCreacion TEXT DEFAULT CURRENT_TIMESTAMP,
    googleRefreshToken TEXT,
    googleAccessToken TEXT,
    googleTokenExpiry DOUBLE PRECISION
  );

  CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nombres TEXT NOT NULL,
    apellidoPaterno TEXT NOT NULL,
    apellidoMaterno TEXT,
    telefono TEXT NOT NULL,
    telefono2 TEXT,
    correo TEXT NOT NULL,
    empresa TEXT,
    estado TEXT DEFAULT 'proceso' CHECK(estado IN ('ganado','perdido','proceso')),
    etapaEmbudo TEXT DEFAULT 'prospecto_nuevo',
    prospectorAsignado INTEGER REFERENCES usuarios(id),
    closerAsignado INTEGER REFERENCES usuarios(id),
    fechaTransferencia TEXT,
    fechaUltimaEtapa TEXT DEFAULT CURRENT_TIMESTAMP,
    historialEmbudo TEXT,
    vendedorAsignado INTEGER NOT NULL REFERENCES usuarios(id),
    fechaRegistro TEXT DEFAULT CURRENT_TIMESTAMP,
    ultimaInteraccion TEXT DEFAULT CURRENT_TIMESTAMP,
    notas TEXT,
    interes INTEGER DEFAULT 0,
    proximaLlamada TEXT,
    sitioWeb TEXT,
    ubicacion TEXT
  );

  CREATE TABLE IF NOT EXISTS actividades (
    id SERIAL PRIMARY KEY,
    tipo TEXT NOT NULL CHECK(tipo IN ('llamada','mensaje','correo','whatsapp','cita','prospecto')),
    vendedor INTEGER NOT NULL REFERENCES usuarios(id),
    cliente INTEGER NOT NULL REFERENCES clientes(id),
    fecha TEXT DEFAULT CURRENT_TIMESTAMP,
    descripcion TEXT,
    resultado TEXT DEFAULT 'pendiente' CHECK(resultado IN ('exitoso','pendiente','fallido')),
    cambioEtapa INTEGER DEFAULT 0,
    etapaAnterior TEXT,
    etapaNueva TEXT,
    notas TEXT
  );

  CREATE TABLE IF NOT EXISTS tareas (
    id SERIAL PRIMARY KEY,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    vendedor INTEGER REFERENCES usuarios(id),
    cliente INTEGER REFERENCES clientes(id),
    estado TEXT DEFAULT 'pendiente',
    prioridad TEXT DEFAULT 'media',
    fechaLimite TEXT,
    completada INTEGER DEFAULT 0,
    fechaCreacion TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ventas (
    id SERIAL PRIMARY KEY,
    cliente INTEGER NOT NULL REFERENCES clientes(id),
    vendedor INTEGER NOT NULL REFERENCES usuarios(id),
    monto DOUBLE PRECISION NOT NULL,
    fecha TEXT DEFAULT CURRENT_TIMESTAMP,
    estado TEXT DEFAULT 'pendiente',
    notas TEXT
  );
`;

  let finalSql = sql;
  if (!isPostgres) {
    finalSql = sql.replace(/SERIAL PRIMARY KEY/g, 'INTEGER PRIMARY KEY AUTOINCREMENT')
      .replace(/DOUBLE PRECISION/g, 'REAL')
      .replace(/CURRENT_TIMESTAMP/g, "(datetime('now'))");
  }

  try {
    await db.exec(finalSql);
    console.log('✅ Base de datos inicializada');

    // Verificar si ya hay usuarios; si no, insertar los predeterminados
    const userCount = await db.prepare('SELECT COUNT(*) as count FROM usuarios').get();
    if (userCount && parseInt(userCount.count) === 0) {
      console.log('🌱 Base de datos vacía, insertando usuarios predeterminados...');
      const bcrypt = require('bcryptjs');
      const hashIndividual = await bcrypt.hash('individual123', 10);

      await db.prepare('INSERT INTO usuarios (usuario, contraseña, rol, nombre, email, telefono) VALUES (?, ?, ?, ?, ?, ?)')
        .run('individual', hashIndividual, 'individual', 'Administrador CRM', 'admin@crmmedico.com', '5551234567');

      console.log('✅ Usuarios predeterminados creados');
    }
  } catch (e) {
    console.error('❌ Error al inicializar o seedear DB:', e.message);
  }

  // Migración: rellenar etapaEmbudo NULL con 'prospecto_nuevo'
  try {
    await db.exec("UPDATE clientes SET etapaEmbudo = 'prospecto_nuevo' WHERE etapaEmbudo IS NULL");
    console.log('✅ Migración etapaEmbudo completada');
  } catch (e) {
    console.error('⚠️ Migración etapaEmbudo falló (no crítico):', e.message);
  }

  // Migración: agregar columna ubicacion si no existe
  try {
    if (isPostgres) {
      await internalDb.query('ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ubicacion TEXT');
    } else {
      internalDb.prepare('ALTER TABLE clientes ADD COLUMN ubicacion TEXT').run();
    }
    console.log('✅ Migración ubicacion completada');
  } catch (e) {
    if (!e.message.includes('duplicate') && !e.message.includes('already exists')) {
      console.error('⚠️ Migración ubicacion falló (no crítico):', e.message);
    }
  }
  try {
    if (isPostgres) {
      await internalDb.query('ALTER TABLE clientes ADD COLUMN IF NOT EXISTS sitioweb TEXT');
    } else {
      internalDb.prepare('ALTER TABLE clientes ADD COLUMN sitioWeb TEXT').run();
    }
    console.log('✅ Migración sitioWeb completada');
  } catch (e) {
    // Ignorar error si la columna ya existe
    if (!e.message.includes('duplicate') && !e.message.includes('already exists')) {
      console.error('⚠️ Migración sitioWeb falló (no crítico):', e.message);
    }
  }
  try {
    if (isPostgres) {
      await internalDb.query('ALTER TABLE clientes ADD COLUMN IF NOT EXISTS telefono2 TEXT');
    } else {
      internalDb.prepare('ALTER TABLE clientes ADD COLUMN telefono2 TEXT').run();
    }
    console.log('✅ Migración telefono2 completada');
  } catch (e) {
    if (!e.message.includes('duplicate') && !e.message.includes('already exists')) {
      console.error('⚠️ Migración telefono2 falló (no crítico):', e.message);
    }
  }

  // Migración: agregar config de empresa en usuarios
  try {
    if (isPostgres) {
      await internalDb.query("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS modo_crm TEXT DEFAULT 'individual'");
      await internalDb.query("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nombreEmpresa TEXT");
      await internalDb.query("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS logoEmpresa TEXT");
    } else {
      try { internalDb.exec("ALTER TABLE usuarios ADD COLUMN modo_crm TEXT DEFAULT 'individual'"); } catch(e){}
      try { internalDb.exec("ALTER TABLE usuarios ADD COLUMN nombreEmpresa TEXT"); } catch(e){}
      try { internalDb.exec("ALTER TABLE usuarios ADD COLUMN logoEmpresa TEXT"); } catch(e){}
    }
    console.log('✅ Migración configuración de empresa completada');
  } catch (e) {
    if (!e.message.includes('duplicate') && !e.message.includes('already exists')) {
      console.error('⚠️ Migración config empresa falló:', e.message);
    }
  }
};

initDb();

module.exports = { db, isPostgres };

