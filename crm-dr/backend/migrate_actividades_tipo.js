const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.db');
const db = new Database(dbPath);

try {
  db.exec('BEGIN TRANSACTION');
  
  // 1. Rename existing table
  db.exec('ALTER TABLE actividades RENAME TO actividades_old');
  
  // 2. Create new table without the CHECK constraint on tipo
  db.exec(`
    CREATE TABLE actividades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT NOT NULL,
        vendedor INTEGER NOT NULL REFERENCES usuarios(id),
        cliente INTEGER NOT NULL REFERENCES clientes(id),
        fecha TEXT DEFAULT (datetime('now')),
        descripcion TEXT,
        resultado TEXT DEFAULT 'pendiente' CHECK(resultado IN ('exitoso','pendiente','fallido')),
        cambioEtapa INTEGER DEFAULT 0,
        etapaAnterior TEXT,
        etapaNueva TEXT,
        notas TEXT
    )
  `);
  
  // 3. Copy data
  db.exec(`
    INSERT INTO actividades (id, tipo, vendedor, cliente, fecha, descripcion, resultado, cambioEtapa, etapaAnterior, etapaNueva, notas)
    SELECT id, tipo, vendedor, cliente, fecha, descripcion, resultado, cambioEtapa, etapaAnterior, etapaNueva, notas
    FROM actividades_old
  `);
  
  // 4. Drop old table
  db.exec('DROP TABLE actividades_old');
  
  // 5. Recreate indexes
  db.exec('CREATE INDEX idx_actividades_vendedor ON actividades(vendedor)');
  db.exec('CREATE INDEX idx_actividades_fecha ON actividades(fecha)');
  db.exec('CREATE INDEX idx_actividades_cliente ON actividades(cliente)');
  
  db.exec('COMMIT');
  console.log('Migration successful: CHECK constraint removed from actividades.tipo');
} catch (error) {
  db.exec('ROLLBACK');
  console.error('Error during migration:', error);
} finally {
  db.close();
}
