import React from 'react';
import {
    Phone,
    MessageSquare,
    Calendar,
    Clock,
    CheckCircle2,
    FileText,
    Zap
} from 'lucide-react';

const SeguimientoHistorialPanel = ({
    actividadesContext,
    notaInteraccion,
    setNotaInteraccion,
    registrandoInteraccion,
    onGuardarInteraccion
}) => {
    return (
        <div className="w-[330px] xl:w-[360px] flex flex-col border-l border-slate-200 bg-white overflow-hidden min-h-0">
            <div className="px-6 py-4 bg-blue-900 shrink-0 flex justify-center">
                <h3 className="font-black text-white uppercase tracking-wide text-2xl">Historial</h3>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
                {actividadesContext.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-2 py-8">
                        <Clock className="w-10 h-10" />
                        <p className="text-sm">Sin interacciones aún</p>
                    </div>
                ) : (
                    <div className="py-3">
                        {[...actividadesContext].reverse().map((act, idx) => {
                            const tipoInfo = {
                                llamada: {
                                    dot: act.resultado === 'exitoso' ? 'bg-emerald-400' : 'bg-rose-400',
                                    label: act.resultado === 'exitoso' ? '📞 Llamada contestada' : '📞 Sin respuesta',
                                    icon: <Phone className="w-3 h-3" />
                                },
                                cita: { dot: 'bg-blue-400', label: '📅 Cita', icon: <Calendar className="w-3 h-3" /> },
                                whatsapp: { dot: 'bg-green-400', label: '💬 WhatsApp', icon: <MessageSquare className="w-3 h-3" /> },
                                personalizado: { dot: 'bg-blue-300', label: '⚡ Acción', icon: <Zap className="w-3 h-3" /> },
                                nota: { dot: 'bg-slate-300', label: '📝 Nota', icon: <FileText className="w-3 h-3" /> }
                            }[act.tipo] || {
                                dot: 'bg-slate-200',
                                label: act.tipo || 'Interacción',
                                icon: <CheckCircle2 className="w-3 h-3" />
                            };

                            return (
                                <div key={idx} className="flex items-start gap-2 px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0">
                                    <div className={`w-2 h-2 rounded-full ${tipoInfo.dot} mt-2 shrink-0`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-700 truncate">{tipoInfo.label}</p>
                                        {act.notas && <p className="text-xs text-slate-500 truncate">{act.notas}</p>}
                                        {act.descripcion && !act.notas && <p className="text-xs text-slate-500 truncate">{act.descripcion}</p>}
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            {new Date(act.fecha || act.createdAt).toLocaleDateString('es-MX', {
                                                day: 'numeric',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-slate-200 shrink-0 bg-white">
                <div className="flex gap-2 items-center border border-slate-200 rounded-lg px-3 py-2 bg-slate-50">
                    <input
                        type="text"
                        value={notaInteraccion}
                        onChange={(e) => setNotaInteraccion(e.target.value)}
                        onKeyDown={async (e) => {
                            if (e.key === 'Enter' && notaInteraccion.trim()) {
                                await onGuardarInteraccion();
                            }
                        }}
                        placeholder="texto libre..."
                        className="flex-1 bg-transparent text-2xl outline-none placeholder:text-slate-400 placeholder:font-semibold"
                    />
                    <button
                        onClick={onGuardarInteraccion}
                        disabled={registrandoInteraccion || !notaInteraccion.trim()}
                        className="px-2 py-1 text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-40 text-xl font-bold"
                    >
                        →
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SeguimientoHistorialPanel;
