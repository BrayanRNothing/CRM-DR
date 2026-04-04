const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');

async function testProspectos() {
    const dbPath = path.join(__dirname, 'backend', 'database.sqlite');
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    const prospectorId = 1; // Ajusta según el ID del usuario
    const sql = `SELECT c.*, u.nombre as closerNombre,
        (
            SELECT MIN(t.fechaLimite)
            FROM tareas t
            WHERE t.cliente = c.id
              AND t.titulo = 'Recordatorio de llamada'
              AND t.estado = 'pendiente'
        ) as proximoRecordatorio,
        (
            SELECT MIN(a.fecha)
            FROM actividades a
            WHERE a.cliente = c.id
              AND a.tipo = 'cita'
              AND (a.resultado = 'pendiente' OR a.resultado IS NULL)
        ) as proximaCita
        FROM clientes c LEFT JOIN usuarios u ON c.closerAsignado = u.id WHERE c.etapaEmbudo NOT IN (?, ?)`;
    
    const rows = await db.all(sql, ['venta_ganada', 'perdido']);
    console.log('--- DB Rows (Primeros 2) ---');
    rows.slice(0, 2).forEach(r => console.log(JSON.stringify({ nombres: r.nombres, proximaLlamada: r.proximaLlamada, proximaCita: r.proximaCita }, null, 2)));

    await db.close();
}

testProspectos().catch(console.error);
