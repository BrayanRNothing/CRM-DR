const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');

async function checkDb() {
    const dbPath = path.join(__dirname, 'backend', 'database.sqlite');
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    console.log('--- ACTIVIDADES (Citas) ---');
    const cita = await db.get("SELECT * FROM actividades WHERE tipo = 'cita' LIMIT 1");
    console.log(JSON.stringify(cita, null, 2));

    console.log('\n--- CLIENTES (Con Cita) ---');
    if (cita) {
        const cliente = await db.get("SELECT * FROM clientes WHERE id = ?", [cita.cliente]);
        console.log(JSON.stringify(cliente, null, 2));
    }
    
    await db.close();
}

checkDb().catch(console.error);
