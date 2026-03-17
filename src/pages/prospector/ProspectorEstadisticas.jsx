import React from 'react';
import { BarChart3, Phone, UserPlus, Calendar, TrendingUp, TrendingDown } from 'lucide-react';

const MOCK_ESTADISTICAS = {
    totalClientes: 45,
    totalLlamadas: 156,
    llamadasExitosas: 98,
    reunionesAgendadas: 10,
    tasaContacto: 62.8,
    tasaAgendamiento: 10.2,
    distribucion: {
        prospecto_nuevo: 12,
        en_contacto: 18,
        reunion_agendada: 10,
        transferidos: 10
    },
    rendimientoSemanal: [
        { semana: 'Sem 1', llamadas: 32, contactos: 18, agendadas: 2 },
        { semana: 'Sem 2', llamadas: 38, contactos: 24, agendadas: 3 },
        { semana: 'Sem 3', llamadas: 42, contactos: 28, agendadas: 3 },
        { semana: 'Sem 4', llamadas: 44, contactos: 28, agendadas: 2 }
    ]
};

const ProspectorEstadisticas = () => {
    const stats = MOCK_ESTADISTICAS;

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Estadísticas</h1>
                        <p className="text-gray-400 mt-1">Análisis de tu rendimiento como prospector</p>
                    </div>
                    <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-sm rounded-md">
                        Datos de demostración
                    </span>
                </div>

                {/* KPIs Principales */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-2">
                            <Phone className="w-8 h-8 text-teal-400" />
                            <span className="text-3xl font-bold text-white">{stats.totalLlamadas}</span>
                        </div>
                        <p className="text-gray-400 text-sm">Llamadas Totales</p>
                        <p className="text-teal-400 text-xs mt-1">+12% vs mes anterior</p>
                    </div>

                    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-2">
                            <UserPlus className="w-8 h-8 text-green-400" />
                            <span className="text-3xl font-bold text-white">{stats.llamadasExitosas}</span>
                        </div>
                        <p className="text-gray-400 text-sm">Contactos Exitosos</p>
                        <p className="text-green-400 text-xs mt-1">+8% vs mes anterior</p>
                    </div>

                    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-2">
                            <Calendar className="w-8 h-8 text-purple-400" />
                            <span className="text-3xl font-bold text-white">{stats.reunionesAgendadas}</span>
                        </div>
                        <p className="text-gray-400 text-sm">Reuniones Agendadas</p>
                        <p className="text-purple-400 text-xs mt-1">+5% vs mes anterior</p>
                    </div>

                    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-2">
                            <TrendingUp className="w-8 h-8 text-blue-400" />
                            <span className="text-3xl font-bold text-white">{stats.tasaContacto}%</span>
                        </div>
                        <p className="text-gray-400 text-sm">Tasa de Contacto</p>
                        <p className="text-blue-400 text-xs mt-1">Llamadas exitosas</p>
                    </div>
                </div>

                {/* Tasas de Conversión */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <BarChart3 className="w-6 h-6 text-teal-400" />
                            Tasa de Contacto
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-gray-400">Llamadas realizadas</span>
                                    <span className="text-white font-semibold">{stats.totalLlamadas}</span>
                                </div>
                                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-gray-500" style={{ width: '100%' }} />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-gray-400">Contactos exitosos</span>
                                    <span className="text-teal-400 font-semibold">{stats.llamadasExitosas}</span>
                                </div>
                                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-teal-500" style={{ width: `${stats.tasaContacto}%` }} />
                                </div>
                            </div>
                            <div className="pt-3 border-t border-gray-700">
                                <p className="text-center text-4xl font-bold text-teal-400">{stats.tasaContacto}%</p>
                                <p className="text-center text-gray-400 text-sm mt-1">Tasa de éxito en contacto</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Calendar className="w-6 h-6 text-purple-400" />
                            Tasa de Agendamiento
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-gray-400">Contactos exitosos</span>
                                    <span className="text-white font-semibold">{stats.llamadasExitosas}</span>
                                </div>
                                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-gray-500" style={{ width: '100%' }} />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-gray-400">Reuniones agendadas</span>
                                    <span className="text-purple-400 font-semibold">{stats.reunionesAgendadas}</span>
                                </div>
                                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-500" style={{ width: `${stats.tasaAgendamiento}%` }} />
                                </div>
                            </div>
                            <div className="pt-3 border-t border-gray-700">
                                <p className="text-center text-4xl font-bold text-purple-400">{stats.tasaAgendamiento}%</p>
                                <p className="text-center text-gray-400 text-sm mt-1">Contactos que agendaron</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Distribución por Etapa */}
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-6">Distribución de Prospectos</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-gray-700/30 rounded-lg">
                            <p className="text-4xl font-bold text-gray-400 mb-2">{stats.distribucion.prospecto_nuevo}</p>
                            <p className="text-gray-400 text-sm">Nuevos</p>
                        </div>
                        <div className="text-center p-4 bg-teal-500/10 rounded-lg border border-teal-500/30">
                            <p className="text-4xl font-bold text-teal-400 mb-2">{stats.distribucion.en_contacto}</p>
                            <p className="text-gray-400 text-sm">En Contacto</p>
                        </div>
                        <div className="text-center p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                            <p className="text-4xl font-bold text-purple-400 mb-2">{stats.distribucion.reunion_agendada}</p>
                            <p className="text-gray-400 text-sm">Reunión Agendada</p>
                        </div>
                        <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                            <p className="text-4xl font-bold text-green-400 mb-2">{stats.distribucion.transferidos}</p>
                            <p className="text-gray-400 text-sm">Transferidos</p>
                        </div>
                    </div>
                </div>

                {/* Rendimiento Semanal */}
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-6">Rendimiento Semanal</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="border-b border-gray-700">
                                <tr>
                                    <th className="text-left p-3 text-gray-400 font-semibold">Semana</th>
                                    <th className="text-center p-3 text-gray-400 font-semibold">Llamadas</th>
                                    <th className="text-center p-3 text-gray-400 font-semibold">Contactos</th>
                                    <th className="text-center p-3 text-gray-400 font-semibold">Agendadas</th>
                                    <th className="text-center p-3 text-gray-400 font-semibold">Tasa Contacto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.rendimientoSemanal.map((semana, index) => {
                                    const tasaContacto = ((semana.contactos / semana.llamadas) * 100).toFixed(1);
                                    return (
                                        <tr key={index} className="border-b border-gray-800">
                                            <td className="p-3 text-white font-semibold">{semana.semana}</td>
                                            <td className="p-3 text-center text-gray-300">{semana.llamadas}</td>
                                            <td className="p-3 text-center text-teal-400 font-semibold">{semana.contactos}</td>
                                            <td className="p-3 text-center text-purple-400 font-semibold">{semana.agendadas}</td>
                                            <td className="p-3 text-center">
                                                <span className={`font-bold ${parseFloat(tasaContacto) >= 60 ? 'text-green-400' : 'text-yellow-400'}`}>
                                                    {tasaContacto}%
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProspectorEstadisticas;
