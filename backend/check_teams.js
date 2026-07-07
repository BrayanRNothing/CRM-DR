require('dotenv').config();
const { db } = require('./config/database');

async function checkTeams() {
    const brayans = await db.prepare("SELECT id, usuario, equipo_id FROM usuarios WHERE LOWER(usuario) LIKE '%brayan%' OR LOWER(nombre) LIKE '%brayan%'").all();
    const equipoIds = brayans.map(u => u.equipo_id).filter(e => e !== null && e !== undefined);
    
    if (equipoIds.length > 0) {
        const placeholders = equipoIds.map(() => '?').join(',');
        const usersInTeam = await db.prepare(`SELECT id, usuario, equipo_id FROM usuarios WHERE equipo_id IN (${placeholders})`).all(...equipoIds);
        console.log('Usuarios en estos equipos:', usersInTeam);
        
        const clientsInTeam = await db.prepare(`SELECT COUNT(*) as c FROM clientes WHERE equipo_id IN (${placeholders})`).get(...equipoIds);
        console.log('Clientes en estos equipos:', clientsInTeam.c);
    }
}
checkTeams().then(() => process.exit(0)).catch(e => console.error(e));
