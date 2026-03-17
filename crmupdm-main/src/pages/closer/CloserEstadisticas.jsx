import React from 'react';
import { BarChart3, TrendingUp, Calendar, DollarSign, Users, Award, AlertTriangle } from 'lucide-react';

const MOCK_ESTADISTICAS = {
    totalClientes: 28,
    totalReuniones: 22,
    reunionesRealizadas: 18,
    reunionesNoAsistidas: 4,
    totalVentas: 7,
    montoTotal: 285000,
    valorPromedio: 40714,
    tasaAsistencia: 81.8,
    tasaCierre: 38.9,
    tasaGlobal: 25.0,
    distribucion: {
        reunion_agendada: 8,
        reunion_realizada: 6,
        en_negociacion: 5,
        venta_ganada: 7,
        perdido: 2
    },
    motivosPerdida: {
        no_asistio: 4,
        no_interesado: 2
    },
    rendimientoMensual: [
        { mes: 'Ene', reuniones: 18, ventas: 5, tasa: 27.8 },
        { mes: 'Feb', reuniones: 22, ventas: 7, tasa: 31.8 }
    ]
};

const CloserEstadisticas = () => {
    const stats = MOCK_ESTADISTICAS;

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Estadísticas Detalladas</h1>
                        <p className="text-gray-400 mt-1">Análisis completo de tu rendimiento como closer</p>
                    </div>
                    <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-sm rounded-md">
                        Datos de demostración
                    </span>
                </div>

                {/* KPIs Principales */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-2">
                            <Calendar className="w-8 h-8 text-blue-400" />
                            <span className="text-3xl font-bold text-white">{stats.totalReuniones}</span>
                        </div>
                        <p className="text-gray-400 text-sm">Reuniones Totales</p>
                        <p className="text-blue-400 text-xs mt-1">{stats.reunionesRealizadas} realizadas</p>
                    </div>

                    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-2">
                            <TrendingUp className="w-8 h-8 text-green-400" />
                            <span className="text-3xl font-bold text-white">{stats.totalVentas}</span>
                        </div>
                        <p className="text-gray-400 text-sm">Ventas Cerradas</p>
                        <p className="text-green-400 text-xs mt-1">+15% vs mes anterior</p>
                    </div>

                    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-2">
                            <DollarSign className="w-8 h-8 text-green-400" />
                            <span className="text-3xl font-bold text-white">${stats.montoTotal.toLocaleString()}</span>
                        </div>
                        <p className="text-gray-400 text-sm">Valor Total</p>
                        <p className="text-green-400 text-xs mt-1">${stats.valorPromedio.toLocaleString()} promedio</p>
                    </div>

                    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-2">
                            <Award className="w-8 h-8 text-purple-400" />
                            <span className="text-3xl font-bold text-white">{stats.tasaCierre}%</span>
                        </div>
                        <p className="text-gray-400 text-sm">Tasa de Cierre</p>
                        <p className="text-purple-400 text-xs mt-1">Reuniones → Ventas</p>
                    </div>
                </div>

                {/* Tasas de Conversión con % de Éxito */}
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <BarChart3 className="w-6 h-6 text-purple-400" />
                        Tasas de Conversión por Etapa
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Tasa de Asistencia */}
                        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                            <p className="text-blue-400 font-semibold mb-2">Tasa de Asistencia</p>
                            <p className="text-4xl font-bold text-white mb-2">{stats.tasaAsistencia}%</p>
                            <div className="space-y-1 text-sm">
                                <p className="text-gray-400">Agendadas: {stats.totalReuniones}</p>
                                <p className="text-blue-400">Realizadas: {stats.reunionesRealizadas}</p>
                                <p className="text-red-400">No asistieron: {stats.reunionesNoAsistidas}</p>
                            </div>
                        </div>

                        {/* Tasa de Cierre */}
                        <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                            <p className="text-orange-400 font-semibold mb-2">Tasa de Cierre</p>
                            <p className="text-4xl font-bold text-white mb-2">{stats.tasaCierre}%</p>
                            <div className="space-y-1 text-sm">
                                <p className="text-gray-400">Reuniones: {stats.reunionesRealizadas}</p>
                                <p className="text-orange-400">Negociaciones: {stats.distribucion.en_negociacion}</p>
                                <p className="text-green-400">Cerradas: {stats.totalVentas}</p>
                            </div>
                        </div>

                        {/* Conversión Global */}
                        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                            <p className="text-green-400 font-semibold mb-2">Conversión Global</p>
                            <p className="text-4xl font-bold text-white mb-2">{stats.tasaGlobal}%</p>
                            <div className="space-y-1 text-sm">
                                <p className="text-gray-400">Total clientes: {stats.totalClientes}</p>
                                <p className="text-green-400">Ventas: {stats.totalVentas}</p>
                                <p className="text-gray-400">Efectividad general</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Distribución por Etapa */}
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-6">Distribución de Clientes</h3>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="text-center p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                            <p className="text-4xl font-bold text-blue-400 mb-2">{stats.distribucion.reunion_agendada}</p>
                            <p className="text-gray-400 text-sm">Reunión Agendada</p>
                        </div>
                        <div className="text-center p-4 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                            <p className="text-4xl font-bold text-cyan-400 mb-2">{stats.distribucion.reunion_realizada}</p>
                            <p className="text-gray-400 text-sm">Reunión Realizada</p>
                        </div>
                        <div className="text-center p-4 bg-orange-500/10 rounded-lg border border-orange-500/30">
                            <p className="text-4xl font-bold text-orange-400 mb-2">{stats.distribucion.en_negociacion}</p>
                            <p className="text-gray-400 text-sm">En Negociación</p>
                        </div>
                        <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                            <p className="text-4xl font-bold text-green-400 mb-2">{stats.distribucion.venta_ganada}</p>
                            <p className="text-gray-400 text-sm">Venta Ganada</p>
                        </div>
                        <div className="text-center p-4 bg-red-500/10 rounded-lg border border-red-500/30">
                            <p className="text-4xl font-bold text-red-400 mb-2">{stats.distribucion.perdido}</p>
                            <p className="text-gray-400 text-sm">Perdido</p>
                        </div>
                    </div>
                </div>

                {/* Análisis de Pérdidas */}
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <AlertTriangle className="w-6 h-6 text-red-400" />
                        Análisis de Pérdidas
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <p className="text-red-400 font-semibold mb-2">No Asistieron a Reunión</p>
                            <p className="text-5xl font-bold text-white mb-2">{stats.motivosPerdida.no_asistio}</p>
                            <p className="text-gray-400 text-sm">Clientes que no se presentaron</p>
                        </div>
                        <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                            <p className="text-orange-400 font-semibold mb-2">No Interesados</p>
                            <p className="text-5xl font-bold text-white mb-2">{stats.motivosPerdida.no_interesado}</p>
                            <p className="text-gray-400 text-sm">Después de reunión</p>
                        </div>
                    </div>
                </div>

                {/* Rendimiento Mensual */}
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-6">Rendimiento Mensual</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="border-b border-gray-700">
                                <tr>
                                    <th className="text-left p-3 text-gray-400 font-semibold">Mes</th>
                                    <th className="text-center p-3 text-gray-400 font-semibold">Reuniones</th>
                                    <th className="text-center p-3 text-gray-400 font-semibold">Ventas</th>
                                    <th className="text-center p-3 text-gray-400 font-semibold">Tasa de Cierre</th>
                                    <th className="text-center p-3 text-gray-400 font-semibold">Tendencia</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.rendimientoMensual.map((mes, index) => (
                                    <tr key={index} className="border-b border-gray-800">
                                        <td className="p-3 text-white font-semibold">{mes.mes}</td>
                                        <td className="p-3 text-center text-blue-400 font-semibold">{mes.reuniones}</td>
                                        <td className="p-3 text-center text-green-400 font-semibold">{mes.ventas}</td>
                                        <td className="p-3 text-center">
                                            <span className={`font-bold ${mes.tasa >= 30 ? 'text-green-400' : 'text-yellow-400'}`}>
                                                {mes.tasa}%
                                            </span>
                                        </td>
                                        <td className="p-3 text-center">
                                            {index > 0 && (
                                                <span className={mes.tasa > stats.rendimientoMensual[index - 1].tasa ? 'text-green-400' : 'text-red-400'}>
                                                    {mes.tasa > stats.rendimientoMensual[index - 1].tasa ? '↑' : '↓'}
                                                    {Math.abs(mes.tasa - stats.rendimientoMensual[index - 1].tasa).toFixed(1)}%
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CloserEstadisticas;
