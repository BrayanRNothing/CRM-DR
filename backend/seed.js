require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./config/database');

const seedData = async () => {
    try {
        const hashProspector = await bcrypt.hash('prospector123', 10);
        const hashCloser = await bcrypt.hash('closer123', 10);

        // Verificar si ya existen usuarios por defecto
        const { rows } = await pool.query(`SELECT COUNT(*) as total FROM usuarios`);
        if (parseInt(rows[0].total) > 0) {
            console.log('ℹ️  Ya existen usuarios, seed omitido.');
            process.exit(0);
        }

        await pool.query(
            `INSERT INTO usuarios (usuario, "contraseña", rol, nombre, email, telefono) VALUES ($1, $2, $3, $4, $5, $6)`,
            ['prospector', hashProspector, 'prospector', 'Alex Mendoza', 'prospector@crm.com', '5554444444']
        );

        await pool.query(
            `INSERT INTO usuarios (usuario, "contraseña", rol, nombre, email, telefono) VALUES ($1, $2, $3, $4, $5, $6)`,
            ['closer', hashCloser, 'closer', 'Fernando Ruiz', 'closer@crm.com', '5555555555']
        );

        console.log('✅ Seed completado');
        console.log('\n📝 Credenciales por defecto:');
        console.log('   Prospector: prospector / prospector123');
        console.log('   Closer:     closer     / closer123');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error en seed:', error.message);
        process.exit(1);
    }
};

seedData();
