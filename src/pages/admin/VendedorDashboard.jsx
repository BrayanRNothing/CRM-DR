import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Phone, Calendar, Users, DollarSign, RefreshCw, TrendingDown } from 'lucide-react';
import FunnelChart from '../../components/FunnelChart';

// DATOS MOCK PARA DEMOSTRACIÓN
const MOCK_DATA = {
    metricas: {
        llamadas: { hoy: 5, totales: 25 },
        citas: { hoy: 3, totales: 15 },
        clientes: { total: 35, proceso: 20, ganados: 3 },
        ventas: { hoy: 1 }
    },
    embudoData: {
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
        etapasDebiles: [],
        comparativaEquipo: {
            llamadas: 82.5,
            citas: 58.3,
            negociacion: 48.2,
            cierre: 52.1,
            global: 9.8
        }
    }
};

const VendedorDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [metricas, setMetricas] = useState(null);
    const [embudoData, setEmbudoData] = useState(null);
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
                    setEmbudoData(MOCK_DATA.embudoData);
                    setUsandoMock(true);
                    setLoading(false);
                }, 500);
                return;
            }

            const usuario = JSON.parse(localStorage.getItem('usuario'));
            const config = {
                headers: { 'x-auth-token': token }
            };

            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

            try {
                // Intentar cargar datos reales
                const resMetricas = await axios.get(`${API_URL}/api/metricas/vendedor`, config);
                setMetricas(resMetricas.data);

                const resEmbudo = await axios.get(`${API_URL}/api/embudo/vendedor/${usuario._id}`, config);
                setEmbudoData(resEmbudo.data);
                setUsandoMock(false);
            } catch (error) {
                // Si falla, usar datos mock
                console.log('⚠️ Error al cargar datos reales, usando datos mock:', error.message);
                setMetricas(MOCK_DATA.metricas);
                setEmbudoData(MOCK_DATA.embudoData);
                setUsandoMock(true);
            }

        } catch (error) {
            console.error('Error:', error);
            setMetricas(MOCK_DATA.metricas);
            setEmbudoData(MOCK_DATA.embudoData);
            setUsandoMock(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-transparent p-6 flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Cargando dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-transparent p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">Mi Dashboard de Ventas</h1>
                        <p className="text-gray-500 font-medium">
                            Resumen de tu actividad y rendimiento
                            {usandoMock && (
                                <span className="ml-2 px-2 py-1 bg-yellow-500/20 text-yellow-600 text-xs rounded-md">
                                    Datos de demostración
                                </span>
                            )}
                        </p>
                    </div>
                    <button
                        onClick={cargarDatos}
                        className="px-5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-semibold transition-colors flex items-center gap-2 shadow-sm hover:shadow-md"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Actualizar
                    </button>
                </div>

                {metricas && (
                    <>
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            {/* Llamadas */}
                            <div className="bg-white border border-gray-100 rounded-2xl p-7 shadow-sm hover:shadow-lg transition-all group cursor-default">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3.5 bg-teal-50 rounded-xl group-hover:bg-teal-100 transition-colors">
                                        <Phone className="w-7 h-7 text-teal-600" />
                                    </div>
                                    <span className="text-4xl font-extrabold text-gray-900">{metricas.llamadas.totales}</span>
                                </div>
                                <h3 className="text-gray-600 font-medium text-sm mb-1 uppercase tracking-wide">Llamadas Totales</h3>
                                <p className="text-gray-400 text-xs font-medium">Hoy: <span className="text-teal-600 font-bold">+{metricas.llamadas.hoy}</span></p>
                            </div>

                            {/* Citas */}
                            <div className="bg-white border border-gray-100 rounded-2xl p-7 shadow-sm hover:shadow-lg transition-all group cursor-default">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3.5 bg-cyan-50 rounded-xl group-hover:bg-cyan-100 transition-colors">
                                        <Calendar className="w-7 h-7 text-cyan-600" />
                                    </div>
                                    <span className="text-4xl font-extrabold text-gray-900">{metricas.citas.totales}</span>
                                </div>
                                <h3 className="text-gray-600 font-medium text-sm mb-1 uppercase tracking-wide">Citas Totales</h3>
                                <p className="text-gray-400 text-xs font-medium">Hoy: <span className="text-cyan-600 font-bold">+{metricas.citas.hoy}</span></p>
                            </div>

                            {/* Prospectos */}
                            <div className="bg-white border border-gray-100 rounded-2xl p-7 shadow-sm hover:shadow-lg transition-all group cursor-default">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3.5 bg-indigo-50 rounded-xl group-hover:bg-indigo-100 transition-colors">
                                        <Users className="w-7 h-7 text-indigo-600" />
                                    </div>
                                    <span className="text-4xl font-extrabold text-gray-900">{metricas.clientes.total}</span>
                                </div>
                                <h3 className="text-gray-600 font-medium text-sm mb-1 uppercase tracking-wide">Clientes Totales</h3>
                                <p className="text-gray-400 text-xs font-medium">En proceso: <span className="text-indigo-600 font-bold">{metricas.clientes.proceso}</span></p>
                            </div>

                            {/* Ventas */}
                            <div className="bg-white border border-gray-100 rounded-2xl p-7 shadow-sm hover:shadow-lg transition-all group cursor-default">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3.5 bg-emerald-50 rounded-xl group-hover:bg-emerald-100 transition-colors">
                                        <DollarSign className="w-7 h-7 text-emerald-600" />
                                    </div>
                                    <span className="text-4xl font-extrabold text-gray-900">{metricas.clientes.ganados}</span>
                                </div>
                                <h3 className="text-gray-600 font-medium text-sm mb-1 uppercase tracking-wide">Ventas Cerradas</h3>
                                <p className="text-gray-400 text-xs font-medium">Hoy: <span className="text-emerald-600 font-bold">+{metricas.ventas.hoy}</span></p>
                            </div>
                        </div>
                    </>
                )}

                {/* Embudo Personal */}
                {embudoData && (
                    <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm mb-8">
                        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                            <div className="p-2 bg-teal-50 rounded-lg">
                                <BarChart3 className="w-5 h-5 text-teal-600" />
                            </div>
                            Mi Embudo de Ventas
                        </h2>
                        <FunnelChart data={embudoData} />
                    </div>
                )}

                {/* Comparativa vs Equipo */}
                {embudoData && embudoData.comparativaEquipo && (
                    <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
                        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                            <div className="p-2 bg-purple-50 rounded-lg">
                                <TrendingUp className="w-5 h-5 text-purple-600" />
                            </div>
                            Mi Rendimiento vs Promedio del Equipo
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            {[
                                { nombre: 'Llamadas', miTasa: embudoData.tasasConversion.llamadas, promedioEquipo: embudoData.comparativaEquipo.llamadas },
                                { nombre: 'Citas', miTasa: embudoData.tasasConversion.citas, promedioEquipo: embudoData.comparativaEquipo.citas },
                                { nombre: 'Negociación', miTasa: embudoData.tasasConversion.negociacion, promedioEquipo: embudoData.comparativaEquipo.negociacion },
                                { nombre: 'Cierre', miTasa: embudoData.tasasConversion.cierre, promedioEquipo: embudoData.comparativaEquipo.cierre },
                                { nombre: 'Global', miTasa: embudoData.tasasConversion.global, promedioEquipo: embudoData.comparativaEquipo.global }
                            ].map((metrica, index) => {
                                const diferencia = metrica.miTasa - metrica.promedioEquipo;
                                const esMejor = diferencia > 0;

                                return (
                                    <div key={index} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                        <h4 className="text-gray-600 text-sm font-semibold mb-3">{metrica.nombre}</h4>
                                        <div className="space-y-2">
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Mi tasa</p>
                                                <p className="text-2xl font-bold text-gray-900">{metrica.miTasa}%</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Promedio equipo</p>
                                                <p className="text-lg font-semibold text-gray-600">{metrica.promedioEquipo}%</p>
                                            </div>
                                            <div className={`flex items-center gap-1 text-sm font-semibold ${esMejor ? 'text-green-600' : 'text-red-600'}`}>
                                                {esMejor ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                                {esMejor ? '+' : ''}{diferencia.toFixed(1)}%
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VendedorDashboard;
