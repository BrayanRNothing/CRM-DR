require('dotenv').config();
const { db } = require('../config/database');

(async () => {
    try {
        const users = await db.prepare("SELECT id, usuario, nombre FROM usuarios WHERE usuario = 'brayan'").all();
        console.log('Usuarios con login EXACTO brayan:', JSON.stringify(users, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    }
    process.exit();
})();
