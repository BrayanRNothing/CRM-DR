require('dotenv').config();
const bcrypt = require('bcryptjs');
const { db } = require('./config/database');

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

        const hashDoctor = await bcrypt.hash('doctor123', 10);

        db.prepare('INSERT INTO usuarios (usuario, contraseña, rol, nombre, email, telefono) VALUES (?, ?, ?, ?, ?, ?)')
            .run('doctor', hashDoctor, 'doctor', 'Administrador CRM', 'admin@crmmedico.com', '5551234567');

        console.log('👥 Usuario Administrador creado');
        console.log('\n✅ Seed completado');
        console.log('\n📝 Credenciales:');
        console.log('   Doctor Admin: doctor / doctor123');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

seedData();
