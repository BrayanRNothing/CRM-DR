require('dotenv').config();
const { db } = require('./config/database');

const ALEJANDRO_ID = 36;
const EQUIPO_ID = 6;

const nombres = ['Carlos','Luis','Miguel','Jorge','Roberto','Fernando','Eduardo','Ricardo','Pablo','Andrés','Juan','Sergio','Diego','Manuel','Héctor','Raúl','Alejandro','Gustavo','Javier','Antonio','María','Laura','Sofía','Valentina','Gabriela','Daniela','Camila','Lucía','Ana','Patricia','Isabel','Verónica','Mónica','Carolina','Fernanda','Claudia','Adriana','Sandra','Natalia','Rosa','Arturo','Ramón','Ernesto','Rodrigo','César','Enrique','Ignacio','Bernardo','Felipe','Álvaro'];
const apellidosP = ['García','Martínez','López','González','Rodríguez','Hernández','Pérez','Sánchez','Ramírez','Torres','Flores','Rivera','Gómez','Díaz','Cruz','Morales','Reyes','Gutiérrez','Ortiz','Castillo','Mendoza','Ríos','Vargas','Aguilar','Medina','Jiménez','Ruiz','Alvarado','Castro','Herrera','Silva','Romero','Núñez','Ramos','Moreno','Vega','Fuentes','Guerrero','Delgado','Peña','Vázquez','Soto','Contreras','Serrano','Navarro','Mendez','Lara','Cabrera','Ávila','Cortés'];
const apellidosM = ['Velázquez','Montes','Palacios','Espinoza','Tapia','Iglesias','Estrada','Mora','Pedraza','Salinas','Villanueva','Gallegos','Campos','Arias','Paredes','Acosta','Ibáñez','Carmona','Nieto','Domínguez'];
const empresas = ['Constructora Norteña','Distribuidora del Valle','Tecnologías Avanzadas','Seguros Confianza','Logística Express','Comercial Monterrey','Inversiones del Norte','Auto Partes Unidas','Servicios Integrales','Grupo Empresarial Alfa','Laboratorios Vida','Muebles El Hogar','Viajes y Turismo','Ferretería Central','Alimentos del Campo','Editorial Progreso','Farmacia San José','Hotel Las Palmas','Transporte Nacional','Metalúrgica Industrial','Constructora Sur','Servicios Financieros','Import Export Global','Energía Solar MX','Telecomunicaciones Plus','Inmobiliaria Cima','Clínica del Valle','Cafetería Moderna','Escuela de Negocios','Asesores Contables'];
const ciudades = ['Monterrey','Guadalajara','Ciudad de México','Puebla','Tijuana','León','Juárez','Torreón','San Luis Potosí','Mérida','Querétaro','Aguascalientes','Morelia','Chihuahua','Saltillo','Veracruz','Culiacán','Hermosillo','Cancún','Tuxtla Gutiérrez'];
const fuentesList = ['Facebook','Instagram','TikTok','Referido','Llamada en frío','Google Ads','LinkedIn','WhatsApp','Evento','Página web'];
const etapasProspecto = ['prospecto_nuevo','en_contacto','reunion_agendada','en_negociacion','reunion_realizada'];
const etapasCliente = ['venta_ganada','cotizacion_realizada','contrato_firmado','esperando_pago','cliente_activo'];
const motivosPerdida = ['Precio muy alto','No le interesa','Compró con la competencia','No tiene presupuesto','No contestó','Cambió de opinión'];

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const phone = () => `55${rand(10000000,99999999)}`;
const dateAgo = (days) => { const d = new Date(); d.setDate(d.getDate() - rand(0, days)); return d.toISOString(); };
const email = (nombre, apellido) => `${nombre.toLowerCase().replace(/[^a-z]/g,'')}.${apellido.toLowerCase().replace(/[^a-z]/g,'')}${rand(1,99)}@gmail.com`;

const tiposAct = ['llamada','whatsapp','correo','cita','nota'];
const resultados = ['exitoso','pendiente','fallido','enviado'];
const descripciones = [
    'Primer contacto realizado, cliente interesado',
    'Se envió información por WhatsApp',
    'Llamada sin respuesta, se dejó mensaje',
    'Reunión agendada para la próxima semana',
    'Cliente solicitó cotización formal',
    'Se envió propuesta económica por correo',
    'Cliente revisará la propuesta con su equipo',
    'Seguimiento pendiente, cliente en viaje',
    'Se aclaró duda sobre el servicio',
    'Cliente confirmó interés, pendiente de firma',
    'Se realizó demostración del producto',
    'Llamada de seguimiento exitosa',
    'Cliente compartió referencias de contactos',
    'Se coordinó presentación con directivos',
    'Cotización enviada con descuento especial'
];

