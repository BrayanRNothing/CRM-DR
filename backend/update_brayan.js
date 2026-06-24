const { db } = require('./config/database');
const bcrypt = require('bcryptjs');

async function main() {
    try {
        console.log("Buscando usuario 'brayan'...");
        const user = await db.prepare("SELECT * FROM usuarios WHERE usuario = 'brayan'").get();
        
        if (user) {
            console.log("Usuario encontrado:", user);
            console.log("Actualizando datos...");
            await db.prepare(`
                UPDATE usuarios 
                SET nombre = 'Brayan Developer',
                    email = 'brayan.dev@example.com',
                    telefono = '+52 55 9876 5432'
                WHERE usuario = 'brayan'
            `).run();
            console.log("Datos actualizados correctamente.");
        } else {
            console.log("Usuario 'brayan' no existe. Creando uno nuevo...");
            const hash = await bcrypt.hash('brayan123', 10);
            await db.prepare(`
                INSERT INTO usuarios (usuario, contraseña, rol, nombre, email, telefono, activo)
                VALUES ('brayan', '${hash}', 'admin', 'Brayan Developer', 'brayan.dev@example.com', '+52 55 9876 5432', 1)
            `).run();
            console.log("Usuario creado correctamente con contraseña: 'brayan123'.");
        }
    } catch (e) {
        console.error("Error:", e);
    } finally {
        process.exit(0);
    }
}
main();
