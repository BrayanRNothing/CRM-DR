const mongoose = require('mongoose');
const path = require('path');

// Cargar variables de entorno
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Importar modelos
const Cliente = require(path.join(__dirname, '..', 'models', 'Cliente'));
const Usuario = require(path.join(__dirname, '..', 'models', 'Usuario'));
const Actividad = require(path.join(__dirname, '..', 'models', 'Actividad'));
const Venta = require(path.join(__dirname, '..', 'models', 'Venta'));

// Conectar a MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB');
    } catch (error) {
        console.error('❌ Error al conectar a MongoDB:', error.message);
        process.exit(1);
    }
};

// Nombres ficticios
const nombres = ['Juan', 'María', 'Carlos', 'Ana', 'Pedro', 'Laura', 'José', 'Carmen', 'Luis', 'Elena'];
const apellidos = ['García', 'Rodríguez', 'Martínez', 'López', 'González', 'Pérez', 'Sánchez', 'Ramírez', 'Torres', 'Flores'];
const empresas = ['Tech Solutions', 'Innovatech', 'Digital Corp', 'Smart Systems', 'Global Services', 'Prime Industries', 'Elite Consulting', 'Mega Corp', 'Alpha Group', 'Beta Enterprises'];

// Generar datos ficticios
const generarDatosFicticios = async () => {
    try {
        console.log('🎲 Generando datos ficticios para el embudo de ventas...\n');

        // Buscar vendedores existentes
        const vendedores = await Usuario.find({ rol: 'vendedor', activo: true });

        if (vendedores.length === 0) {
            console.log('❌ No hay vendedores en el sistema. Por favor crea al menos un vendedor primero.');
            return;
        }

        console.log(`📊 Vendedores encontrados: ${vendedores.length}\n`);

        // Limpiar datos anteriores (opcional)
        console.log('🗑️  Limpiando datos ficticios anteriores...');
        await Cliente.deleteMany({ correo: { $regex: '@ejemplo.com$' } });
        await Actividad.deleteMany({});
        await Venta.deleteMany({});

        // Generar 100 clientes distribuidos en el embudo
        const totalClientes = 100;
        const distribucion = {
            contacto_inicial: 15,  // 15%
            llamadas: 30,          // 30%
            citas: 25,             // 25%
            negociacion: 15,       // 15%
            ganado: 10,            // 10%
            perdido: 5             // 5%
        };

        let clientesCreados = 0;
        const etapas = Object.keys(distribucion);

        for (const etapa of etapas) {
            const cantidad = distribucion[etapa];

            for (let i = 0; i < cantidad; i++) {
                const vendedor = vendedores[Math.floor(Math.random() * vendedores.length)];
                const nombre = nombres[Math.floor(Math.random() * nombres.length)];
                const apellido = apellidos[Math.floor(Math.random() * apellidos.length)];
                const empresa = empresas[Math.floor(Math.random() * empresas.length)];

                // Determinar estado según etapa
                let estado = 'proceso';
                if (etapa === 'ganado') estado = 'ganado';
                if (etapa === 'perdido') estado = 'perdido';

                const cliente = new Cliente({
                    nombres: nombre,
                    apellidoPaterno: apellido,
                    apellidoMaterno: apellidos[Math.floor(Math.random() * apellidos.length)],
                    telefono: `55${Math.floor(10000000 + Math.random() * 90000000)}`,
                    correo: `${nombre.toLowerCase()}.${apellido.toLowerCase()}${i}@ejemplo.com`,
                    empresa: empresa,
                    estado: estado,
                    etapaEmbudo: etapa,
                    fechaUltimaEtapa: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Últimos 30 días
                    historialEmbudo: [{
                        etapa: etapa,
                        fecha: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
                        vendedor: vendedor._id
                    }],
                    vendedorAsignado: vendedor._id,
                    fechaRegistro: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000), // Últimos 60 días
                    ultimaInteraccion: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Última semana
                });

                await cliente.save();
                clientesCreados++;

                // Crear actividades según la etapa
                const numActividades = Math.floor(Math.random() * 5) + 1;
                for (let j = 0; j < numActividades; j++) {
                    const tipoActividad = ['llamada', 'cita', 'prospecto'][Math.floor(Math.random() * 3)];
                    const resultado = ['exitoso', 'pendiente', 'fallido'][Math.floor(Math.random() * 3)];

                    const actividad = new Actividad({
                        tipo: tipoActividad,
                        vendedor: vendedor._id,
                        cliente: cliente._id,
                        fecha: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
                        descripcion: `${tipoActividad} con ${nombre} ${apellido}`,
                        resultado: resultado,
                        notas: `Actividad de ejemplo para ${empresa}`
                    });

                    await actividad.save();
                }

                // Crear venta si está ganado
                if (etapa === 'ganado') {
                    const venta = new Venta({
                        vendedor: vendedor._id,
                        cliente: cliente._id,
                        monto: Math.floor(5000 + Math.random() * 45000), // Entre $5,000 y $50,000
                        fecha: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000),
                        producto: `Producto ${Math.floor(Math.random() * 10) + 1}`,
                        estado: 'completada'
                    });

                    await venta.save();
                }

                console.log(`✅ ${clientesCreados}/${totalClientes} - Cliente creado: ${nombre} ${apellido} (${etapa})`);
            }
        }

        console.log(`\n📈 Resumen de datos generados:`);
        console.log(`   ✅ Total clientes: ${clientesCreados}`);
        console.log(`   📊 Distribución por etapa:`);
        for (const etapa of etapas) {
            console.log(`      ${etapa}: ${distribucion[etapa]} clientes`);
        }

        // Mostrar estadísticas calculadas
        console.log(`\n📊 Tasas de conversión esperadas:`);
        console.log(`   Contacto Inicial → Llamadas: ${((85 / 100) * 100).toFixed(1)}%`);
        console.log(`   Llamadas → Citas: ${((55 / 85) * 100).toFixed(1)}%`);
        console.log(`   Citas → Negociación: ${((25 / 55) * 100).toFixed(1)}%`);
        console.log(`   Negociación → Venta: ${((10 / 25) * 100).toFixed(1)}%`);
        console.log(`   Conversión Global: ${((10 / 100) * 100).toFixed(1)}%`);

        console.log(`\n💡 Puntos débiles detectados (< 30%):`);
        console.log(`   🔴 Citas → Negociación: ${((25 / 55) * 100).toFixed(1)}% (DÉBIL)`);
        console.log(`   🔴 Negociación → Venta: ${((10 / 25) * 100).toFixed(1)}% (CRÍTICO)`);

    } catch (error) {
        console.error('❌ Error durante la generación:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n✅ Conexión cerrada');
        console.log('\n🎉 ¡Datos ficticios generados! Ahora puedes acceder a /admin/estadisticas para ver el embudo.');
    }
};

// Ejecutar
const ejecutar = async () => {
    await connectDB();
    await generarDatosFicticios();
};

ejecutar();
