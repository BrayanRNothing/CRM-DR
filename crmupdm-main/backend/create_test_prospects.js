// No dependencies needed beyond db
const { db } = require('./config/database');

const firstNames = ["Juan", "María", "Carlos", "Ana", "Luis", "Elena", "Pedro", "Laura", "Jorge", "Carmen", "Javier", "Sofía", "Diego", "Lucía", "Miguel", "Paula", "Andrés", "Valeria", "Fernando", "Isabella"];
const lastNames = ["García", "Rodríguez", "López", "Martínez", "González", "Pérez", "Sánchez", "Gómez", "Fernández", "Díaz", "Romero", "Suárez", "Torres", "Ruiz", "Hernández"];
const companies = ["TechCorp", "Innovate SA", "Global Solutions", "Acme Inc", "Alpha Systems", "Future Enterprises", "Beta Group", "Omega LLC"];

const generateProspects = (count) => {
    const insertStmt = db.prepare(`
    INSERT INTO clientes (nombres, apellidoPaterno, apellidoMaterno, telefono, correo, empresa, estado, etapaEmbudo, prospectorAsignado, vendedorAsignado, notas)
    VALUES (?, ?, ?, ?, ?, ?, 'proceso', 'prospecto_nuevo', 1, 1, ?)
  `);

    db.transaction(() => {
        for (let i = 0; i < count; i++) {
            const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
            const ln1 = lastNames[Math.floor(Math.random() * lastNames.length)];
            const ln2 = lastNames[Math.floor(Math.random() * lastNames.length)];
            const company = companies[Math.floor(Math.random() * companies.length)] + (Math.random() > 0.5 ? " " + Math.floor(Math.random() * 100) : "");
            const phone = "555" + String(Math.floor(Math.random() * 10000000)).padStart(7, '0');
            const email = `${fn.toLowerCase()}.${ln1.toLowerCase()}${i}@ejemplo.com`;
            const note = `Prospecto de prueba #${i + 1} generado automáticamente.`;

            insertStmt.run(fn, ln1, ln2, phone, email, company, note);
        }
    })();

    console.log(`✅ ¡Se han insertado exitosamente ${count} prospectos de prueba asignados al usuario con ID 1 (prospector)!`);
};

try {
    generateProspects(40);
    process.exit(0);
} catch (error) {
    console.error('❌ Error al crear los prospectos:', error);
    process.exit(1);
}
