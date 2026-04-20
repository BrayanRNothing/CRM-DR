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

        const hashVendedor = await bcrypt.hash('vendedor123', 10);
        const hashAdmin = await bcrypt.hash('admin123', 10);

        await db.prepare('INSERT INTO usuarios (usuario, contraseña, rol, nombre, email, telefono, activo) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .run('admin', hashAdmin, 'admin', 'Administrador Sistema', 'admin@crm.com', '5550000000', 1);

        await db.prepare('INSERT INTO usuarios (usuario, contraseña, rol, nombre, email, telefono, activo) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .run('vendedor', hashVendedor, 'vendedor', 'Vendedor Demo', 'vendedor@crm.com', '5554444444', 1);

        console.log('👥 Usuarios creados (admin, vendedor)');
        console.log('\n✅ Seed completado');
        console.log('\n📝 Credenciales:');
        console.log('   Admin:      admin / admin123            →  /vendedor/admin');
        console.log('   Vendedor:   vendedor / vendedor123      →  /vendedor');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

seedData();
