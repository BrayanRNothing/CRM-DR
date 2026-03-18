import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export default function TimeWheelPicker({ value, onChange, dateClassName = '', dateLabel }) {
    const datePart = value ? value.slice(0, 10) : '';
    const timePart = value ? value.slice(11, 16) : '09:00';
    const [hStr, mStr] = (timePart || '09:00').split(':');
    const hour24 = Math.min(23, Math.max(0, parseInt(hStr || '9', 10)));
    const minute = Math.min(59, Math.max(0, parseInt(mStr || '0', 10)));

    const h12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    const ampm = hour24 < 12 ? 'AM' : 'PM';

    const updateTime = (newH24, newMin) => {
        const hh = String(newH24).padStart(2, '0');
        const mm = String(newMin).padStart(2, '0');
        const date = datePart || new Date().toISOString().slice(0, 10);
        onChange(`${date}T${hh}:${mm}`);
    };

    const handleHourChange = (input) => {
        const parsed = parseInt(input, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 12) {
            const h24 = ampm === 'AM' 
                ? (parsed === 12 ? 0 : parsed)
                : (parsed === 12 ? 12 : parsed + 12);
            updateTime(h24, minute);
        }
    };

    const handleMinuteChange = (input) => {
        const parsed = parseInt(input, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 59) {
            updateTime(hour24, parsed);
        }
    };

    const incrementHour = () => {
        const newH24 = (hour24 + 1) % 24;
        updateTime(newH24, minute);
    };

    const decrementHour = () => {
        const newH24 = hour24 === 0 ? 23 : hour24 - 1;
        updateTime(newH24, minute);
    };

    const incrementMinute = () => {
        const newMin = minute === 59 ? 0 : minute + 1;
        updateTime(hour24, newMin);
    };

    const decrementMinute = () => {
        const newMin = minute === 0 ? 59 : minute - 1;
        updateTime(hour24, newMin);
    };

    const toggleAmPm = () => {
        const newH24 = (hour24 + 12) % 24;
        updateTime(newH24, minute);
    };

    const handleDateChange = (e) => {
        onChange(`${e.target.value}T${String(hour24).padStart(2,'0')}:${String(minute).padStart(2,'0')}`);
    };

    return (
        <div className="space-y-3">
            {dateLabel && <label className="block text-xs font-medium text-gray-700">{dateLabel}</label>}
            <input 
                type="date" 
                value={datePart} 
                onChange={handleDateChange}
                className={`w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-(--theme-400) focus:border-transparent outline-none ${dateClassName}`} 
            />

            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-center gap-4">
                    {/* Horas */}
                    <div className="flex flex-col items-center gap-2">
                        <button
                            onClick={incrementHour}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-(--theme-600)"
                            title="Incrementar hora"
                        >
                            <ChevronUp className="w-5 h-5" />
                        </button>
                        <input
                            type="number"
                            min="1"
                            max="12"
                            value={String(h12).padStart(2, '0')}
                            onChange={(e) => handleHourChange(e.target.value)}
                            className="w-16 text-center text-2xl font-black text-gray-900 border border-slate-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-(--theme-400) focus:border-transparent outline-none"
                        />
                        <button
                            onClick={decrementHour}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-(--theme-600)"
                            title="Decrementar hora"
                        >
                            <ChevronDown className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Separador */}
                    <div className="text-3xl font-black text-gray-300 flex items-center h-20">:</div>

                    {/* Minutos */}
                    <div className="flex flex-col items-center gap-2">
                        <button
                            onClick={incrementMinute}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-(--theme-600)"
                            title="Incrementar minutos"
                        >
                            <ChevronUp className="w-5 h-5" />
                        </button>
                        <input
                            type="number"
                            min="0"
                            max="59"
                            value={String(minute).padStart(2, '0')}
                            onChange={(e) => handleMinuteChange(e.target.value)}
                            className="w-16 text-center text-2xl font-black text-gray-900 border border-slate-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-(--theme-400) focus:border-transparent outline-none"
                        />
                        <button
                            onClick={decrementMinute}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-(--theme-600)"
                            title="Decrementar minutos"
                        >
                            <ChevronDown className="w-5 h-5" />
                        </button>
                    </div>

                    {/* AM/PM */}
                    <div className="flex flex-col gap-2 ml-2">
                        <button
                            onClick={toggleAmPm}
                            className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                                ampm === 'AM'
                                    ? 'bg-sky-500 text-white shadow-md'
                                    : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
                            }`}
                        >
                            AM
                        </button>
                        <button
                            onClick={toggleAmPm}
                            className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                                ampm === 'PM'
                                    ? 'bg-orange-500 text-white shadow-md'
                                    : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
                            }`}
                        >
                            PM
                        </button>
                    </div>
                </div>

                <div className="text-center pt-2 border-t border-slate-200">
                    <p className="text-xs text-gray-500">
                        Hora 24h: <span className="font-mono font-bold text-gray-900">{String(hour24).padStart(2, '0')}:{String(minute).padStart(2, '0')}</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
