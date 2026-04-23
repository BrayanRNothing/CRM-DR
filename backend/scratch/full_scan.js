require('dotenv').config();
const { db } = require('../config/database');

(async () => {
    try {
        console.log('--- ESCANEO GLOBAL DE CLIENTES ---');
        const all = await db.prepare(`
            SELECT id, nombres, "apellidoPaterno", "etapaEmbudo", "prospectorAsignado", "closerAsignado", "propietarioId" 
            FROM clientes
        `).all();
        console.log('Total registros:', all.length);
        console.log(JSON.stringify(all, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    }
    process.exit();
})();
