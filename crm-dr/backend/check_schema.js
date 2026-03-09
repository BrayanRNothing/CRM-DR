const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'database.db');
const db = new Database(dbPath);

// Test update
const id = 5; // Diego Sánchez
const testDate = '2026-03-30T10:00';
db.prepare('UPDATE clientes SET proximaLlamada = ? WHERE id = ?').run(testDate, id);

// Test retrieval
const row = db.prepare('SELECT id, nombres, proximaLlamada FROM clientes WHERE id = ?').get(id);
console.log('Result:', JSON.stringify(row, null, 2));

// Cleanup (optional, but good for test)
// db.prepare('UPDATE clientes SET proximaLlamada = null WHERE id = ?').run(id);

db.close();
