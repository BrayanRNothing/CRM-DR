const mongoose = require('mongoose');
const path = require('path');

// Cargar variables de entorno
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Importar modelo
const Cliente = require(path.join(__dirname, '..', 'models', 'Cliente'));

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

// Migrar clientes existentes al sistema de embudo
const migrarClientes = async () => {
    try {
        console.log('🔄 Iniciando migración de clientes al sistema de embudo...\n');

        // Obtener todos los clientes sin etapaEmbudo
        const clientesSinEtapa = await Cliente.find({
            $or: [
                { etapaEmbudo: { $exists: false } },
                { etapaEmbudo: null }
            ]
        });

        console.log(`📊 Clientes a migrar: ${clientesSinEtapa.length}\n`);

        if (clientesSinEtapa.length === 0) {
            console.log('✅ No hay clientes para migrar. Todos los clientes ya tienen etapa asignada.\n');
            return;
        }

        let migrados = 0;
        let errores = 0;

        for (const cliente of clientesSinEtapa) {
            try {
                // Determinar etapa según estado actual
                let etapaEmbudo;

                if (cliente.estado === 'ganado') {
                    etapaEmbudo = 'ganado';
                } else if (cliente.estado === 'perdido') {
                    etapaEmbudo = 'perdido';
                } else {
                    // Estado 'proceso' -> asignar a 'llamadas' (asumimos ya contactados)
                    etapaEmbudo = 'llamadas';
                }

                // Actualizar cliente
                cliente.etapaEmbudo = etapaEmbudo;
                cliente.fechaUltimaEtapa = cliente.ultimaInteraccion || cliente.fechaRegistro || Date.now();

                // Crear historial inicial
                if (!cliente.historialEmbudo || cliente.historialEmbudo.length === 0) {
                    cliente.historialEmbudo = [{
                        etapa: etapaEmbudo,
                        fecha: cliente.fechaRegistro || Date.now(),
                        vendedor: cliente.vendedorAsignado
                    }];
                }

                await cliente.save();
                migrados++;

                console.log(`✅ ${migrados}. Cliente migrado: ${cliente.nombres} ${cliente.apellidoPaterno} -> ${etapaEmbudo}`);
            } catch (error) {
                errores++;
                console.error(`❌ Error al migrar cliente ${cliente._id}:`, error.message);
            }
        }

        console.log(`\n📈 Resumen de migración:`);
        console.log(`   ✅ Migrados exitosamente: ${migrados}`);
        console.log(`   ❌ Errores: ${errores}`);
        console.log(`   📊 Total procesados: ${clientesSinEtapa.length}\n`);

        // Mostrar distribución por etapa
        const distribucion = await Cliente.aggregate([
            {
                $group: {
                    _id: '$etapaEmbudo',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);

        console.log('📊 Distribución de clientes por etapa:');
        distribucion.forEach(etapa => {
            console.log(`   ${etapa._id}: ${etapa.count} clientes`);
        });

    } catch (error) {
        console.error('❌ Error durante la migración:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n✅ Conexión cerrada');
    }
};

// Ejecutar migración
const ejecutar = async () => {
    await connectDB();
    await migrarClientes();
};

ejecutar();
