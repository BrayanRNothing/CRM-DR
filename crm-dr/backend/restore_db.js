const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const backupPath = path.join(__dirname, 'database_backup.db');
const walPath = path.join(__dirname, 'database.db-wal');
const shmPath = path.join(__dirname, 'database.db-shm');

if (!fs.existsSync(backupPath)) {
    console.error('❌ No se encontró el checkpoint (database_backup.db).');
    console.log('Debes crear un checkpoint primero corriendo: npm run db:backup');
    process.exit(1);
}

console.log('Restaurando desde el checkpoint...');

try {
    // Intentamos copiar el backup encima del original
    fs.copyFileSync(backupPath, dbPath);

    // Si la BD original usa WAL y la de backup no lo copió (SQLite backup quita la necesidad de copiarlos),
    // debemos borrarlos para evitar corromperse con estados viejos en memoria
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

    console.log('✅ Base de datos restaurada correctamente al punto del último checkpoint.');
    console.log('⚠️ NOTA IMPORTANTE: Si backend está corriendo en la consola, debes DETENERLO (Ctrl+C)');
    console.log('y volver a iniciarlo usando "npm run dev:windows" o "npm start" para evitar problemas.');

} catch (error) {
    console.error('❌ Error al restaurar:', error.message);
    if (error.code === 'EBUSY' || error.message.includes('EBUSY') || error.message.includes('EPERM')) {
        console.error('================================================================');
        console.error('El archivo está bloqueado por el servidor en ejecución.');
        console.error('Por favor, DETÉN el backend presionando Ctrl+C en su terminal,');
        console.error('luego ejecuta este comando de nuevo, y reinicia el backend.');
        console.error('================================================================');
    }
}
