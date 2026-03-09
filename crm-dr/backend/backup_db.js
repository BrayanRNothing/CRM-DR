const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'database.db');
const backupPath = path.join(__dirname, 'database_backup.db');

async function createBackup() {
    try {
        if (!fs.existsSync(dbPath)) {
            console.error('❌ No se encontró database.db');
            return;
        }

        const db = new Database(dbPath);
        console.log('Creando checkpoint (backup) de la base de datos...');
        await db.backup(backupPath);
        console.log('✅ Checkpoint creado exitosamente en database_backup.db');
        console.log('Ahora puedes generar los datos de prueba y experimentar.');
        db.close();
    } catch (error) {
        console.error('❌ Error al crear checkpoint:', error);
    }
}

createBackup();
