import React from 'react';
import { DottedGlowBackground } from '../../components/ui/DottedGlowBackground';

export default function MiPagina() {
    return (
        <div className="relative w-full h-screen overflow-hidden bg-gray-900">
            {/* El fondo va primero */}
            <DottedGlowBackground
                color="#3b82f6" // Un azul tipo profesional
                gap={15}
                speedScale={1.2}
            />

            {/* Tu contenido va encima con position relative o absolute */}
            <div className="relative z-10 flex flex-col items-center justify-center h-full">
                <h1 className="text-4xl font-bold text-white">InfiniguardSYS</h1>
                <p className="text-gray-400">Panel de Control</p>
            </div>
        </div>
    );
}
