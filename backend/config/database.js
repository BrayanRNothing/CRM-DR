/**
 * Configuración de base de datos
 * PostgreSQL only
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

let internalDb;
const isPostgres = true;

const ROOT_ADMIN_DEFAULTS = {
  username: 'ownerjulio',
  password: 'OwnerJulio#2026',
  nombre: 'Julio Admin Root',
  email: 'julio.admin@solomycrm.com',
  telefono: '0000000000'
};

const ROOT_ADMIN_SECONDARY_DEFAULTS = {
  username: '',
  password: '',
  nombre: '',
  email: '',
  telefono: ''
};

const getRootAdminCredentials = () => ({
  username: (process.env.ROOT_ADMIN_USER || ROOT_ADMIN_DEFAULTS.username).trim(),
  password: (process.env.ROOT_ADMIN_PASS || ROOT_ADMIN_DEFAULTS.password).trim(),
  nombre: (process.env.ROOT_ADMIN_NAME || ROOT_ADMIN_DEFAULTS.nombre).trim(),
  email: (process.env.ROOT_ADMIN_EMAIL || ROOT_ADMIN_DEFAULTS.email).trim(),
  telefono: (process.env.ROOT_ADMIN_PHONE || ROOT_ADMIN_DEFAULTS.telefono).trim()
});

const getSecondRootAdminCredentials = () => ({
  username: (process.env.ROOT_ADMIN2_USER || ROOT_ADMIN_SECONDARY_DEFAULTS.username).trim(),
  password: (process.env.ROOT_ADMIN2_PASS || ROOT_ADMIN_SECONDARY_DEFAULTS.password).trim(),
  nombre: (process.env.ROOT_ADMIN2_NAME || ROOT_ADMIN_SECONDARY_DEFAULTS.nombre).trim(),
  email: (process.env.ROOT_ADMIN2_EMAIL || ROOT_ADMIN_SECONDARY_DEFAULTS.email).trim(),
  telefono: (process.env.ROOT_ADMIN2_PHONE || ROOT_ADMIN_SECONDARY_DEFAULTS.telefono).trim()
});

const isRunningOnRailway = Boolean(
  process.env.RAILWAY_ENVIRONMENT ||
  process.env.RAILWAY_PROJECT_ID ||
  process.env.RAILWAY_SERVICE_ID
);

const parseDbHost = (url) => {
  if (!url) return '';
  try {
    return new URL(url).hostname || '';
  } catch (_) {
    return '';
  }
};

const isRailwayInternalHost = (url) => parseDbHost(url).endsWith('.railway.internal');

const envUrls = {
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_PUBLIC_URL: process.env.DATABASE_PUBLIC_URL,
  POSTGRES_URL: process.env.POSTGRES_URL,
  POSTGRES_PUBLIC_URL: process.env.POSTGRES_PUBLIC_URL,
  PGURL: process.env.PGURL,
  DATABASE_PRIVATE_URL: process.env.DATABASE_PRIVATE_URL,
};

const firstNonEmpty = (list) => list.find((v) => typeof v === 'string' && v.trim().length > 0);

// Soportar múltiples nombres de variables de entorno comunes en Railway/Vercel
let dbUrl = firstNonEmpty([
  envUrls.DATABASE_URL,
  envUrls.DATABASE_PUBLIC_URL,
  envUrls.POSTGRES_URL,
  envUrls.POSTGRES_PUBLIC_URL,
  envUrls.PGURL,
  envUrls.DATABASE_PRIVATE_URL,
]);

if (!isRunningOnRailway && isRailwayInternalHost(dbUrl)) {
  const fallbackPublicUrl = firstNonEmpty([
    envUrls.DATABASE_PUBLIC_URL,
    envUrls.POSTGRES_PUBLIC_URL,
    envUrls.POSTGRES_URL,
    envUrls.PGURL,
  ]);

  if (fallbackPublicUrl && !isRailwayInternalHost(fallbackPublicUrl)) {
    console.warn('⚠️ Detectada URL interna de Railway fuera de Railway. Se usará URL pública de respaldo.');
    dbUrl = fallbackPublicUrl;
  } else {
    console.error('❌ DATABASE_URL apunta a *.railway.internal y este entorno no está dentro de Railway.');
    console.log('💡 Define DATABASE_PUBLIC_URL (o POSTGRES_PUBLIC_URL) para desarrollo local.');
  }
}

if (!dbUrl) {
  console.error('❌ CRÍTICO: No se encontró DATABASE_URL. El backend no podrá realizar consultas.');
  console.log('💡 Tip: Verifica DATABASE_URL / DATABASE_PUBLIC_URL en tus variables de entorno.');
}

console.log(`🌐 Intentando conectar a la base de datos... ${dbUrl ? '(URL detectada)' : '(⚠️ URL NO DETECTADA)'}`);
internalDb = new Pool({
  connectionString: dbUrl || 'postgres://placeholder:placeholder@localhost:5432/placeholder',
  ssl: {
    rejectUnauthorized: false
  }
});

// Lista de columnas camelCase que Postgres almacena en minúsculas
const CAMEL_COLS = [
  'apellidoPaterno', 'apellidoMaterno', 'etapaEmbudo', 'prospectorAsignado',
  'closerAsignado', 'fechaTransferencia', 'fechaUltimaEtapa', 'historialEmbudo',
  'vendedorAsignado', 'fechaRegistro', 'ultimaInteraccion', 'proximaLlamada',
  'propietarioId',
  'cambioEtapa', 'etapaAnterior', 'etapaNueva', 'fechaLimite', 'fechaCreacion',
  'googleRefreshToken', 'googleAccessToken', 'googleTokenExpiry',
  'vendedorNombre', 'vendedorRol', 'closerNombre', 'propietarioNombre', 'sitioWeb', 'googleMeetLink',
  'customMetricLabel', 'customMetricValue', 'createdAt', 'tipoActividad',
  'ultimaInteraccion', 'proximaLlamada', 'customSections', 'fuente', 'motivoPerdida'
];

// Helper: convierte '?' a '$1', '$2', etc. para Postgres y añade comillas dobles a columnas camelCase
const convertSql = (sql) => {
  if (!isPostgres) return sql;
  let count = 1;
  let res = sql.replace(/\?/g, () => `$${count++}`);
  // Las columnas camelCase fueron creadas con comillas dobles en Postgres, por lo que deben
  // referenciarse con comillas dobles para preservar el case (e.g., "closerAsignado")
  CAMEL_COLS.forEach(col => {
    // Reemplaza col exacta que no esté ya entre comillas dobles
    const reg = new RegExp(`(?<!")\\b${col}\\b(?!")`, 'g');
    res = res.replace(reg, `"${col}"`);
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
  propietarioid: 'propietarioId',
  ultimainteraccion: 'ultimaInteraccion', proximallamada: 'proximaLlamada',
  cambioetapa: 'cambioEtapa', etapaanterior: 'etapaAnterior',
  etapanueva: 'etapaNueva', fechalimite: 'fechaLimite',
  fechacreacion: 'fechaCreacion', googlerefreshtoken: 'googleRefreshToken',
  googleaccesstoken: 'googleAccessToken', googletokenexpiry: 'googleTokenExpiry',
  vendedornombre: 'vendedorNombre', vendedorrol: 'vendedorRol', closernombre: 'closerNombre', propietarionombre: 'propietarioNombre',
  sitioweb: 'sitioWeb', googlemeetlink: 'googleMeetLink',
  custommetriclabel: 'customMetricLabel', custommetricvalue: 'customMetricValue',
  customsections: 'customSections', fuente: 'fuente', motivoperdida: 'motivoPerdida'
};

const mapPgRow = (row) => {
  if (!row) return row;
  const mapped = {};
  for (const key in row) {
    mapped[pgMap[key] || key] = row[key];
  }
  return mapped;
};

const normalizeGoogleTokenExpiryValue = (value) => {
  if (value === null || value === undefined) return value;

  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? value : value.toISOString();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value > 100000000000) return new Date(value).toISOString();
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) {
      const numeric = Number(trimmed);
      if (Number.isFinite(numeric) && numeric > 100000000000) {
        return new Date(numeric).toISOString();
      }
      return value;
    }

    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }
  }

  return value;
};

const normalizePgParams = (sql, params = []) => {
  if (!isPostgres || !Array.isArray(params) || params.length === 0) return params;

  const normalized = [...params];

  // UPDATE ... googleTokenExpiry = $n
  const assignmentRegex = /"?googleTokenExpiry"?\s*=\s*\$(\d+)/gi;
  let match;
  while ((match = assignmentRegex.exec(sql)) !== null) {
    const idx = Number(match[1]) - 1;
    if (idx >= 0 && idx < normalized.length) {
      normalized[idx] = normalizeGoogleTokenExpiryValue(normalized[idx]);
    }
  }

  // INSERT ... (cols...) VALUES ($1, $2, ...)
  const insertRegex = /INSERT\s+INTO\s+[^\s(]+\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i;
  const insertMatch = sql.match(insertRegex);
  if (insertMatch) {
    const cols = insertMatch[1].split(',').map(c => c.trim().replace(/"/g, ''));
    const vals = insertMatch[2].split(',').map(v => v.trim());
    const colIndex = cols.findIndex(c => c === 'googleTokenExpiry');
    if (colIndex >= 0 && colIndex < vals.length) {
      const valExpr = vals[colIndex];
      const placeholderMatch = valExpr.match(/^\$(\d+)$/);
      if (placeholderMatch) {
        const idx = Number(placeholderMatch[1]) - 1;
        if (idx >= 0 && idx < normalized.length) {
          normalized[idx] = normalizeGoogleTokenExpiryValue(normalized[idx]);
        }
      }
    }
  }

  return normalized;
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
          const safeParams = normalizePgParams(finalSql, params);
          const res = await internalDb.query(finalSql, safeParams);
          return mapPgRow(res.rows[0]);
        } else {
          return internalDb.prepare(sql).get(...params);
        }
      },
      all: async (...params) => {
        if (isPostgres) {
          const safeParams = normalizePgParams(finalSql, params);
          const res = await internalDb.query(finalSql, safeParams);
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
            const safeParams = normalizePgParams(query, params);
            const res = await internalDb.query(query, safeParams);
            return {
              lastInsertRowid: res.rows[0]?.id || null,
              changes: res.rowCount
            };
          }
          const safeParams = normalizePgParams(query, params);
          const res = await internalDb.query(query, safeParams);
          return { lastInsertRowid: null, changes: res.rowCount };
        } else {
          return internalDb.prepare(sql).run(...params);
        }
      }
    };
  },
  exec: async (sql) => {
    const finalSql = convertSql(sql);
    if (isPostgres) {
      return internalDb.query(finalSql);
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
    rol TEXT NOT NULL CHECK(rol IN ('vendedor','admin')),
    nombre TEXT NOT NULL,
    email TEXT,
    telefono TEXT,
    activo INTEGER DEFAULT 1,
    fechaCreacion TEXT DEFAULT CURRENT_TIMESTAMP,
    "googleRefreshToken" TEXT,
    "googleAccessToken" TEXT,
    "googleTokenExpiry" DOUBLE PRECISION
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
    "propietarioId" INTEGER REFERENCES usuarios(id),
    compartido BOOLEAN DEFAULT FALSE,
    sitioWeb TEXT,
    ubicacion TEXT,
    etiquetas TEXT,
    "customSections" TEXT,
    fuente TEXT,
    "motivoPerdida" TEXT
  );

  CREATE TABLE IF NOT EXISTS actividades (
    id SERIAL PRIMARY KEY,
    tipo TEXT NOT NULL,
    vendedor INTEGER NOT NULL REFERENCES usuarios(id),
    cliente INTEGER REFERENCES clientes(id),
    fecha TEXT DEFAULT CURRENT_TIMESTAMP,
    descripcion TEXT,
    resultado TEXT DEFAULT 'pendiente' CHECK(resultado IN ('exitoso','pendiente','fallido','convertido','descartado','enviado')),
    cambioEtapa INTEGER DEFAULT 0,
    etapaAnterior TEXT,
    etapaNueva TEXT,
    notas TEXT,
    invitados TEXT,
    "googleMeetLink" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
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

  CREATE TABLE IF NOT EXISTS equipos (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    icon TEXT,
    owner_id INTEGER REFERENCES usuarios(id),
    "fechaCreacion" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS etiquetas_globales (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    color TEXT,
    equipo_id INTEGER REFERENCES equipos(id),
    "fechaCreacion" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
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
      const hashVendedor = await bcrypt.hash('vendedor123', 10);

      await db.prepare('INSERT INTO usuarios (usuario, contraseña, rol, nombre, email, telefono) VALUES (?, ?, ?, ?, ?, ?)')
        .run('vendedor', hashVendedor, 'vendedor', 'Vendedor Demo', 'vendedor@crm.com', '5554444444');

      console.log('✅ Usuarios predeterminados creados');
    }
  } catch (e) {
    console.error('❌ Error al inicializar o seedear DB:', e.message);
  }

  // ================================================================
  // MIGRACIÓN POSTGRESQL: normalizar TODAS las columnas camelCase
  // Renombra cualquier columna que exista en lowercase a su versión
  // con comillas dobles, y agrega las columnas que falten.
  // ================================================================
  if (isPostgres) {
    try {
      await internalDb.query(`
        DO $$ BEGIN
          -- usuarios
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='fechacreacion')
             AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='fechaCreacion') THEN
            ALTER TABLE usuarios RENAME COLUMN fechacreacion TO "fechaCreacion";
          END IF;
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='googlerefreshtoken')
             AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='googleRefreshToken') THEN
            ALTER TABLE usuarios RENAME COLUMN googlerefreshtoken TO "googleRefreshToken";
          END IF;
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='googleaccesstoken')
             AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='googleAccessToken') THEN
            ALTER TABLE usuarios RENAME COLUMN googleaccesstoken TO "googleAccessToken";
          END IF;
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='googletokenexpiry')
             AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='googleTokenExpiry') THEN
            ALTER TABLE usuarios RENAME COLUMN googletokenexpiry TO "googleTokenExpiry";
          END IF;

          -- clientes
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='apellidopaterno')
             AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='apellidoPaterno') THEN
            ALTER TABLE clientes RENAME COLUMN apellidopaterno TO "apellidoPaterno";
          END IF;
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='apellidomaterno')
             AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='apellidoMaterno') THEN
            ALTER TABLE clientes RENAME COLUMN apellidomaterno TO "apellidoMaterno";
          END IF;
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='etapaembudo')
             AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='etapaEmbudo') THEN
            ALTER TABLE clientes RENAME COLUMN etapaembudo TO "etapaEmbudo";
          END IF;
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='prospectorasignado')
             AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='prospectorAsignado') THEN
            ALTER TABLE clientes RENAME COLUMN prospectorasignado TO "prospectorAsignado";
          END IF;
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='closerasignado')
             AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='closerAsignado') THEN
            ALTER TABLE clientes RENAME COLUMN closerasignado TO "closerAsignado";
          END IF;
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='fechatransferencia')
             AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='fechaTransferencia') THEN
            ALTER TABLE clientes RENAME COLUMN fechatransferencia TO "fechaTransferencia";
          END IF;
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='fechaultimaetapa')
             AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='fechaUltimaEtapa') THEN
            ALTER TABLE clientes RENAME COLUMN fechaultimaetapa TO "fechaUltimaEtapa";
          END IF;
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='historialembudo')
             AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='historialEmbudo') THEN
            ALTER TABLE clientes RENAME COLUMN historialembudo TO "historialEmbudo";
          END IF;
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='vendedorasignado')
             AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='vendedorAsignado') THEN
            ALTER TABLE clientes RENAME COLUMN vendedorasignado TO "vendedorAsignado";
          END IF;
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='fecharegristro')
             AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='fechaRegistro') THEN
            ALTER TABLE clientes RENAME COLUMN fecharegristro TO "fechaRegistro";
          END IF;
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='fecharegistro')
             AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='fechaRegistro') THEN
            ALTER TABLE clientes RENAME COLUMN fecharegistro TO "fechaRegistro";
          END IF;
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='ultimainteraccion')
             AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='ultimaInteraccion') THEN
            ALTER TABLE clientes RENAME COLUMN ultimainteraccion TO "ultimaInteraccion";
          END IF;
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='sitioweb')
             AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='sitioWeb') THEN
            ALTER TABLE clientes RENAME COLUMN sitioweb TO "sitioWeb";
          END IF;
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='proximallamada')
             AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='proximaLlamada') THEN
            ALTER TABLE clientes RENAME COLUMN proximallamada TO "proximaLlamada";
          END IF;
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='customsections')
             AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='customSections') THEN
            ALTER TABLE clientes RENAME COLUMN customsections TO "customSections";
          END IF;

          -- actividades
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='actividades' AND column_name='cambioetapa')
             AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='actividades' AND column_name='cambioEtapa') THEN
            ALTER TABLE actividades RENAME COLUMN cambioetapa TO "cambioEtapa";
          END IF;
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='actividades' AND column_name='etapaanterior')
             AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='actividades' AND column_name='etapaAnterior') THEN
            ALTER TABLE actividades RENAME COLUMN etapaanterior TO "etapaAnterior";
          END IF;
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='actividades' AND column_name='etapanueva')
             AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='actividades' AND column_name='etapaNueva') THEN
            ALTER TABLE actividades RENAME COLUMN etapanueva TO "etapaNueva";
          END IF;
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='actividades' AND column_name='googlemeetlink')
             AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='actividades' AND column_name='googleMeetLink') THEN
            ALTER TABLE actividades RENAME COLUMN googlemeetlink TO "googleMeetLink";
          END IF;

          -- tareas
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tareas' AND column_name='fechalimite')
             AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tareas' AND column_name='fechaLimite') THEN
            ALTER TABLE tareas RENAME COLUMN fechalimite TO "fechaLimite";
          END IF;
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tareas' AND column_name='fechacreacion')
             AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tareas' AND column_name='fechaCreacion') THEN
            ALTER TABLE tareas RENAME COLUMN fechacreacion TO "fechaCreacion";
          END IF;
        END $$;
      `);
      console.log('✅ Migración: renombrado de columnas a camelCase completado');
    } catch (e) {
      console.error('⚠️ Migración renombrado columnas falló:', e.message);
    }

    // Agregar columnas que pueden faltar en DBs antiguas
    const colsMissingPg = [
      ['usuarios',  '"googleRefreshToken"', 'TEXT'],
      ['usuarios',  '"googleAccessToken"',  'TEXT'],
      ['usuarios',  '"googleTokenExpiry"',  'DOUBLE PRECISION'],
      ['clientes',  'ubicacion',            'TEXT'],
      ['clientes',  '"sitioWeb"',           'TEXT'],
      ['clientes',  'telefono2',            'TEXT'],
      ['clientes',  '"proximaLlamada"',     'TIMESTAMPTZ'],
      ['clientes',  'interes',              'TEXT'],
      ['clientes',  'compartido',           'BOOLEAN DEFAULT FALSE'],
      ['clientes',  '"propietarioId"',      'INTEGER'],
      ['usuarios',  'activo',               'INTEGER DEFAULT 1'],
      ['actividades', '"googleMeetLink"',   'TEXT'],
      ['actividades', '"createdAt"',        'TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP'],
      ['clientes',    '"customMetricLabel"', 'TEXT'],
      ['clientes',    '"customMetricValue"', 'TEXT'],
      ['usuarios',    '"equipo_id"',         'INTEGER'],
      ['clientes',    '"equipo_id"',         'INTEGER'],
      ['actividades', '"equipo_id"',         'INTEGER'],
      ['actividades', 'invitados',           'TEXT'],
      ['tareas',      '"equipo_id"',         'INTEGER'],
      ['equipos',     'icon',                'TEXT'],
      ['clientes',    'etiquetas',           'TEXT'],
      ['clientes',    '"customSections"',    'TEXT'],
      ['clientes',    'fuente',              'TEXT'],
      ['clientes',    '"motivoPerdida"',     'TEXT'],
      ['actividades', '"equipo_id"',         'INTEGER'],
    ];
    for (const [table, col, type] of colsMissingPg) {
      try {
        // En Postgres, Column names without quotes are lowercase. 
        // We check if it exists in any case, but add it as specified.
        await internalDb.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} ${type}`);
      } catch (e) {
        if (!e.message.includes('already exists')) {
          console.error(`⚠️ Error agregando ${col} a ${table}:`, e.message);
        }
      }
    }

    // Migración específica para tabla actividades: remover constraints restrictivos
    try {
      await internalDb.query(`
        ALTER TABLE actividades DROP CONSTRAINT IF EXISTS actividades_tipo_check;
        ALTER TABLE actividades DROP CONSTRAINT IF EXISTS actividades_resultado_check;
        ALTER TABLE actividades ALTER COLUMN cliente DROP NOT NULL;
        ALTER TABLE actividades ADD CONSTRAINT actividades_resultado_check CHECK (resultado IN ('exitoso','pendiente','fallido','convertido','descartado','enviado'));
      `);
      console.log('✅ Migración: Tabla actividades actualizada (cliente nullable, tipo/resultado checks relajados)');
    } catch (e) {
      console.error('⚠️ Migración actividades falló:', e.message);
    }
    
    // Asegurar que todos los usuarios tengan activo = 1 si es NULL
    try {
      await internalDb.query(`UPDATE usuarios SET activo = 1 WHERE activo IS NULL`);
    } catch (e) {
      console.error('⚠️ Error inicializando columna activo en usuarios:', e.message);
    }
    console.log('✅ Migración: columnas faltantes verificadas');

    // Rellenar etapaEmbudo NULL
    try {
      await internalDb.query(`UPDATE clientes SET "etapaEmbudo" = 'prospecto_nuevo' WHERE "etapaEmbudo" IS NULL`);
    } catch (e) {
      console.error('⚠️ Migración etapaEmbudo falló:', e.message);
    }

    // Rellenar propietarioId y compartido para registros antiguos
    try {
      await internalDb.query(`
        UPDATE clientes
        SET "propietarioId" = COALESCE("propietarioId", "prospectorAsignado", "vendedorAsignado")
        WHERE "propietarioId" IS NULL
      `);
      await internalDb.query(`
        UPDATE clientes
        SET compartido = FALSE
        WHERE compartido IS NULL
      `);
    } catch (e) {
      console.error('⚠️ Migración propietarioId/compartido falló:', e.message);
    }

    // ================================================================
    // MIGRACIÓN DE DATOS: Sistema de Equipos (idempotente)
    // Crea un equipo personal por cada usuario que no tenga equipo_id
    // ================================================================
    try {
      // 1. Crear un equipo personal para cada usuario sin equipo
      await internalDb.query(`
        INSERT INTO equipos (nombre, owner_id)
        SELECT 'Equipo de ' || nombre, id
        FROM usuarios
        WHERE "equipo_id" IS NULL
      `);

      // 2. Asignar cada usuario a su equipo recién creado
      await internalDb.query(`
        UPDATE usuarios u
        SET "equipo_id" = (SELECT id FROM equipos WHERE owner_id = u.id)
        WHERE "equipo_id" IS NULL
      `);

      // 3. Asignar clientes al equipo del prospector asignado
      await internalDb.query(`
        UPDATE clientes
        SET "equipo_id" = (
          SELECT "equipo_id" FROM usuarios WHERE id = clientes."prospectorAsignado"
        )
        WHERE "equipo_id" IS NULL AND "prospectorAsignado" IS NOT NULL
      `);

      // 4. Fallback: clientes sin prospector → equipo del vendedor
      await internalDb.query(`
        UPDATE clientes
        SET "equipo_id" = (
          SELECT "equipo_id" FROM usuarios WHERE id = clientes."vendedorAsignado"
        )
        WHERE "equipo_id" IS NULL AND "vendedorAsignado" IS NOT NULL
      `);

      console.log('✅ Migración: equipos creados y usuarios/clientes asignados');
    } catch (e) {
      console.error('⚠️ Migración equipos falló:', e.message);
    }
  } else {
    // SQLite: agregar columnas faltantes
    const colsMissingSqlite = [
      ['clientes', 'ubicacion TEXT'],
      ['clientes', 'sitioWeb TEXT'],
      ['clientes', 'telefono2 TEXT'],
      ['clientes', 'proximaLlamada TEXT'],
      ['clientes', 'interes TEXT'],
      ['clientes', 'propietarioId INTEGER'],
      ['clientes', 'compartido INTEGER DEFAULT 0'],
      ['usuarios', 'activo INTEGER DEFAULT 1'],
      ['usuarios', 'googleRefreshToken TEXT'],
      ['usuarios', 'googleAccessToken TEXT'],
      ['usuarios', 'googleTokenExpiry REAL'],
      ['clientes', 'customMetricValue TEXT'],
      ['actividades', 'invitados TEXT'],
      ['actividades', 'createdAt TEXT DEFAULT (datetime(\'now\'))'],
      ['equipos', 'icon TEXT'],
      ['clientes', 'etiquetas TEXT'],
      ['clientes', 'customSections TEXT'],
      ['clientes', 'fuente TEXT'],
      ['clientes', 'motivoPerdida TEXT'],
      ['tareas', 'equipo_id INTEGER'],
    ];
    for (const [table, colDef] of colsMissingSqlite) {
      try {
        internalDb.prepare(`ALTER TABLE ${table} ADD COLUMN ${colDef}`).run();
      } catch (e) {
        if (!e.message.includes('duplicate') && !e.message.includes('already exists')) {
          console.error(`⚠️ SQLite: error agregando ${colDef} a ${table}:`, e.message);
        }
      }
    }

    // SQLite no permite modificar CHECK fácilmente: recreamos tabla usuarios para permitir nuevos roles.
    try {
      const usuariosSql = internalDb.prepare(
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'usuarios'"
      ).get();

      const needsRoleMigration = usuariosSql?.sql && (
        usuariosSql.sql.includes("'prospector'") ||
        usuariosSql.sql.includes("'closer'") ||
        !usuariosSql.sql.includes("'vendedor'") ||
        !usuariosSql.sql.includes("'admin'")
      );
      if (needsRoleMigration) {
        internalDb.exec('PRAGMA foreign_keys = OFF');
        internalDb.exec('BEGIN TRANSACTION');

        internalDb.exec(`
          CREATE TABLE IF NOT EXISTS usuarios_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario TEXT UNIQUE NOT NULL,
            contraseña TEXT NOT NULL,
            rol TEXT NOT NULL CHECK(rol IN ('vendedor','admin')),
            nombre TEXT NOT NULL,
            email TEXT,
            telefono TEXT,
            activo INTEGER DEFAULT 1,
            fechaCreacion TEXT DEFAULT (datetime('now')),
            googleRefreshToken TEXT,
            googleAccessToken TEXT,
            googleTokenExpiry REAL
          );
        `);

        internalDb.exec(`
          INSERT INTO usuarios_new (
            id, usuario, contraseña, rol, nombre, email, telefono, activo,
            fechaCreacion, googleRefreshToken, googleAccessToken, googleTokenExpiry
          )
          SELECT
            id, usuario, contraseña,
            CASE WHEN rol IN ('prospector', 'closer', 'superuser') THEN 'vendedor' ELSE rol END,
            nombre, email, telefono, activo,
            fechaCreacion, googleRefreshToken, googleAccessToken, googleTokenExpiry
          FROM usuarios;
        `);

        internalDb.exec('DROP TABLE usuarios');
        internalDb.exec('ALTER TABLE usuarios_new RENAME TO usuarios');
        internalDb.exec('COMMIT');
        internalDb.exec('PRAGMA foreign_keys = ON');
        console.log('✅ SQLite: migración de roles en usuarios completada (admin/vendedor)');
      }
    } catch (e) {
      try { internalDb.exec('ROLLBACK'); } catch (_) { /* no-op */ }
      try { internalDb.exec('PRAGMA foreign_keys = ON'); } catch (_) { /* no-op */ }
      console.error('⚠️ SQLite: error migrando constraint de rol en usuarios:', e.message);
    }
    
    try {
      internalDb.prepare(`UPDATE clientes SET etapaEmbudo = 'prospecto_nuevo' WHERE etapaEmbudo IS NULL`).run();
    } catch (e) { /* ignorar */ }

    try {
      internalDb.prepare(`
        UPDATE clientes
        SET propietarioId = COALESCE(propietarioId, prospectorAsignado, vendedorAsignado)
        WHERE propietarioId IS NULL
      `).run();
      internalDb.prepare(`UPDATE clientes SET compartido = 0 WHERE compartido IS NULL`).run();
    } catch (e) { /* ignorar */ }
  }

  // MIGRACIÓN POSTGRESQL PARA EL NUEVO ROL (vendedor)
  if (isPostgres) {
    try {
        // Remover el constraint anterior y añadir el nuevo (con 'vendedor')
        await internalDb.query(`
            ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
            UPDATE usuarios SET rol = 'vendedor' WHERE rol IN ('prospector', 'closer', 'superuser');
            ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check CHECK (rol IN ('vendedor', 'admin'));
        `);
          console.log('✅ Migración: Constraint de rol actualizado en Postgres (admin/vendedor)');
    } catch(e) {
        console.error('⚠️ Migración: Error actualizando constraint de rol en Postgres:', e.message);
    }
  }

  // Asegurar que exista entre 1 y 2 usuarios admin root y que ambos queden activos.
  try {
    await db.prepare("UPDATE usuarios SET rol = 'vendedor' WHERE rol IN ('prospector', 'closer', 'superuser')").run();

    const creds = getRootAdminCredentials();
    const creds2 = getSecondRootAdminCredentials();
    const admins = await db.prepare('SELECT id, usuario FROM usuarios WHERE rol = ? ORDER BY id ASC').all('admin');

    if (admins.length === 0) {
      const hashAdmin = await bcrypt.hash(creds.password, 10);
      const created = await db.prepare(
        'INSERT INTO usuarios (usuario, contraseña, rol, nombre, email, telefono, activo) VALUES (?, ?, ?, ?, ?, ?, 1)'
      ).run(creds.username, hashAdmin, 'admin', creds.nombre, creds.email, creds.telefono);
      console.log(`✅ Admin root creado (id: ${created.lastInsertRowid || 'n/a'})`);
    }

    let adminRoot = await db.prepare('SELECT id, usuario, nombre, email, "equipo_id" FROM usuarios WHERE rol = ? ORDER BY id ASC LIMIT 1').get('admin');

    if (!adminRoot) {
      throw new Error('No se pudo obtener admin root después de la creación/verificación');
    }

    if (adminRoot && adminRoot.usuario.toLowerCase() !== creds.username.toLowerCase()) {
      const usuarioReservadoExiste = await db.prepare('SELECT id FROM usuarios WHERE LOWER(usuario) = LOWER(?)').get(creds.username);
      if (!usuarioReservadoExiste) {
        await db.prepare('UPDATE usuarios SET usuario = ? WHERE id = ?').run(creds.username, adminRoot.id);
        adminRoot.usuario = creds.username;
      }
    }

    if (creds2.username && creds2.password && creds2.nombre) {
      const admin2 = await db.prepare('SELECT id FROM usuarios WHERE LOWER(usuario) = LOWER(?)').get(creds2.username);
      if (!admin2) {
        const hashAdmin2 = await bcrypt.hash(creds2.password, 10);
        const created2 = await db.prepare(
          'INSERT INTO usuarios (usuario, contraseña, rol, nombre, email, telefono, activo) VALUES (?, ?, ?, ?, ?, ?, 1)'
        ).run(creds2.username, hashAdmin2, 'admin', creds2.nombre, creds2.email, creds2.telefono);
        console.log(`✅ Segundo admin root creado (id: ${created2.lastInsertRowid || 'n/a'})`);
      } else {
        await db.prepare('UPDATE usuarios SET rol = ?, activo = 1 WHERE id = ?').run('admin', admin2.id);
      }
    }

    await db.prepare('UPDATE usuarios SET activo = 1 WHERE id = ?').run(adminRoot.id);

    const adminsDespues = await db.prepare('SELECT id FROM usuarios WHERE rol = ? ORDER BY id ASC').all('admin');
    if (adminsDespues.length > 2) {
      const idsExtras = adminsDespues.slice(2).map((a) => a.id);
      for (const extraId of idsExtras) {
        await db.prepare('UPDATE usuarios SET rol = ? WHERE id = ?').run('vendedor', extraId);
      }
      console.log(`⚠️ Se normalizaron ${idsExtras.length} admins extra a rol vendedor para mantener máximo 2 admins root.`);
    }

    if (!adminRoot.equipo_id) {
      const teamCreated = await db.prepare('INSERT INTO equipos (nombre, owner_id) VALUES (?, ?)').run('Panel Admin Root', adminRoot.id);
      await db.prepare('UPDATE usuarios SET "equipo_id" = ? WHERE id = ?').run(teamCreated.lastInsertRowid, adminRoot.id);
    }
  } catch (e) {
    console.error('⚠️ Error asegurando admins root:', e.message);
  }
};

initDb();

module.exports = { db, isPostgres };