async function seedAlejandro() {
    console.log(`\n🌱 Iniciando seed para Alejandro (ID: ${ALEJANDRO_ID})...\n`);

    let prospectoCount = 0;
    let clienteCount = 0;
    let actCount = 0;

    // ===== 50 PROSPECTOS =====
    console.log('📋 Insertando 50 prospectos...');
    for (let i = 0; i < 50; i++) {
        const nombre = pick(nombres);
        const apP = pick(apellidosP);
        const apM = pick(apellidosM);
        const empresa = pick(empresas);
        const ciudad = pick(ciudades);
        const fuente = pick(fuentesList);
        const etapa = pick(etapasProspecto);
        const fechaReg = dateAgo(90);
        const interesLevel = rand(1, 5);

        try {
            const r = await db.prepare(`
                INSERT INTO clientes (
                    nombres, "apellidoPaterno", "apellidoMaterno", telefono, telefono2, correo,
                    empresa, estado, "etapaEmbudo", "prospectorAsignado", "vendedorAsignado",
                    "propietarioId", equipo_id, "fechaRegistro", "ultimaInteraccion",
                    "fechaUltimaEtapa", ubicacion, fuente, interes, compartido, notas
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                nombre, apP, apM, phone(), rand(0,1) ? phone() : null,
                email(nombre, apP), empresa, 'proceso', etapa,
                ALEJANDRO_ID, ALEJANDRO_ID, ALEJANDRO_ID, EQUIPO_ID,
                fechaReg, dateAgo(30), dateAgo(45),
                ciudad, fuente, interesLevel, false,
                `Prospecto generado en ${ciudad}. Fuente: ${fuente}. Nivel de interés: ${interesLevel}/5.`
            );

            const clienteId = r.lastInsertRowid;
            prospectoCount++;

            // 2-4 actividades por prospecto
            const numActs = rand(2, 4);
            for (let j = 0; j < numActs; j++) {
                const tipo = pick(tiposAct);
                const resultado = pick(resultados);
                await db.prepare(`
                    INSERT INTO actividades (tipo, vendedor, cliente, fecha, descripcion, resultado, notas, equipo_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    tipo, ALEJANDRO_ID, clienteId, dateAgo(60),
                    pick(descripciones), resultado,
                    `Actividad de tipo ${tipo} con resultado ${resultado}.`,
                    EQUIPO_ID
                );
                actCount++;
            }
        } catch (e) {
            console.error(`  ❌ Error prospecto ${i+1}:`, e.message.slice(0, 80));
        }

        if ((i + 1) % 10 === 0) process.stdout.write(`  ✅ ${i + 1}/50 prospectos\n`);
    }

    // ===== 50 CLIENTES (etapas ganadas/activas) =====
    console.log('\n💰 Insertando 50 clientes ganados...');
    for (let i = 0; i < 50; i++) {
        const nombre = pick(nombres);
        const apP = pick(apellidosP);
        const apM = pick(apellidosM);
        const empresa = pick(empresas);
        const ciudad = pick(ciudades);
        const fuente = pick(fuentesList);
        const etapa = pick(etapasCliente);
        const fechaReg = dateAgo(180);
        const monto = rand(5000, 150000);

        try {
            const r = await db.prepare(`
                INSERT INTO clientes (
                    nombres, "apellidoPaterno", "apellidoMaterno", telefono, telefono2, correo,
                    empresa, estado, "etapaEmbudo", "prospectorAsignado", "closerAsignado",
                    "vendedorAsignado", "propietarioId", equipo_id, "fechaRegistro",
                    "ultimaInteraccion", "fechaUltimaEtapa", ubicacion, fuente, interes, compartido, notas
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                nombre, apP, apM, phone(), rand(0,1) ? phone() : null,
                email(nombre, apP), empresa, 'ganado', etapa,
                ALEJANDRO_ID, ALEJANDRO_ID, ALEJANDRO_ID, ALEJANDRO_ID, EQUIPO_ID,
                fechaReg, dateAgo(10), dateAgo(30),
                ciudad, fuente, 5, false,
                `Cliente activo. Empresa: ${empresa}. Ciudad: ${ciudad}. Monto contratado: $${monto.toLocaleString()}.`
            );

            const clienteId = r.lastInsertRowid;
            clienteCount++;

            // Venta registrada
            await db.prepare(`
                INSERT INTO ventas (cliente, vendedor, monto, fecha, estado, notas)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(
                clienteId, ALEJANDRO_ID, monto, dateAgo(60),
                'completado', `Venta cerrada con ${empresa} por $${monto.toLocaleString()}`
            );

            // 3-6 actividades por cliente (historial más rico)
            const numActs = rand(3, 6);
            for (let j = 0; j < numActs; j++) {
                const tipo = pick(tiposAct);
                await db.prepare(`
                    INSERT INTO actividades (tipo, vendedor, cliente, fecha, descripcion, resultado, notas, equipo_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    tipo, ALEJANDRO_ID, clienteId, dateAgo(120),
                    pick(descripciones), 'exitoso',
                    `Interacción exitosa con cliente de ${empresa}.`,
                    EQUIPO_ID
                );
                actCount++;
            }
        } catch (e) {
            console.error(`  ❌ Error cliente ${i+1}:`, e.message.slice(0, 80));
        }

        if ((i + 1) % 10 === 0) process.stdout.write(`  ✅ ${i + 1}/50 clientes\n`);
    }

    console.log(`\n✅ Seed completado:`);
    console.log(`   📋 Prospectos insertados: ${prospectoCount}`);
    console.log(`   💰 Clientes ganados insertados: ${clienteCount}`);
    console.log(`   📌 Actividades creadas: ${actCount}`);

    // Verificar totales
    const totalClientes = await db.prepare('SELECT COUNT(*) as c FROM clientes WHERE "prospectorAsignado" = ?').get(ALEJANDRO_ID);
    const totalActs = await db.prepare('SELECT COUNT(*) as c FROM actividades WHERE vendedor = ?').get(ALEJANDRO_ID);
    const totalVentas = await db.prepare('SELECT COUNT(*) as c, SUM(monto) as total FROM ventas WHERE vendedor = ?').get(ALEJANDRO_ID);
    console.log(`\n📊 Totales en BD para Alejandro:`);
    console.log(`   Clientes totales: ${totalClientes?.c}`);
    console.log(`   Actividades totales: ${totalActs?.c}`);
    console.log(`   Ventas: ${totalVentas?.c} | Monto total: $${Number(totalVentas?.total || 0).toLocaleString()}`);

    process.exit(0);
}

seedAlejandro().catch(e => { console.error('Error fatal:', e); process.exit(1); });
