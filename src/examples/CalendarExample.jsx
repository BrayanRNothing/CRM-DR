import React, { useState } from 'react';
import { Calendar } from '../components/ui/Calendar';

/**
 * Ejemplo de uso del componente Calendar de shadcn/ui
 * 
 * Características:
 * - Selección de fecha única
 * - Selección de rango de fechas
 * - Deshabilitar fechas específicas
 * - Estilos personalizados con Tailwind
 */

const CalendarExample = () => {
    const [date, setDate] = useState(new Date());
    const [dateRange, setDateRange] = useState();

    return (
        <div className="p-6 space-y-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">
                    Ejemplos de Calendar
                </h1>

                {/* Ejemplo 1: Selección Simple */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        Selección Simple
                    </h2>
                    <div className="flex gap-8 items-start">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            className="rounded-md border"
                        />
                        <div className="flex-1">
                            <p className="text-sm text-gray-600 mb-2">Fecha seleccionada:</p>
                            <p className="text-lg font-semibold text-gray-900">
                                {date ? date.toLocaleDateString('es-ES', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                }) : 'Ninguna'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Ejemplo 2: Rango de Fechas */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        Selección de Rango
                    </h2>
                    <div className="flex gap-8 items-start">
                        <Calendar
                            mode="range"
                            selected={dateRange}
                            onSelect={setDateRange}
                            className="rounded-md border"
                        />
                        <div className="flex-1">
                            <p className="text-sm text-gray-600 mb-2">Rango seleccionado:</p>
                            {dateRange?.from && (
                                <div className="space-y-1">
                                    <p className="text-sm">
                                        <span className="font-medium">Desde:</span>{' '}
                                        {dateRange.from.toLocaleDateString('es-ES')}
                                    </p>
                                    {dateRange.to && (
                                        <p className="text-sm">
                                            <span className="font-medium">Hasta:</span>{' '}
                                            {dateRange.to.toLocaleDateString('es-ES')}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Ejemplo 3: Con Fechas Deshabilitadas */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        Con Fechas Deshabilitadas
                    </h2>
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        disabled={(date) => {
                            // Deshabilitar fines de semana
                            const day = date.getDay();
                            return day === 0 || day === 6;
                        }}
                        className="rounded-md border"
                    />
                    <p className="text-sm text-gray-600 mt-4">
                        * Los fines de semana están deshabilitados
                    </p>
                </div>

                {/* Código de Ejemplo */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mt-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        Código de Ejemplo
                    </h3>
                    <pre className="text-sm text-gray-700 overflow-x-auto">
                        {`import { Calendar } from '../components/ui/Calendar';

// Selección simple
const [date, setDate] = useState(new Date());

<Calendar
  mode="single"
  selected={date}
  onSelect={setDate}
  className="rounded-md border"
/>

// Rango de fechas
const [dateRange, setDateRange] = useState();

<Calendar
  mode="range"
  selected={dateRange}
  onSelect={setDateRange}
  className="rounded-md border"
/>`}
                    </pre>
                </div>
            </div>
        </div>
    );
};

export default CalendarExample;
