import React, { useState, useEffect } from 'react';
import { BarChart3, Phone, UserPlus, Calendar, TrendingUp, TrendingDown, RefreshCw, AlertCircle } from 'lucide-react';
import axios from 'axios';

import API_URL from '../../config/api';

const ProspectorEstadisticas = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const cargarEstadisticas = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${API_URL}/api/prospector/estadisticas`, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            setStats(response.data);
        } catch (err) {
            console.error('Error al cargar estadísticas:', err);
            setError('Error al cargar las estadísticas');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarEstadisticas();
        const interval = setInterval(cargarEstadisticas, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const getTrendColor = (value) => {
        if (value > 0) return 'text-green-400';
        if (value < 0) return 'text-red-400';
        return 'text-gray-400';
    };

    const getTrendIcon = (value) => {
        if (value > 0) return <TrendingUp className="w-4 h-4" />;
        if (value < 0) return <TrendingDown className="w-4 h-4" />;
        return null;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 p-6 flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="w-12 h-12 text-(--theme-400) animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Cargando estadísticas...</p>
                </div>
            </div>
        );
    }

    if (error || !stats) {
        return (
            <div className="min-h-screen bg-gray-900 p-6 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <p className="text-red-400">{error || 'No hay datos disponibles'}</p>
                    <button
                        onClick={cargarEstadisticas}
                        className="mt-4 px-4 py-2 bg-(--theme-500) text-white rounded-lg hover:bg-(--theme-600) transition-colors"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-white flex items-center gap-3">
                            <BarChart3 className="w-10 h-10 text-(--theme-400)" />
                            Mis Estadísticas
                        </h1>
                        <p className="text-gray-400 mt-2">Análisis detallado de tu rendimiento como prospector</p>
                    </div>
                    <button
                        onClick={cargarEstadisticas}
                        className="px-4 py-2 bg-(--theme-500) text-white rounded-lg hover:bg-(--theme-600) transition-colors flex items-center gap-2 shadow-lg"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Actualizar
                    </button>
                </div>

                {/* Resumen Rápido */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-linear-to-br from-(--theme-500) to-(--theme-600) rounded-xl p-6 shadow-lg border border-(--theme-400)/20">
                        <div className="flex items-center justify-between mb-2">
                            <Phone className="w-6 h-6 text-(--theme-200)" />
                            <span className="text-3xl font-bold text-white">{stats.metricas.mes.llamadas}</span>
                        </div>
                        <p className="text-(--theme-100) text-sm mb-3">Llamadas este mes</p>
                        <div className={`flex items-center gap-1 ${getTrendColor(stats.variacion.llamadas)}`}>
                            {getTrendIcon(stats.variacion.llamadas)}
                            <span className="text-sm font-semibold">{Math.abs(stats.variacion.llamadas)}% vs mes anterior</span>
                        </div>
                    </div>

                    <div className="bg-linear-to-br from-green-500 to-green-600 rounded-xl p-6 shadow-lg border border-green-400/20">
                        <div className="flex items-center justify-between mb-2">
                            <UserPlus className="w-6 h-6 text-green-200" />
                            <span className="text-3xl font-bold text-white">{stats.metricas.mes.exitosas}</span>
                        </div>
                        <p className="text-green-100 text-sm mb-3">Contactos exitosos</p>
                        <div className="flex items-center gap-1 text-green-100">
                            <span className="text-sm font-semibold">{stats.metricas.mes.tasaContacto}% de efectividad</span>
                        </div>
                    </div>

                    <div className="bg-linear-to-br from-purple-500 to-purple-600 rounded-xl p-6 shadow-lg border border-purple-400/20">
                        <div className="flex items-center justify-between mb-2">
                            <Calendar className="w-6 h-6 text-purple-200" />
                            <span className="text-3xl font-bold text-white">{stats.metricas.mes.citas}</span>
                        </div>
                        <p className="text-purple-100 text-sm mb-3">Citas agendadas</p>
                        <div className={`flex items-center gap-1 ${getTrendColor(stats.variacion.citas)}`}>
                            {getTrendIcon(stats.variacion.citas)}
                            <span className="text-sm font-semibold">{Math.abs(stats.variacion.citas)}% vs mes anterior</span>
                        </div>
                    </div>
                </div>

                {/* KPIs Principales - Comparativa Períodos */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Hoy */}
                    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-colors">
                        <div className="mb-4">
                            <p className="text-gray-400 text-sm font-medium mb-1">HOY</p>
                            <h3 className="text-2xl font-bold text-white">{stats.metricas.hoy.llamadas} llamadas</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400 text-sm">Exitosas</span>
                                <span className="text-green-400 font-bold">{stats.metricas.hoy.exitosas}</span>
                            </div>
                            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-linear-to-r from-green-500 to-green-400 rounded-full"
                                    style={{ width: `${Math.min(100, stats.metricas.hoy.tasaContacto)}%` }}
                                />
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                                <span className="text-gray-400 text-xs">Tasa</span>
                                <span className="text-green-400 font-bold">{stats.metricas.hoy.tasaContacto}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Esta Semana */}
                    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-colors">
                        <div className="mb-4">
                            <p className="text-gray-400 text-sm font-medium mb-1">ESTA SEMANA</p>
                            <h3 className="text-2xl font-bold text-white">{stats.metricas.semana.llamadas} llamadas</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400 text-sm">Exitosas</span>
                                <span className="text-(--theme-400) font-bold">{stats.metricas.semana.exitosas}</span>
                            </div>
                            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-linear-to-r from-(--theme-500) to-(--theme-400) rounded-full"
                                    style={{ width: `${Math.min(100, stats.metricas.semana.tasaContacto)}%` }}
                                />
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                                <span className="text-gray-400 text-xs">Tasa</span>
                                <span className="text-(--theme-400) font-bold">{stats.metricas.semana.tasaContacto}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Este Mes */}
                    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-colors">
                        <div className="mb-4">
                            <p className="text-gray-400 text-sm font-medium mb-1">ESTE MES</p>
                            <h3 className="text-2xl font-bold text-white">{stats.metricas.mes.llamadas} llamadas</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400 text-sm">Exitosas</span>
                                <span className="text-purple-400 font-bold">{stats.metricas.mes.exitosas}</span>
                            </div>
                            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-linear-to-r from-purple-500 to-purple-400 rounded-full"
                                    style={{ width: `${Math.min(100, stats.metricas.mes.tasaContacto)}%` }}
                                />
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                                <span className="text-gray-400 text-xs">Tasa</span>
                                <span className="text-purple-400 font-bold">{stats.metricas.mes.tasaContacto}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tasas de Conversión Detalladas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Tasa de Contacto */}
                    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Phone className="w-6 h-6 text-(--theme-400)" />
                            Tasa de Contacto
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-gray-400 text-sm">Llamadas realizadas</span>
                                    <span className="text-white font-semibold">{stats.metricas.mes.llamadas}</span>
                                </div>
                                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-gray-600 rounded-full" style={{ width: '100%' }} />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-gray-400 text-sm">Contactos exitosos</span>
                                    <span className="text-(--theme-400) font-semibold">{stats.metricas.mes.exitosas}</span>
                                </div>
                                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-linear-to-r from-(--theme-500) to-(--theme-400) rounded-full"
                                        style={{ width: `${stats.metricas.mes.tasaContacto}%` }}
                                    />
                                </div>
                            </div>
                            <div className="pt-4 border-t border-gray-700">
                                <p className="text-center text-5xl font-bold text-(--theme-400) mb-1">{stats.metricas.mes.tasaContacto}%</p>
                                <p className="text-center text-gray-400 text-sm">Tasa de éxito en contacto</p>
                            </div>
                        </div>
                    </div>

                    {/* Tasa de Agendamiento */}
                    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Calendar className="w-6 h-6 text-purple-400" />
                            Tasa de Agendamiento
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-gray-400 text-sm">Contactos exitosos</span>
                                    <span className="text-white font-semibold">{stats.metricas.mes.exitosas}</span>
                                </div>
                                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-gray-600 rounded-full" style={{ width: '100%' }} />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-gray-400 text-sm">Citas agendadas</span>
                                    <span className="text-purple-400 font-semibold">{stats.metricas.mes.citas}</span>
                                </div>
                                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-linear-to-r from-purple-500 to-purple-400 rounded-full"
                                        style={{ width: `${stats.metricas.mes.tasaAgendamiento}%` }}
                                    />
                                </div>
                            </div>
                            <div className="pt-4 border-t border-gray-700">
                                <p className="text-center text-5xl font-bold text-purple-400 mb-1">{stats.metricas.mes.tasaAgendamiento}%</p>
                                <p className="text-center text-gray-400 text-sm">Contactos que agendaron</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Distribución de Prospectos */}
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 mb-8">
                    <h3 className="text-xl font-bold text-white mb-6">Distribución de Tus Prospectos</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="text-center p-6 bg-gray-700/30 rounded-lg border border-gray-600">
                            <p className="text-5xl font-bold text-(--theme-400) mb-2">{stats.distribucion.prospecto_nuevo}</p>
                            <p className="text-gray-400 text-sm">Nuevos</p>
                            <p className="text-gray-500 text-xs mt-2">{stats.resumen.totalClientes > 0 ? ((stats.distribucion.prospecto_nuevo / stats.resumen.totalClientes) * 100).toFixed(1) : 0}%</p>
                        </div>
                        <div className="text-center p-6 bg-(--theme-500)/10 rounded-lg border border-(--theme-500)/30">
                            <p className="text-5xl font-bold text-(--theme-400) mb-2">{stats.distribucion.en_contacto}</p>
                            <p className="text-gray-400 text-sm">En Contacto</p>
                            <p className="text-(--theme-300) text-xs mt-2">{stats.resumen.totalClientes > 0 ? ((stats.distribucion.en_contacto / stats.resumen.totalClientes) * 100).toFixed(1) : 0}%</p>
                        </div>
                        <div className="text-center p-6 bg-purple-500/10 rounded-lg border border-purple-500/30">
                            <p className="text-5xl font-bold text-purple-400 mb-2">{stats.distribucion.reunion_agendada}</p>
                            <p className="text-gray-400 text-sm">Reunión Agendada</p>
                            <p className="text-purple-300 text-xs mt-2">{stats.resumen.totalClientes > 0 ? ((stats.distribucion.reunion_agendada / stats.resumen.totalClientes) * 100).toFixed(1) : 0}%</p>
                        </div>
                        <div className="text-center p-6 bg-green-500/10 rounded-lg border border-green-500/30">
                            <p className="text-5xl font-bold text-green-400 mb-2">{stats.distribucion.transferidos}</p>
                            <p className="text-gray-400 text-sm">Transferidos</p>
                            <p className="text-green-300 text-xs mt-2">{stats.resumen.totalClientes > 0 ? ((stats.distribucion.transferidos / stats.resumen.totalClientes) * 100).toFixed(1) : 0}%</p>
                        </div>
                    </div>
                </div>

                {/* Rendimiento Semanal - Gráfico */}
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-6">Rendimiento Últimas 4 Semanas</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="border-b border-gray-700">
                                <tr>
                                    <th className="text-left p-4 text-gray-400 font-semibold text-sm">Semana</th>
                                    <th className="text-center p-4 text-gray-400 font-semibold text-sm">Llamadas</th>
                                    <th className="text-center p-4 text-gray-400 font-semibold text-sm">Contactos</th>
                                    <th className="text-center p-4 text-gray-400 font-semibold text-sm">Agendadas</th>
                                    <th className="text-center p-4 text-gray-400 font-semibold text-sm">Tasa Contacto</th>
                                    <th className="text-center p-4 text-gray-400 font-semibold text-sm">Visualización</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.rendimientoSemanal.map((semana, index) => (
                                    <tr key={index} className="border-b border-gray-800 hover:bg-gray-700/30 transition-colors">
                                        <td className="p-4 text-white font-semibold text-sm">{semana.semana}</td>
                                        <td className="p-4 text-center text-gray-300 text-sm">{semana.llamadas}</td>
                                        <td className="p-4 text-center text-(--theme-400) font-semibold text-sm">{semana.contactos}</td>
                                        <td className="p-4 text-center text-purple-400 font-semibold text-sm">{semana.agendadas}</td>
                                        <td className="p-4 text-center">
                                            <span className={`font-bold text-sm ${parseFloat(semana.tasaContacto) >= 60 ? 'text-green-400' : parseFloat(semana.tasaContacto) >= 40 ? 'text-yellow-400' : 'text-orange-400'}`}>
                                                {semana.tasaContacto}%
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="h-8 bg-gray-700 rounded-full overflow-hidden inline-block w-24">
                                                <div
                                                    className={`h-full rounded-full transition-all ${parseFloat(semana.tasaContacto) >= 60 ? 'bg-green-500' : parseFloat(semana.tasaContacto) >= 40 ? 'bg-yellow-500' : 'bg-orange-500'}`}
                                                    style={{ width: `${Math.min(100, semana.tasaContacto)}%` }}
                                                />
                                            </div>
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

export default ProspectorEstadisticas;
