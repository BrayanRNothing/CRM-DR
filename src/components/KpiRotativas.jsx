import React, { useState } from 'react';
import { ArrowRightLeft, TrendingUp, AlertTriangle, ChevronDown } from 'lucide-react';

export default function KpiRotativas({
    ClienteSeleccionado,
    actividadesContext,
    llamadasExitosas,
    llamadasFallidas,
    valorCliente,
    setValorCliente,
    monedaSeleccionada,
    setMonedaSeleccionada,
    guardandoMetrica,
    handleGuardarMetricaPersonalizada,
    customSections
}) {
    const [mostrarNuevasKpis, setMostrarNuevasKpis] = useState(false);

    // Calcular valores de módulos
    const tieneModulosData = customSections?.some(s => ['payments', 'contracts', 'products'].includes(s.tipo));
    
    // Total facturado (suma de pagos 'pagado')
    const totalFacturado = customSections
        ?.filter(s => s.tipo === 'payments')
        ?.flatMap(s => s.contenido || [])
        ?.filter(p => p.estado === 'pagado')
        ?.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0) || 0;

    // Pagos Pendientes / Vencidos
    const pagosPendientes = customSections
        ?.filter(s => s.tipo === 'payments')
        ?.flatMap(s => s.contenido || [])
        ?.filter(p => p.estado === 'pendiente' || p.estado === 'vencido');
    
    const cantidadPendientes = pagosPendientes.length;
    const montoPendiente = pagosPendientes.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0);

    // Contratos activos
    const hoy = new Date().toISOString().slice(0,10);
    const contratosActivos = customSections
        ?.filter(s => s.tipo === 'contracts')
        ?.flatMap(s => s.contenido || [])
        ?.filter(c => c.fechaVencimiento && c.fechaVencimiento >= hoy).length || 0;

    // Productos comprados
    const totalProductos = customSections
        ?.filter(s => s.tipo === 'products')
        ?.flatMap(s => s.contenido || [])
        ?.reduce((sum, p) => sum + (parseInt(p.cantidad) || 1), 0) || 0;

    return (
        <div className="relative">
            {/* Botón Switcher (Solo aparece si hay datos en los nuevos módulos) */}
            {tieneModulosData && (
                <button
                    onClick={() => setMostrarNuevasKpis(!mostrarNuevasKpis)}
                    className="absolute -top-10 right-0 flex items-center gap-1.5 px-3 py-1.5 bg-(--theme-50) hover:bg-(--theme-100) text-(--theme-700) rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors border border-(--theme-200) z-10 shadow-sm"
                >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    {mostrarNuevasKpis ? 'Ver Seguimiento' : 'Ver Finanzas'}
                </button>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative overflow-hidden">
                {/* SET 1: SEGUIMIENTO TRADICIONAL */}
                <div className={`col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-3 transition-all duration-500 ease-in-out ${mostrarNuevasKpis ? 'absolute inset-0 opacity-0 pointer-events-none translate-x-full' : 'opacity-100 translate-x-0'}`}>
                    
                    {/* Cuadro 1: Antigüedad */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm flex flex-col justify-center">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Antigüedad</p>
                        <p className="text-2xl font-black text-(--theme-600)">
                            {ClienteSeleccionado?.fechaRegistro || ClienteSeleccionado?.createdAt 
                                ? `${Math.max(1, Math.ceil(Math.abs(new Date() - new Date(ClienteSeleccionado.fechaRegistro || ClienteSeleccionado.createdAt)) / (1000 * 60 * 60 * 24)))} días`
                                : 'N/A'}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1">
                            {ClienteSeleccionado?.fechaRegistro || ClienteSeleccionado?.createdAt
                                ? `Desde: ${new Date(ClienteSeleccionado.fechaRegistro || ClienteSeleccionado.createdAt).toLocaleDateString('es-MX')}`
                                : 'Sin fecha'}
                        </p>
                    </div>

                    {/* Cuadro 2: Llamadas */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm flex flex-col justify-center">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Llamadas</p>
                        <div className="flex items-center justify-center gap-1">
                            <span className="text-2xl font-black text-(--theme-500)" title="Contestadas">{llamadasExitosas}</span>
                            <span className="text-xl font-bold text-slate-300">/</span>
                            <span className="text-2xl font-black text-rose-500" title="No contestadas">{llamadasFallidas}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1 font-bold italic">Si / No contestó</p>
                    </div>

                    {/* Cuadro 3: Reuniones */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm flex flex-col justify-center">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Reuniones</p>
                        <p className="text-3xl font-black text-(--theme-500)">
                            {actividadesContext?.filter(a => a.tipo === 'cita' && a.resultado === 'exitoso').length || 0}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1 font-bold">Realizadas</p>
                    </div>

                    {/* Cuadro 4: Valor del Cliente (Editable) */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm flex flex-col justify-center relative min-h-[100px] overflow-hidden group">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Valor Estimado</p>
                        <div className="flex items-center justify-center gap-1 w-full">
                            <div className="flex items-center gap-0.5 px-2 py-1 rounded-xl bg-white focus-within:bg-slate-50 transition-colors border border-transparent focus-within:border-slate-200">
                                <span className="text-xl font-black text-(--theme-600) opacity-50">$</span>
                                <input
                                    type="text"
                                    value={valorCliente}
                                    onChange={(e) => setValorCliente(e.target.value.replace(/[^0-9.,]/g, ''))}
                                    onBlur={handleGuardarMetricaPersonalizada}
                                    placeholder="0.00"
                                    className="text-2xl font-black text-(--theme-600) bg-transparent border-none text-center outline-none focus:ring-0 p-0"
                                    style={{ width: `${Math.max((valorCliente || '').length, 4)}ch`, minWidth: '4ch', maxWidth: '14ch' }}
                                />
                                <div className="relative flex items-center bg-slate-50 border border-slate-100 rounded-md px-1 py-0.5 group/moneda hover:bg-white transition-all cursor-pointer ml-1">
                                    <select
                                        value={monedaSeleccionada}
                                        onChange={(e) => setMonedaSeleccionada(e.target.value)}
                                        onBlur={handleGuardarMetricaPersonalizada}
                                        className="text-[9px] font-black text-slate-400 bg-transparent border-none appearance-none cursor-pointer outline-none focus:ring-0 p-0 pr-3 uppercase"
                                    >
                                        <option value="MXN">MXN</option>
                                        <option value="USD">USD</option>
                                    </select>
                                    <ChevronDown className="w-2 h-2 text-slate-300 absolute right-0.5 group-hover/moneda:text-(--theme-500) transition-colors pointer-events-none" />
                                </div>
                            </div>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1 font-bold">
                            {guardandoMetrica ? 'Guardando...' : 'Proyección'}
                        </p>
                    </div>
                </div>

                {/* SET 2: FINANZAS Y RETENCIÓN */}
                {tieneModulosData && (
                    <div className={`col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-3 transition-all duration-500 ease-in-out ${!mostrarNuevasKpis ? 'absolute inset-0 opacity-0 pointer-events-none -translate-x-full' : 'opacity-100 translate-x-0'}`}>
                        
                        {/* Cuadro 1: Total Facturado */}
                        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm flex flex-col justify-center">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Total Facturado</p>
                            <p className="text-2xl font-black text-green-600 flex items-center justify-center gap-1">
                                <span className="opacity-50 text-xl">$</span>{totalFacturado.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-1 font-bold flex items-center justify-center gap-1">
                                <TrendingUp className="w-3 h-3 text-green-500" /> Ingresos reales
                            </p>
                        </div>

                        {/* Cuadro 2: Pagos Pendientes */}
                        <div className={`bg-white border rounded-xl p-4 text-center shadow-sm flex flex-col justify-center ${cantidadPendientes > 0 ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200'}`}>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Por Cobrar</p>
                            <p className={`text-2xl font-black ${cantidadPendientes > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                                <span className="opacity-50 text-xl">$</span>{montoPendiente.toLocaleString()}
                            </p>
                            <p className={`text-[10px] mt-1 font-bold flex items-center justify-center gap-1 ${cantidadPendientes > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                                {cantidadPendientes > 0 && <AlertTriangle className="w-3 h-3" />}
                                {cantidadPendientes} {cantidadPendientes === 1 ? 'pago pendiente' : 'pagos pendientes'}
                            </p>
                        </div>

                        {/* Cuadro 3: Contratos */}
                        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm flex flex-col justify-center">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Contratos</p>
                            <p className="text-3xl font-black text-purple-600">
                                {contratosActivos}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-1 font-bold">Activos al día de hoy</p>
                        </div>

                        {/* Cuadro 4: Productos */}
                        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm flex flex-col justify-center">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Productos</p>
                            <p className="text-3xl font-black text-blue-600">
                                {totalProductos}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-1 font-bold">Adquiridos históricamente</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
