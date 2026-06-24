const { db } = require('./config/database');
const bcrypt = require('bcryptjs');

async function seedFakeUsers() {
    try {
        console.log("Iniciando inserción de usuarios falsos...");
        
        const fakeUsers = [
            { usuario: 'carlos_dev', nombre: 'Carlos Ruiz', email: 'carlos.ruiz@example.com', telefono: '5551234567', rol: 'vendedor' },
            { usuario: 'laura_mkt', nombre: 'Laura Gómez', email: 'laura.gomez@example.com', telefono: '5559876543', rol: 'admin' },
            { usuario: 'pedro_ventas', nombre: 'Pedro Sánchez', email: 'pedro.ventas@example.com', telefono: '5554567890', rol: 'vendedor' }
        ];

        const hash = await bcrypt.hash('password123', 10);

        for (const u of fakeUsers) {
            // Verificar si existe
            const exists = await db.prepare("SELECT * FROM usuarios WHERE usuario = ?").get(u.usuario);
            if (!exists) {
                await db.prepare(`
                    INSERT INTO usuarios (usuario, contraseña, rol, nombre, email, telefono, activo)
                    VALUES (?, ?, ?, ?, ?, ?, 1)
                `).run(u.usuario, hash, u.rol, u.nombre, u.email, u.telefono);
                console.log(`✅ Usuario creado: ${u.usuario} (${u.nombre})`);
            } else {
                console.log(`⚠️ Usuario ${u.usuario} ya existe, saltando...`);
            }
        }
        
        console.log("¡Usuarios insertados correctamente en la base de datos! (Contraseña para todos: password123)");
    } catch (error) {
        console.error("❌ Error insertando usuarios:", error);
    } finally {
        process.exit(0);
    }
}

seedFakeUsers();
