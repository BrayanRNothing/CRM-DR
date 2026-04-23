require('dotenv').config();
const { db } = require('../config/database');

(async () => {
    try {
        console.log('--- Listando TODOS los clientes ---');
        const clients = await db.prepare(`
            SELECT id, nombres, "apellidoPaterno", "prospectorAsignado", "closerAsignado", "propietarioId" 
            FROM clientes
        `).all();
        console.log(JSON.stringify(clients, null, 2));
        
        console.log('--- Listando TODOS los usuarios ---');
        const users = await db.prepare('SELECT id, nombre, rol FROM usuarios').all();
        console.log(JSON.stringify(users, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    }
    process.exit();
})();
