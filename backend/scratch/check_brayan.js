require('dotenv').config();
const { db } = require('../config/database');

(async () => {
    try {
        console.log('--- DETALLE CLIENTES USUARIO BRAYAN (ID 5) ---');
        const res = await db.prepare('SELECT id, nombres, "apellidoPaterno", correo, telefono, notas, "etapaEmbudo" FROM clientes WHERE "prospectorAsignado" = 5 OR "propietarioId" = 5').all();
        console.log(JSON.stringify(res, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    }
    process.exit();
})();
