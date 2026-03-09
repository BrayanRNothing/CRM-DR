import React, { useState, useEffect } from 'react';
import { RefreshCw, BarChart3, TrendingUp, AlertTriangle, PieChart, Users, Target, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import FunnelVisual from '../../components/FunnelVisual';

import API_URL from '../../config/api';

const CloserEstadisticas = () => {
    const [loading, setLoading] = useState(true);
    const [pData, setPData] = useState(null);
    const [cData, setCData] = useState(null);

    const checkData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            if (!token) return;

            const config = { headers: { 'x-auth-token': token } };

            const [prospectorRes, closerRes] = await Promise.all([
                axios.get(`${API_URL}/api/prospector/dashboard`, config).catch(() => ({ data: {} })),
                axios.get(`${API_URL}/api/closer/dashboard`, config).catch(() => ({ data: {} }))
            ]);

            setPData(prospectorRes.data || {});
            setCData(closerRes.data || {});
        } catch (error) {
            console.error('Error al cargar métricas de estadísticas:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen p-6 flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="w-12 h-12 text-blue-900 animate-spin mx-auto mb-4" />
                    <p className="text-slate-600 font-medium">Renderizando análisis algorítmico...</p>
                </div>
            </div>
        );
    }

    if (!pData || !cData) return null;

    // Extracción de métricas
    const prospectosRecibidos = pData.embudo?.total || 0;
    const prospectosContactados = pData.embudo?.en_contacto || 0;
    const citasAgendadas = cData.embudo?.total || pData.embudo?.reunion_agendada || 0;
    const citasRealizadas = cData.embudo?.reunion_realizada || 0;
    const propuestasEnviadas = cData.embudo?.propuesta_enviada || 0;
    const enNegociacion = cData.metricas?.negociaciones?.activas || 0;
    const ventasCerradas = cData.embudo?.venta_ganada || 0;

    // Cálculos de tasas generales
    const tasaContacto = prospectosRecibidos > 0 ? ((prospectosContactados / prospectosRecibidos) * 100).toFixed(1) : 0;
    const tasaAgendamiento = prospectosContactados > 0 ? ((citasAgendadas / prospectosContactados) * 100).toFixed(1) : 0;
    const tasaAsistencia = citasAgendadas > 0 ? ((citasRealizadas / citasAgendadas) * 100).toFixed(1) : 0;
    const tasaPropuesta = citasRealizadas > 0 ? ((propuestasEnviadas / citasRealizadas) * 100).toFixed(1) : 0;
    const tasaCierreGlobal = prospectosRecibidos > 0 ? ((ventasCerradas / prospectosRecibidos) * 100).toFixed(1) : 0;
    const tasaCierreCita = citasRealizadas > 0 ? ((ventasCerradas / citasRealizadas) * 100).toFixed(1) : 0;

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 overflow-y-auto bg-slate-50/50">

            {/* ═══ Header ═══ */}
            <div className="mb-4">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-blue-900" />
                    Estadísticas y Rendimiento Global
                </h1>
                <p className="text-slate-500 text-sm font-medium mt-1">Análisis profundo del ciclo de vida del prospecto.</p>
            </div>

            {/* ═══ Embudo de Ventas Analítico (FunnelVisual) ═══ */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-8 relative">
                <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-500" />
                    Embudo Maestro de 7 Pasos
                </h2>

                <FunnelVisual
                    stages={[
                        {
                            etapa: 'Prospectos Nuevos',
                            cantidad: prospectosRecibidos,
                            color: 'bg-blue-500',
                            contadorHoy: 0,
                            labelContador: 'todos',
                            cantidadExito: prospectosContactados,
                            cantidadPerdida: prospectosRecibidos - prospectosContactados,
                            porcentajeExito: Math.round(tasaContacto) || 0,
                            porcentajePerdida: prospectosRecibidos > 0 ? (100 - tasaContacto).toFixed(1) : 0,
                            labelExito: 'pasan a',
                            labelPerdida: 'sin contactar'
                        },
                        {
                            etapa: 'Contactados',
                            cantidad: prospectosContactados,
                            color: 'bg-blue-800',
                            contadorHoy: 0,
                            labelContador: '',
                            cantidadExito: citasAgendadas,
                            cantidadPerdida: prospectosContactados - citasAgendadas,
                            porcentajeExito: Math.round(tasaAgendamiento) || 0,
                            porcentajePerdida: prospectosContactados > 0 ? (100 - tasaAgendamiento).toFixed(1) : 0,
                            labelExito: 'pasan a',
                            labelPerdida: 'no agendan'
                        },
                        {
                            etapa: 'Citas Agendadas',
                            cantidad: citasAgendadas,
                            color: 'bg-cyan-500',
                            contadorHoy: 0,
                            labelContador: '',
                            cantidadExito: citasRealizadas,
                            cantidadPerdida: cData.analisisPerdidas?.no_asistio || 0, // Fallidas (show)
                            porcentajeExito: Math.round(tasaAsistencia) || 0,
                            porcentajePerdida: citasAgendadas > 0 ? ((cData.analisisPerdidas?.no_asistio || 0) / citasAgendadas * 100).toFixed(1) : 0,
                            labelExito: 'pasan a',
                            labelPerdida: 'no asisten'
                        },
                        {
                            etapa: 'Citas Realizadas',
                            cantidad: citasRealizadas,
                            color: 'bg-indigo-500',
                            contadorHoy: 0,
                            labelContador: '',
                            cantidadExito: propuestasEnviadas,
                            cantidadPerdida: cData.analisisPerdidas?.no_interesado || 0,
                            porcentajeExito: Math.round(tasaPropuesta) || 0,
                            porcentajePerdida: citasRealizadas > 0 ? ((cData.analisisPerdidas?.no_interesado || 0) / citasRealizadas * 100).toFixed(1) : 0,
                            labelExito: 'pasan a',
                            labelPerdida: 'no interesados'
                        },
                        {
                            etapa: 'Oferta / Propuesta',
                            cantidad: propuestasEnviadas,
                            color: 'bg-purple-500',
                            contadorHoy: 0,
                            labelContador: '',
                            cantidadExito: enNegociacion,
                            cantidadPerdida: propuestasEnviadas - enNegociacion - ventasCerradas > 0 ? (propuestasEnviadas - enNegociacion - ventasCerradas) : 0,
                            porcentajeExito: propuestasEnviadas > 0 ? Math.round((enNegociacion / propuestasEnviadas) * 100) : 0,
                            porcentajePerdida: 0,
                            labelExito: 'pasan a',
                            labelPerdida: 'rechazan'
                        },
                        {
                            etapa: 'En Negociación',
                            cantidad: enNegociacion,
                            color: 'bg-orange-500',
                            contadorHoy: 0,
                            labelContador: '',
                            cantidadExito: ventasCerradas,
                            cantidadPerdida: 0,
                            porcentajeExito: enNegociacion > 0 ? Math.round((ventasCerradas / enNegociacion) * 100) : 0,
                            porcentajePerdida: 0,
                            labelExito: 'pasan a',
                            labelPerdida: ' '
                        },
                        {
                            etapa: 'Ventas Cerradas',
                            cantidad: ventasCerradas,
                            color: 'bg-rose-500',
                            contadorHoy: 0,
                            labelContador: '',
                            cantidadExito: ventasCerradas,
                            cantidadPerdida: 0,
                            porcentajeExito: 100,
                            porcentajePerdida: 0,
                            labelExito: 'clientes',
                            labelPerdida: ''
                        }
                    ]}
                    lossesStage={{
                        etapa: 'Pérdidas de Prospectos',
                        cantidad: (cData.analisisPerdidas?.no_asistio || 0) + (cData.analisisPerdidas?.no_interesado || 0),
                        color: 'bg-red-500', // red card for losses
                        contadorHoy: 0,
                        cantidadExito: cData.analisisPerdidas?.no_asistio || 0,
                        cantidadPerdida: cData.analisisPerdidas?.no_interesado || 0,
                        porcentajeExito: 0,
                        porcentajePerdida: 0,
                        labelExito: 'No Asistieron',
                        labelPerdida: 'No Interesados'
                    }}
                    type="closer" // Keeps the gradient style from the original
                />
            </div>

        </div>
    );
};

export default CloserEstadisticas;
