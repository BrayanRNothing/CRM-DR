const { db } = require('./backend/config/database');

async function verify() {
    try {
        console.log('Verificando tabla actividades...');
        // Intentar insertar una actividad sin cliente
        const res = await db.prepare('INSERT INTO actividades (tipo, vendedor, descripcion, resultado) VALUES (?, ?, ?, ?)')
            .run('test', 1, 'Test activity without client', 'exitoso');
        
        console.log('✅ Inserción sin cliente exitosa. ID:', res.lastInsertRowid);
        
        const rows = await db.prepare('SELECT * FROM actividades WHERE id = ?').all(res.lastInsertRowid);
        console.log('Fila insertada:', rows[0]);
        
        // Limpiar
        await db.prepare('DELETE FROM actividades WHERE id = ?').run(res.lastInsertRowid);
        console.log('✅ Limpieza exitosa.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error en verificación:', error);
        process.exit(1);
    }
}

verify();
