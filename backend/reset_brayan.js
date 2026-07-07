require('dotenv').config();
const { db } = require('./config/database');

async function resetAllBrayans() {
    try {
        console.log('Iniciando limpieza de datos para todos los usuarios relacionados a Brayan...');
        
        // Buscar a todos los usuarios que tengan 'brayan'
        const users = await db.prepare(
            "SELECT id, usuario, nombre, rol FROM usuarios WHERE LOWER(usuario) LIKE '%brayan%' OR LOWER(nombre) LIKE '%brayan%'"
        ).all();

        if (users.length === 0) {
            console.log('No se encontraron usuarios brayan.');
            process.exit(1);
        }

        const ids = users.map(u => u.id);
        console.log(`Usuarios encontrados: ${users.map(u => u.usuario).join(', ')}`);
        
        const placeholders = ids.map(() => '?').join(',');

        try {
            await db.exec('BEGIN');
        } catch (e) {
            try { await db.exec('BEGIN TRANSACTION'); } catch (e2) {}
        }

        try {
            // Find clients associated with these users
            const clients = await db.prepare(`SELECT id FROM clientes WHERE "vendedorAsignado" IN (${placeholders}) OR "prospectorAsignado" IN (${placeholders}) OR "closerAsignado" IN (${placeholders}) OR "propietarioId" IN (${placeholders})`)
                .all(...ids, ...ids, ...ids, ...ids);
            
            let clientIds = clients.map(c => c.id);
            if (clientIds.length > 0) {
                const cPlaceholders = clientIds.map(() => '?').join(',');
                
                const actCli = await db.prepare(`DELETE FROM actividades WHERE cliente IN (${cPlaceholders})`).run(...clientIds);
                console.log(`Actividades de clientes eliminadas: ${actCli.changes}`);
                
                const tarCli = await db.prepare(`DELETE FROM tareas WHERE cliente IN (${cPlaceholders})`).run(...clientIds);
                console.log(`Tareas de clientes eliminadas: ${tarCli.changes}`);
                
                const venCli = await db.prepare(`DELETE FROM ventas WHERE cliente IN (${cPlaceholders})`).run(...clientIds);
                console.log(`Ventas de clientes eliminadas: ${venCli.changes}`);
            }

            // Eliminar ventas (las creadas por estos usuarios)
            const ventas = await db.prepare(`DELETE FROM ventas WHERE vendedor IN (${placeholders})`).run(...ids);
            console.log(`Ventas de usuarios eliminadas: ${ventas.changes}`);

            // Eliminar tareas (creadas por estos usuarios)
            const tareas = await db.prepare(`DELETE FROM tareas WHERE vendedor IN (${placeholders})`).run(...ids);
            console.log(`Tareas de usuarios eliminadas: ${tareas.changes}`);

            // Eliminar actividades (creadas por estos usuarios)
            const actividades = await db.prepare(`DELETE FROM actividades WHERE vendedor IN (${placeholders})`).run(...ids);
            console.log(`Actividades de usuarios eliminadas: ${actividades.changes}`);

            // Eliminar clientes asignados a estos usuarios
            const clientesDel = await db.prepare(`DELETE FROM clientes WHERE "vendedorAsignado" IN (${placeholders}) OR "prospectorAsignado" IN (${placeholders}) OR "closerAsignado" IN (${placeholders}) OR "propietarioId" IN (${placeholders})`).run(...ids, ...ids, ...ids, ...ids);
            console.log(`Clientes eliminados: ${clientesDel.changes}`);

            try { await db.exec('COMMIT'); } catch (e) { console.error(e); }
            console.log('Limpieza completada exitosamente.');

        } catch (error) {
            try { await db.exec('ROLLBACK'); } catch (e) {}
            console.error('Error durante la transacción, se han revertido los cambios:', error);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

resetAllBrayans();
