require('dotenv').config();
const { db } = require('../config/database');

(async () => {
    try {
        const users = await db.prepare("SELECT id, usuario, nombre, rol FROM usuarios WHERE nombre ILIKE '%brayan%' OR usuario ILIKE '%brayan%'").all();
        console.log('Usuarios encontrados:', JSON.stringify(users, null, 2));
        
        // Buscar clientes para cada uno de estos usuarios
        for (const u of users) {
            const clients = await db.prepare(`
                SELECT id, nombres, "apellidoPaterno" 
                FROM clientes 
                WHERE "prospectorAsignado" = $1 
                   OR "closerAsignado" = $1 
                   OR "vendedorAsignado" = $1 
                   OR "propietarioId" = $1
            `).all(u.id);
            console.log(`Clientes para ${u.usuario} (${u.nombre} - ID ${u.id}):`, clients.length);
            if (clients.length > 0) {
                console.log(JSON.stringify(clients, null, 2));
            }
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
    process.exit();
})();
