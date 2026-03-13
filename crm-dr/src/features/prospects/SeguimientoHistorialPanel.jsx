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
        <div className="w-[330px] xl:w-[380px] flex flex-col border-l border-slate-200 bg-white/50 backdrop-blur-sm overflow-hidden min-h-0">
            <div className="px-6 py-6 bg-gradient-to-r from-indigo-950 to-indigo-900 shrink-0 flex justify-center shadow-md">
                <h3 className="font-black text-white uppercase tracking-widest text-2xl">Historial</h3>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto bg-white/30">
                {actividadesContext.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-3 py-10">
                        <Clock className="w-12 h-12 opacity-50" />
                        <p className="text-sm font-bold uppercase tracking-widest">Sin interacciones aún</p>
                    </div>
                ) : (
                    <div className="py-4">
                        {[...actividadesContext].reverse().map((act, idx) => {
                            const tipoInfo = {
                                llamada: {
                                    dot: act.resultado === 'exitoso' ? 'bg-emerald-400' : 'bg-rose-400',
                                    label: act.resultado === 'exitoso' ? '📞 Llamada Contestada' : '📞 Sin Respuesta',
                                    icon: <Phone className="w-3 h-3 text-white" />
                                },
                                cita: { dot: 'bg-blue-500', label: '📅 Cita', icon: <Calendar className="w-3 h-3 text-white" /> },
                                whatsapp: { dot: 'bg-green-500', label: '💬 WhatsApp', icon: <MessageSquare className="w-3 h-3 text-white" /> },
                                personalizado: { dot: 'bg-indigo-400', label: '⚡ Acción', icon: <Zap className="w-3 h-3 text-white" /> },
                                nota: { dot: 'bg-slate-400', label: '📝 Nota', icon: <FileText className="w-3 h-3 text-white" /> }
                            }[act.tipo] || {
                                dot: 'bg-slate-300',
                                label: act.tipo || 'Interacción',
                                icon: <CheckCircle2 className="w-3 h-3 text-white" />
                            };

                            return (
                                <div key={idx} className="flex items-start gap-3 px-6 py-4 hover:bg-white/80 transition-all border-b border-slate-100 last:border-0 group">
                                    <div className={`w-3 h-3 rounded-full ${tipoInfo.dot} mt-1.5 shrink-0 shadow-sm transition-transform group-hover:scale-125`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-800 tracking-tight">{tipoInfo.label}</p>
                                        {act.notas && <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{act.notas}</p>}
                                        {act.descripcion && !act.notas && <p className="text-xs text-slate-600 mt-0.5 leading-relaxed italic">{act.descripcion}</p>}
                                        <div className="flex items-center gap-1.5 mt-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                                {new Date(act.fecha || act.createdAt).toLocaleDateString('es-MX', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="p-5 border-t border-slate-200 shrink-0 bg-white/80 backdrop-blur-md">
                <div className="flex gap-2 items-center border-2 border-slate-100 rounded-2xl px-4 py-3 bg-white shadow-inner focus-within:border-blue-400 transition-all group">
                    <input
                        type="text"
                        value={notaInteraccion}
                        onChange={(e) => setNotaInteraccion(e.target.value)}
                        onKeyDown={async (e) => {
                            if (e.key === 'Enter' && notaInteraccion.trim()) {
                                await onGuardarInteraccion();
                            }
                        }}
                        placeholder="Escribe una nota..."
                        className="flex-1 bg-transparent text-xl font-medium outline-none placeholder:text-slate-300 placeholder:font-bold"
                    />
                    <button
                        onClick={onGuardarInteraccion}
                        disabled={registrandoInteraccion || !notaInteraccion.trim()}
                        className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-all shadow-md shadow-blue-200 disabled:opacity-30 disabled:shadow-none hover:scale-110 active:scale-90"
                    >
                        <Zap className="w-5 h-5 fill-current" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SeguimientoHistorialPanel;
