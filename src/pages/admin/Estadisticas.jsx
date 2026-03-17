import React, { useState, useEffect } from 'react';
import { BarChart, TrendingUp, Users, DollarSign, Download, RefreshCw } from 'lucide-react';
import FunnelChart from '../../components/FunnelChart';
import ConversionMetrics from '../../components/ConversionMetrics';
import VendedorComparison from '../../components/VendedorComparison';
import WeakStageAlert from '../../components/WeakStageAlert';

// DATOS MOCK PARA DEMOSTRACIÓN
const MOCK_DATA = {
    metricas: {
        embudo: {
            total: 100,
            contacto_inicial: 15,
            llamadas: 30,
            citas: 25,
            negociacion: 15,
            ganado: 10,
            perdido: 5
        },
        tasasConversion: {
            llamadas: 85.0,  // (30+25+15+10) / 100 * 100
            citas: 64.7,     // (25+15+10) / 85 * 100
            negociacion: 45.5, // (15+10) / 55 * 100
            cierre: 40.0,    // 10 / 25 * 100
            global: 10.0     // 10 / 100 * 100
        },
        etapasDebiles: [
            {
                etapa: 'Negociación → Venta',
                tasa: 40.0
            }
        ]
    },
    comparativa: [
        {
            vendedor: { id: '1', _id: '1', nombre: 'Juan Pérez', usuario: 'jperez' },
            embudo: {
                total: 35,
                contacto_inicial: 5,
                llamadas: 12,
                citas: 10,
                negociacion: 5,
                ganado: 3,
                perdido: 0
            },
            tasasConversion: {
                llamadas: 85.7,
                citas: 60.0,
                negociacion: 50.0,
                cierre: 60.0,
                global: 8.6
            },
            metricas: {
                conversionGlobal: 8.6,
                tasaCierre: 60.0
            }
        },
        {
            vendedor: { id: '2', _id: '2', nombre: 'María García', usuario: 'mgarcia' },
            embudo: {
                total: 40,
                contacto_inicial: 6,
                llamadas: 15,
                citas: 12,
                negociacion: 5,
                ganado: 5,
                perdido: 2
            },
            tasasConversion: {
                llamadas: 85.0,
                citas: 64.7,
                negociacion: 50.0,
                cierre: 71.4,
                global: 12.5
            },
            metricas: {
                conversionGlobal: 12.5,
                tasaCierre: 71.4
            }
        },
        {
            vendedor: { id: '3', _id: '3', nombre: 'Carlos López', usuario: 'clopez' },
            embudo: {
                total: 25,
                contacto_inicial: 4,
                llamadas: 8,
                citas: 6,
                negociacion: 5,
                ganado: 2,
                perdido: 3
            },
            tasasConversion: {
                llamadas: 84.0,
                citas: 61.9,
                negociacion: 52.4,
                cierre: 28.6,
                global: 8.0
            },
            metricas: {
                conversionGlobal: 8.0,
                tasaCierre: 28.6
            }
        }
    ]
};

const Estadisticas = () => {
    const [loading, setLoading] = useState(true);
    const [metricas, setMetricas] = useState(null);
    const [comparativa, setComparativa] = useState([]);
    const [usandoMock, setUsandoMock] = useState(false);

    const cargarDatos = async () => {
        try {
            setLoading(true);

            const token = localStorage.getItem('token');

            // Si no hay token, usar datos mock
            if (!token) {
                console.log('⚠️ No hay token, usando datos mock');
                setTimeout(() => {
                    setMetricas(MOCK_DATA.metricas);
                    setComparativa(MOCK_DATA.comparativa);
                    setUsandoMock(true);
                    setLoading(false);
                }, 500);
                return;
            }

            const config = {
                headers: { 'x-auth-token': token }
            };

            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

            try {
                // Intentar cargar datos reales
                const resMetricas = await axios.get(`${API_URL}/api/embudo/metricas`, config);
                setMetricas(resMetricas.data);

                const resComparativa = await axios.get(`${API_URL}/api/embudo/comparativa`, config);
                setComparativa(resComparativa.data);
                setUsandoMock(false);
            } catch (error) {
                // Si falla, usar datos mock
                console.log('⚠️ Error al cargar datos reales, usando datos mock:', error.message);
                setMetricas(MOCK_DATA.metricas);
                setComparativa(MOCK_DATA.comparativa);
                setUsandoMock(true);
            }

        } catch (error) {
            console.error('Error:', error);
            // En caso de error, usar datos mock
            setMetricas(MOCK_DATA.metricas);
            setComparativa(MOCK_DATA.comparativa);
            setUsandoMock(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    const exportarReporte = () => {
        alert('Funcionalidad de exportación próximamente...');
    };

    if (loading) {
        return (
            <div className="min-h-screen backdrop-blur-xs p-6 flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Cargando estadísticas...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen backdrop-blur-xs p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <BarChart className="w-8 h-8 text-blue-400" />
                            Estadísticas del Embudo de Ventas
                        </h1>
                        <p className="text-gray-400 mt-1">
                            Análisis completo del proceso de ventas y métricas de conversión
                            {usandoMock && (
                                <span className="ml-2 px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-md">
                                    Datos de demostración
                                </span>
                            )}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={cargarDatos}
                            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Actualizar
                        </button>
                        <button
                            onClick={exportarReporte}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Exportar Reporte
                        </button>
                    </div>
                </div>

                {/* Métricas principales */}
                {metricas && (
                    <>
                        {/* Resumen rápido */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-blue-500/20 rounded-lg">
                                        <Users className="w-6 h-6 text-blue-400" />
                                    </div>
                                </div>
                                <h3 className="text-gray-400 text-sm mb-1">Total Clientes</h3>
                                <p className="text-3xl font-bold text-white">{metricas.embudo.total}</p>
                            </div>

                            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-green-500/20 rounded-lg">
                                        <DollarSign className="w-6 h-6 text-green-400" />
                                    </div>
                                </div>
                                <h3 className="text-gray-400 text-sm mb-1">Ventas Cerradas</h3>
                                <p className="text-3xl font-bold text-green-400">{metricas.embudo.ganado}</p>
                            </div>

                            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-purple-500/20 rounded-lg">
                                        <TrendingUp className="w-6 h-6 text-purple-400" />
                                    </div>
                                </div>
                                <h3 className="text-gray-400 text-sm mb-1">Conversión Global</h3>
                                <p className="text-3xl font-bold text-purple-400">{metricas.tasasConversion.global}%</p>
                            </div>

                            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-yellow-500/20 rounded-lg">
                                        <BarChart className="w-6 h-6 text-yellow-400" />
                                    </div>
                                </div>
                                <h3 className="text-gray-400 text-sm mb-1">En Proceso</h3>
                                <p className="text-3xl font-bold text-yellow-400">
                                    {metricas.embudo.llamadas + metricas.embudo.citas + metricas.embudo.negociacion}
                                </p>
                            </div>
                        </div>

                        {/* Alertas de puntos débiles */}
                        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                            <WeakStageAlert etapasDebiles={metricas.etapasDebiles} />
                        </div>

                        {/* Embudo visual */}
                        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                            <FunnelChart data={metricas} />
                        </div>

                        {/* Métricas de conversión */}
                        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                            <ConversionMetrics tasasConversion={metricas.tasasConversion} />
                        </div>
                    </>
                )}

                {/* Comparativa de vendedores */}
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                    <VendedorComparison comparativa={comparativa} />
                </div>
            </div>
        </div>
    );
};

export default Estadisticas;
