require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./config/database');

const seedData = async () => {
    try {
        // Limpiar datos anteriores
        db.pragma('foreign_keys = OFF');
        db.exec('DELETE FROM actividades');
        db.exec('DELETE FROM ventas');
        db.exec('DELETE FROM tareas');
        db.exec('DELETE FROM clientes');
        db.exec('DELETE FROM usuarios');
        db.exec("UPDATE sqlite_sequence SET seq = 0 WHERE name IN ('usuarios','clientes','actividades','tareas','ventas')");
        db.pragma('foreign_keys = ON');
        console.log('🗑️  Datos anteriores eliminados');

        const hashProspector = await bcrypt.hash('prospector123', 10);
        const hashCloser = await bcrypt.hash('closer123', 10);

        db.prepare('INSERT INTO usuarios (usuario, contraseña, rol, nombre, email, telefono) VALUES (?, ?, ?, ?, ?, ?)')
            .run('prospector', hashProspector, 'prospector', 'Alex Mendoza', 'prospector@crm.com', '5554444444');

        db.prepare('INSERT INTO usuarios (usuario, contraseña, rol, nombre, email, telefono) VALUES (?, ?, ?, ?, ?, ?)')
            .run('closer', hashCloser, 'closer', 'Fernando Ruiz', 'closer@crm.com', '5555555555');

        console.log('👥 Usuarios creados');
        console.log('\n✅ Seed completado');
        console.log('\n📝 Credenciales:');
        console.log('   Prospector: prospector / prospector123  →  /prospector');
        console.log('   Closer:     closer / closer123          →  /closer');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

seedData();
