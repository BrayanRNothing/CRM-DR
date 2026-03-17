import React, { useState } from 'react';
import toast from 'react-hot-toast';

function ConfirmarFinalizarModal({ servicio, onConfirm, onCancel }) {
    const [notas, setNotas] = useState('');
    const [loading, setLoading] = useState(false);

    const handleConfirmar = async () => {
        setLoading(true);
        try {
            await onConfirm(notas);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn" onClick={onCancel}>
            <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 text-white">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 rounded-full p-3">
                            <span className="text-3xl">✅</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Finalizar Servicio</h2>
                            <p className="text-green-100 text-sm">¿Completaste este trabajo?</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Service Info */}
                    <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
                        <h3 className="font-bold text-gray-800 mb-1">{servicio.titulo}</h3>
                        <p className="text-sm text-gray-600">Cliente: {servicio.cliente}</p>
                        <p className="text-sm text-gray-600">Dirección: {servicio.direccion}</p>
                    </div>

                    {/* Notes Input */}
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            Notas finales (opcional)
                        </label>
                        <textarea
                            value={notas}
                            onChange={(e) => setNotas(e.target.value)}
                            rows="3"
                            className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                            placeholder="Agrega comentarios sobre el trabajo realizado..."
                        />
                    </div>

                    {/* Warning */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                        <div className="flex gap-2">
                            <span className="text-yellow-600 text-lg">⚠️</span>
                            <p className="text-xs text-yellow-800">
                                Al confirmar, este servicio se marcará como <strong>completado</strong> y se moverá al historial.
                            </p>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            disabled={loading}
                            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-xl transition disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleConfirmar}
                            disabled={loading}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? '⏳ Finalizando...' : '✅ Confirmar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ConfirmarFinalizarModal;
