CREATE TABLE sqlite_sequence(name,seq)

CREATE TABLE clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombres TEXT NOT NULL,
    apellidoPaterno TEXT NOT NULL,
    apellidoMaterno TEXT,
    telefono TEXT NOT NULL,
    correo TEXT NOT NULL,
    empresa TEXT,
    estado TEXT DEFAULT 'proceso' CHECK(estado IN ('ganado','perdido','proceso')),
    etapaEmbudo TEXT DEFAULT 'prospecto_nuevo',
    prospectorAsignado INTEGER REFERENCES "usuarios_old"(id),
    closerAsignado INTEGER REFERENCES "usuarios_old"(id),
    fechaTransferencia TEXT,
    fechaUltimaEtapa TEXT DEFAULT (datetime('now')),
    historialEmbudo TEXT,
    vendedorAsignado INTEGER NOT NULL REFERENCES "usuarios_old"(id),
    fechaRegistro TEXT DEFAULT (datetime('now')),
    ultimaInteraccion TEXT DEFAULT (datetime('now')),
    notas TEXT
  )

CREATE TABLE actividades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL CHECK(tipo IN ('llamada','mensaje','correo','whatsapp','cita','prospecto')),
    vendedor INTEGER NOT NULL REFERENCES "usuarios_old"(id),
    cliente INTEGER NOT NULL REFERENCES clientes(id),
    fecha TEXT DEFAULT (datetime('now')),
    descripcion TEXT,
    resultado TEXT DEFAULT 'pendiente' CHECK(resultado IN ('exitoso','pendiente','fallido')),
    cambioEtapa INTEGER DEFAULT 0,
    etapaAnterior TEXT,
    etapaNueva TEXT,
    notas TEXT
  )

CREATE TABLE tareas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    vendedor INTEGER REFERENCES "usuarios_old"(id),
    cliente INTEGER REFERENCES clientes(id),
    estado TEXT DEFAULT 'pendiente',
    prioridad TEXT DEFAULT 'media',
    fechaLimite TEXT,
    completada INTEGER DEFAULT 0,
    fechaCreacion TEXT DEFAULT (datetime('now'))
  )

CREATE TABLE ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente INTEGER NOT NULL REFERENCES clientes(id),
    vendedor INTEGER NOT NULL REFERENCES "usuarios_old"(id),
    monto REAL NOT NULL,
    fecha TEXT DEFAULT (datetime('now')),
    estado TEXT DEFAULT 'pendiente',
    notas TEXT
  )

CREATE INDEX idx_clientes_prospector ON clientes(prospectorAsignado)

CREATE INDEX idx_clientes_vendedor ON clientes(vendedorAsignado)

CREATE INDEX idx_actividades_vendedor ON actividades(vendedor)

CREATE INDEX idx_actividades_fecha ON actividades(fecha)

CREATE INDEX idx_actividades_cliente ON actividades(cliente)

CREATE TABLE usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario TEXT UNIQUE NOT NULL,
            contraseña TEXT NOT NULL,
            rol TEXT NOT NULL CHECK(rol IN ('prospector','closer')),
            nombre TEXT NOT NULL,
            email TEXT,
            telefono TEXT,
            activo INTEGER DEFAULT 1,
            fechaCreacion TEXT DEFAULT (datetime('now'))
        , googleRefreshToken TEXT, googleAccessToken TEXT, googleTokenExpiry REAL)