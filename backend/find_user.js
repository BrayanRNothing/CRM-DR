require('dotenv').config();
const { db } = require('./config/database');

async function findUser() {
    const users = await db.prepare(
        "SELECT id, usuario, nombre, rol, equipo_id FROM usuarios WHERE LOWER(usuario) LIKE '%alejandro%' OR LOWER(nombre) LIKE '%alejandro%'"
    ).all();
    console.log('Usuarios encontrados:', JSON.stringify(users, null, 2));
    process.exit(0);
}
findUser().catch(e => { console.error(e); process.exit(1); });
