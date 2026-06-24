require('dotenv').config();
const { db } = require('./config/database');

// Datos de prueba (Nombres, apellidos, empresas)
const nombres = ['Alejandro', 'Sofia', 'Carlos', 'Mariana', 'Fernando', 'Valeria', 'Roberto', 'Camila', 'Javier', 'Lucia', 'Daniel', 'Andrea', 'Diego', 'Paula', 'Jorge'];
const apellidos = ['García', 'Martínez', 'Rodríguez', 'López', 'Hernández', 'Pérez', 'González', 'Sánchez', 'Ramírez', 'Cruz', 'Flores', 'Gómez', 'Morales', 'Reyes'];
const empresas = ['Tech Solutions', 'Innovación Digital', 'Servicios Globales', 'Consultoría Pro', 'MegaCorp', 'Comercializadora MX', 'Construcciones del Norte', 'Logística Express', 'Agencia Creativa', 'Grupo Financiero'];
const industrias = ['Tecnología', 'Salud', 'Finanzas', 'Educación', 'Retail', 'Construcción', 'Manufactura'];
const etapas = ['prospecto_nuevo', 'contacto_establecido', 'cita_agendada', 'propuesta_enviada', 'negociacion'];

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomPhone = () => `+5255${Math.floor(10000000 + Math.random() * 90000000)}`;

async function seedData() {
    try {
        console.log("🔍 Buscando usuario 'brayan'...");
        const user = await db.prepare("SELECT id, equipo_id FROM usuarios WHERE usuario = 'brayan'").get();

        if (!user) {
            console.error("❌ El usuario 'brayan' no existe en la base de datos.");
            process.exit(1);
        }

        const userId = user.id;
        const equipoId = user.equipo_id || null;
        console.log(`✅ Usuario encontrado. ID: ${userId}, Equipo: ${equipoId}`);
        console.log("🚀 Generando 50 prospectos/clientes y sus datos relacionados...");

        let clientesCreados = 0;
        let actividadesCreadas = 0;
        let tareasCreadas = 0;
        let ventasCreadas = 0;

        for (let i = 0; i < 50; i++) {
            const nombre = randomItem(nombres);
            const apellido1 = randomItem(apellidos);
            const apellido2 = randomItem(apellidos);
            const empresa = Math.random() > 0.3 ? randomItem(empresas) + ' ' + Math.floor(Math.random() * 100) : null;
            const correo = `${nombre.toLowerCase()}.${apellido1.toLowerCase()}${Math.floor(Math.random() * 100)}@ejemplo.com`;
            const telefono = randomPhone();
            const esGanado = Math.random() > 0.8; 
            const esPerdido = !esGanado && Math.random() > 0.8;
            let estado = 'proceso';
            if (esGanado) estado = 'ganado';
            if (esPerdido) estado = 'perdido';

            const etapaEmbudo = estado === 'proceso' ? randomItem(etapas) : (estado === 'ganado' ? 'cerrado' : 'perdido');

            // Insertar cliente
            const clienteInsert = await db.prepare(`
                INSERT INTO clientes (
                    nombres, "apellidoPaterno", "apellidoMaterno", telefono, correo, empresa, 
                    estado, "etapaEmbudo", "vendedorAsignado", "prospectorAsignado", 
                    "propietarioId", equipo_id, "fechaRegistro"
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                nombre, apellido1, apellido2, telefono, correo, empresa, 
                estado, etapaEmbudo, userId, userId, 
                userId, equipoId, new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
            );

            const clienteId = clienteInsert.lastInsertRowid;
            if(!clienteId) continue; // Si postgres no retornó lastInsertRowid correctamente, saltamos relaciones
            clientesCreados++;

            // Generar 1 a 4 actividades por cliente
            const numActividades = Math.floor(Math.random() * 4) + 1;
            for (let j = 0; j < numActividades; j++) {
                const tipos = ['llamada', 'correo', 'whatsapp', 'cita'];
                const resultados = ['exitoso', 'pendiente', 'fallido'];
                await db.prepare(`
                    INSERT INTO actividades (
                        tipo, vendedor, cliente, descripcion, resultado, equipo_id, fecha
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(
                    randomItem(tipos), userId, clienteId, 
                    `Seguimiento rutinario con ${nombre}`, randomItem(resultados), equipoId,
                    new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000).toISOString()
                );
                actividadesCreadas++;
            }

            // Generar 0 a 2 tareas por cliente
            if (estado === 'proceso') {
                const numTareas = Math.floor(Math.random() * 3);
                for (let k = 0; k < numTareas; k++) {
                    await db.prepare(`
                        INSERT INTO tareas (
                            titulo, descripcion, vendedor, cliente, estado, "fechaLimite", equipo_id
                        ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    `).run(
                        `Contactar a ${nombre}`, 'Revisar propuesta económica y enviar cotización',
                        userId, clienteId, Math.random() > 0.5 ? 'completada' : 'pendiente',
                        new Date(Date.now() + (Math.random() * 10 - 5) * 24 * 60 * 60 * 1000).toISOString(),
                        equipoId
                    );
                    tareasCreadas++;
                }
            }

            // Si fue ganado, generar 1 venta
            if (estado === 'ganado') {
                const monto = Math.floor(Math.random() * 50000) + 5000;
                await db.prepare(`
                    INSERT INTO ventas (
                        cliente, vendedor, monto, estado, fecha
                    ) VALUES (?, ?, ?, ?, ?)
                `).run(
                    clienteId, userId, monto, 'completado', 
                    new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString()
                );
                ventasCreadas++;
            }
        }

        console.log("=========================================");
        console.log("✅ DATOS GENERADOS CON ÉXITO PARA BRAYAN");
        console.log(`👤 Clientes/Prospectos: ${clientesCreados}`);
        console.log(`📞 Actividades (Reuniones/Llamadas): ${actividadesCreadas}`);
        console.log(`📝 Tareas: ${tareasCreadas}`);
        console.log(`💰 Ventas generadas: ${ventasCreadas}`);
        console.log("=========================================");

    } catch (error) {
        console.error("❌ Error generando datos:", error);
    } finally {
        process.exit(0);
    }
}

seedData();
