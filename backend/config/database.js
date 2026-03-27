/**
 * Configuración de base de datos
 * PostgreSQL only
 */

const { Pool } = require('pg');

let internalDb;
const isPostgres = true;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no configurada. Este backend requiere PostgreSQL y ya no usa SQLite.');
}

console.log('🌐 Conectando a PostgreSQL...');
internalDb = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Lista de columnas camelCase que Postgres almacena en minúsculas
const CAMEL_COLS = [
  'apellidoPaterno', 'apellidoMaterno', 'etapaEmbudo', 'prospectorAsignado',
  'closerAsignado', 'fechaTransferencia', 'fechaUltimaEtapa', 'historialEmbudo',
  'vendedorAsignado', 'fechaRegistro', 'ultimaInteraccion', 'proximaLlamada',
  'cambioEtapa', 'etapaAnterior', 'etapaNueva', 'fechaLimite', 'fechaCreacion',
  'googleRefreshToken', 'googleAccessToken', 'googleTokenExpiry',
  'vendedorNombre', 'vendedorRol', 'closerNombre', 'sitioWeb', 'googleMeetLink',
  'customMetricLabel', 'customMetricValue'
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
  ultimainteraccion: 'ultimaInteraccion', proximallamada: 'proximaLlamada',
  cambioetapa: 'cambioEtapa', etapaanterior: 'etapaAnterior',
  etapanueva: 'etapaNueva', fechalimite: 'fechaLimite',
  fechacreacion: 'fechaCreacion', googlerefreshtoken: 'googleRefreshToken',
  googleaccesstoken: 'googleAccessToken', googletokenexpiry: 'googleTokenExpiry',
  vendedornombre: 'vendedorNombre', vendedorrol: 'vendedorRol', closernombre: 'closerNombre',
  sitioweb: 'sitioWeb', googlemeetlink: 'googleMeetLink',
  custommetriclabel: 'customMetricLabel', custommetricvalue: 'customMetricValue'
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
    rol TEXT NOT NULL CHECK(rol IN ('prospector','closer','vendedor')),
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
    notas TEXT,
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
      const hashProspector = await bcrypt.hash('prospector123', 10);
      const hashCloser = await bcrypt.hash('closer123', 10);

      await db.prepare('INSERT INTO usuarios (usuario, contraseña, rol, nombre, email, telefono) VALUES (?, ?, ?, ?, ?, ?)')
        .run('prospector', hashProspector, 'prospector', 'Alex Mendoza', 'prospector@crm.com', '5554444444');

      await db.prepare('INSERT INTO usuarios (usuario, contraseña, rol, nombre, email, telefono) VALUES (?, ?, ?, ?, ?, ?)')
        .run('closer', hashCloser, 'closer', 'Fernando Ruiz', 'closer@crm.com', '5555555555');

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
      ['usuarios',  '"googleTokenExpiry"',  'TIMESTAMPTZ'],
      ['clientes',  'ubicacion',            'TEXT'],
      ['clientes',  '"sitioWeb"',           'TEXT'],
      ['clientes',  'telefono2',            'TEXT'],
      ['clientes',  '"proximaLlamada"',     'TIMESTAMPTZ'],
      ['clientes',  'interes',              'TEXT'],
      ['usuarios',  'activo',               'INTEGER DEFAULT 1'],
      ['actividades', '"googleMeetLink"',   'TEXT'],
      ['actividades', '"createdAt"',        'TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP'],
      ['clientes',    '"customMetricLabel"', 'TEXT'],
      ['clientes',    '"customMetricValue"', 'TEXT'],
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
  } else {
    // SQLite: agregar columnas faltantes
    const colsMissingSqlite = [
      ['clientes', 'ubicacion TEXT'],
      ['clientes', 'sitioWeb TEXT'],
      ['clientes', 'telefono2 TEXT'],
      ['clientes', 'proximaLlamada TEXT'],
      ['clientes', 'interes TEXT'],
      ['usuarios', 'activo INTEGER DEFAULT 1'],
      ['usuarios', 'googleRefreshToken TEXT'],
      ['usuarios', 'googleAccessToken TEXT'],
      ['usuarios', 'googleTokenExpiry REAL'],
      ['actividades', 'createdAt TEXT DEFAULT (datetime(\'now\'))'],
      ['clientes', 'customMetricLabel TEXT'],
      ['clientes', 'customMetricValue TEXT'],
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

      const needsRoleMigration = usuariosSql?.sql && !usuariosSql.sql.includes("'vendedor'");
      if (needsRoleMigration) {
        internalDb.exec('PRAGMA foreign_keys = OFF');
        internalDb.exec('BEGIN TRANSACTION');

        internalDb.exec(`
          CREATE TABLE IF NOT EXISTS usuarios_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario TEXT UNIQUE NOT NULL,
            contraseña TEXT NOT NULL,
            rol TEXT NOT NULL CHECK(rol IN ('prospector','closer','vendedor','admin','superadmin')),
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
            id, usuario, contraseña, rol, nombre, email, telefono, activo,
            fechaCreacion, googleRefreshToken, googleAccessToken, googleTokenExpiry
          FROM usuarios;
        `);

        internalDb.exec('DROP TABLE usuarios');
        internalDb.exec('ALTER TABLE usuarios_new RENAME TO usuarios');
        internalDb.exec('COMMIT');
        internalDb.exec('PRAGMA foreign_keys = ON');
        console.log('✅ SQLite: migración de roles en usuarios completada (incluye vendedor)');
      }
    } catch (e) {
      try { internalDb.exec('ROLLBACK'); } catch (_) { /* no-op */ }
      try { internalDb.exec('PRAGMA foreign_keys = ON'); } catch (_) { /* no-op */ }
      console.error('⚠️ SQLite: error migrando constraint de rol en usuarios:', e.message);
    }
    
    try {
      internalDb.prepare(`UPDATE clientes SET etapaEmbudo = 'prospecto_nuevo' WHERE etapaEmbudo IS NULL`).run();
    } catch (e) { /* ignorar */ }
  }

  // MIGRACIÓN POSTGRESQL PARA EL NUEVO ROL (vendedor)
  if (isPostgres) {
    try {
        // Remover el constraint anterior y añadir el nuevo (con 'vendedor')
        await internalDb.query(`
            ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
            ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check CHECK (rol IN ('prospector', 'closer', 'vendedor'));
        `);
        console.log('✅ Migración: Constraint de rol actualizado en Postgres para incluir "vendedor"');
    } catch(e) {
        console.error('⚠️ Migración: Error actualizando constraint de rol en Postgres:', e.message);
    }
  }
};

initDb();

module.exports = { db, isPostgres };

