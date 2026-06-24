const { db } = require('./config/database');

async function main() {
    try {
        await db.prepare(`
            UPDATE usuarios 
            SET nombre = 'brayan',
                email = 'eligiobrayanrod@gmail.com',
                telefono = '8186319276'
            WHERE usuario = 'brayan'
        `).run();
        console.log("Datos restaurados.");
    } catch (e) {
        console.error("Error:", e);
    } finally {
        process.exit(0);
    }
}
main();
