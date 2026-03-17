import React, { useState } from 'react';
import { Code, Eye, Copy } from 'lucide-react';
import AnimatedGridBackground from '../components/ui/AnimatedGridBackground';
import DataGridTemplate from '../components/templates/DataGridTemplate';
import DataCardTemplate from '../components/templates/DataCardTemplate';


/**
 * PÁGINA DE PREVIEW/DESARROLLO
 * Ruta: /prev
 * 
 * Usa esta página para:
 * - Probar componentes nuevos
 * - Ver cómo quedan visualmente
 * - Experimentar con estilos
 * 
 * INSTRUCCIONES:
 * 1. Pega tu componente en la sección "COMPONENTE DE PRUEBA"
 * 2. Guarda el archivo
 * 3. Ve a http://localhost:5173/prev
 * 4. Verás el componente renderizado
 */

const ComponentPreview = () => {
    const [showCode, setShowCode] = useState(false);

    // ============================================
    // 👇 PEGA TU COMPONENTE AQUÍ 👇
    // ============================================

    const TestComponent = () => {
        return (
            <div className="space-y-8">
                <div className="text-white mb-4">
                    <h2 className="text-2xl font-bold">Preview de DataGrid (Mosaico Infinito)</h2>
                    <p className="text-gray-400">Sistema de 5 columnas para reemplazar listas</p>
                </div>

                <div className="h-[600px] border border-gray-700/50 rounded-xl overflow-hidden bg-gray-900/20">
                    <DataGridTemplate>
                        {Array.from({ length: 15 }).map((_, i) => (
                            <DataCardTemplate
                                key={i}
                                title={`Usuario Ejemplo ${i + 1}`}
                                subtitle="Empresa S.A."
                                secondaryText="Activo hace 5 min"
                                status={i % 3 === 0 ? 'active' : 'pending'}
                                image={i % 2 === 0 ? `https://i.pravatar.cc/150?u=${i}` : null}
                            />
                        ))}
                    </DataGridTemplate>
                </div>
            </div>
        );
    };

    // ============================================
    // 👆 FIN DEL COMPONENTE DE PRUEBA 👆
    // ============================================

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                <Eye className="w-8 h-8 text-blue-400" />
                                Preview / Desarrollo
                            </h1>
                            <p className="text-gray-400 mt-1">Página secreta para probar componentes</p>
                        </div>
                        <button
                            onClick={() => setShowCode(!showCode)}
                            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
                        >
                            <Code className="w-5 h-5" />
                            {showCode ? 'Ocultar' : 'Ver'} Código
                        </button>
                    </div>
                </div>

                {/* Instrucciones */}
                {showCode && (
                    <div className="mb-6 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                            <Copy className="w-5 h-5 text-blue-400" />
                            Cómo usar esta página
                        </h3>
                        <ol className="text-gray-300 space-y-2 list-decimal list-inside">
                            <li>Abre el archivo: <code className="bg-gray-900 px-2 py-1 rounded text-blue-400">src/pages/ComponentPreview.jsx</code></li>
                            <li>Busca la sección marcada con <code className="bg-gray-900 px-2 py-1 rounded text-yellow-400">PEGA TU COMPONENTE AQUÍ</code></li>
                            <li>Pega tu componente dentro de <code className="bg-gray-900 px-2 py-1 rounded text-green-400">TestComponent</code></li>
                            <li>Guarda el archivo y recarga esta página</li>
                            <li>¡Verás tu componente renderizado abajo! 👇</li>
                        </ol>
                    </div>
                )}

                {/* Preview Area */}
                <div className="bg-gray-800/30 border-2 border-dashed border-gray-700 rounded-xl p-8">
                    <div className="mb-4 text-center">
                        <span className="inline-block bg-blue-600/20 text-blue-400 px-4 py-2 rounded-lg text-sm font-medium border border-blue-500/30">
                            📺 ÁREA DE PREVIEW
                        </span>
                    </div>

                    {/* Aquí se renderiza el componente de prueba */}
                    <div className="bg-gray-900/50 rounded-xl p-6">
                        <TestComponent />
                    </div>
                </div>

                {/* Info adicional */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
                        <h4 className="text-white font-semibold mb-2">💡 Templates</h4>
                        <p className="text-gray-400 text-sm">
                            Usa los templates en <code className="text-blue-400">src/components/templates/</code>
                        </p>
                    </div>
                    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
                        <h4 className="text-white font-semibold mb-2">🎨 Estilos</h4>
                        <p className="text-gray-400 text-sm">
                            Todos los componentes usan Tailwind CSS con tema oscuro
                        </p>
                    </div>
                    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
                        <h4 className="text-white font-semibold mb-2">🔒 Privado</h4>
                        <p className="text-gray-400 text-sm">
                            Esta página es solo para desarrollo, no aparece en menús
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComponentPreview;
