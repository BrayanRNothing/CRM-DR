const Database = require('better-sqlite3');
const db = new Database('c:/Users/Brayan/Downloads/Proyectos Software/CRM-V20/backend/crm.db');

const emailToFree = 'eligiobrayanrod@gmail.com';
const user = db.prepare('SELECT id, usuario FROM usuarios WHERE LOWER(email) = LOWER(?)').get(emailToFree);

if (user) {
const deletedSuffix = "_deleted_" + Date.now();
    const newUsuario = user.usuario + deletedSuffix;
    const newEmail = emailToFree + deletedSuffix;
    
    db.prepare('UPDATE usuarios SET email = ?, usuario = ? WHERE id = ?').run(newEmail, newUsuario, user.id);
    console.log("✅ Correo liberado. El usuario " + user.usuario + " ahora es " + newUsuario + " y el correo " + newEmail);
} else {
    console.log("❌ No se encontró ningún usuario con el correo " + emailToFree);
}

db.close();
