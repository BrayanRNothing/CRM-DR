const { db } = require('./config/database');

function migrateRoles() {
    console.log("Starting migration to support 'admin' role...");
    
    // 1. Create new table without the restrictive CHECK on rol
    db.prepare(`
        CREATE TABLE usuarios_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario TEXT UNIQUE NOT NULL,
            contraseña TEXT NOT NULL,
            rol TEXT NOT NULL,
            nombre TEXT NOT NULL,
            email TEXT,
            telefono TEXT,
            activo INTEGER DEFAULT 1,
            fechaCreacion TEXT DEFAULT (datetime('now')),
            googleRefreshToken TEXT,
            googleAccessToken TEXT,
            googleTokenExpiry REAL
        )
    `).run();

    // 2. Copy data
    db.prepare(`
        INSERT INTO usuarios_new (id, usuario, contraseña, rol, nombre, email, telefono, activo, fechaCreacion, googleRefreshToken, googleAccessToken, googleTokenExpiry)
        SELECT id, usuario, contraseña, rol, nombre, email, telefono, activo, fechaCreacion, googleRefreshToken, googleAccessToken, googleTokenExpiry
        FROM usuarios
    `).run();

    // 3. Drop old table
    db.prepare(`DROP TABLE usuarios`).run();

    // 4. Rename new table
    db.prepare(`ALTER TABLE usuarios_new RENAME TO usuarios`).run();

    console.log("Migration complete!");
}

try {
    migrateRoles();
} catch (error) {
    console.error("Migration failed:", error);
}
