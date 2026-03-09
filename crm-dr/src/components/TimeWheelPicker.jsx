import { useRef, useEffect, useCallback, useState } from 'react';

const ITEM_H = 32;
const VISIBLE = 3;

function to12h(h24) {
    const ampm = h24 < 12 ? 'AM' : 'PM';
    const h12  = h24 % 12 === 0 ? 12 : h24 % 12;
    return { h12, ampm };
}
function to24h(h12, ampm) {
    if (ampm === 'AM') return h12 === 12 ? 0 : h12;
    return h12 === 12 ? 12 : h12 + 12;
}

function WheelColumn({ items, selected, onChange, display }) {
    const ref = useRef(null);
    const isUserScrolling = useRef(false);
    const scrollTimer = useRef(null);

    useEffect(() => {
        if (ref.current && !isUserScrolling.current) {
            ref.current.scrollTo({ top: selected * ITEM_H, behavior: 'smooth' });
        }
    }, [selected]);

    const handleScroll = useCallback(() => {
        if (!ref.current) return;
        isUserScrolling.current = true;
        clearTimeout(scrollTimer.current);
        const idx = Math.round(ref.current.scrollTop / ITEM_H);
        const clamped = Math.max(0, Math.min(items.length - 1, idx));
        if (clamped !== selected) onChange(clamped);
        scrollTimer.current = setTimeout(() => {
            if (ref.current) ref.current.scrollTo({ top: clamped * ITEM_H, behavior: 'smooth' });
            isUserScrolling.current = false;
        }, 120);
    }, [items.length, selected, onChange]);

    return (
        <div className="relative" style={{ width: 44, height: ITEM_H * VISIBLE }}>
            <div className="absolute inset-x-0 pointer-events-none z-10 bg-blue-100 border-y border-blue-400 rounded"
                style={{ top: ITEM_H, height: ITEM_H }} />
            <div className="absolute inset-x-0 top-0 pointer-events-none z-10 bg-gradient-to-b from-white to-transparent" style={{ height: ITEM_H }} />
            <div className="absolute inset-x-0 bottom-0 pointer-events-none z-10 bg-gradient-to-t from-white to-transparent" style={{ height: ITEM_H }} />
            <div ref={ref} onScroll={handleScroll} className="h-full overflow-y-scroll"
                style={{ scrollSnapType: 'y mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <div style={{ height: ITEM_H }} />
                {items.map((item, i) => (
                    <div key={i}
                        onClick={() => { onChange(i); ref.current?.scrollTo({ top: i * ITEM_H, behavior: 'smooth' }); }}
                        className={`flex items-center justify-center cursor-pointer select-none transition-all duration-150 ${i === selected ? 'text-blue-700 text-base font-black' : 'text-gray-400 text-xs font-medium'}`}
                        style={{ height: ITEM_H, scrollSnapAlign: 'center' }}>
                        {display ? display(item) : String(item).padStart(2, '0')}
                    </div>
                ))}
                <div style={{ height: ITEM_H }} />
            </div>
        </div>
    );
}

export default function TimeWheelPicker({ value, onChange, dateClassName = '', dateLabel }) {
    const datePart = value ? value.slice(0, 10) : '';
    const timePart = value ? value.slice(11, 16) : '09:00';
    const [hStr, mStr] = (timePart || '09:00').split(':');
    const hour24 = Math.min(23, Math.max(0, parseInt(hStr || '9', 10)));
    const minute = Math.min(59, Math.max(0, parseInt(mStr || '0', 10)));
    const { h12, ampm } = to12h(hour24);

    // Raw keyboard input state for display fields
    const [hInput, setHInput] = useState(null); // null = not editing
    const [mInput, setMInput] = useState(null);

    const hours12 = Array.from({ length: 12 }, (_, i) => i + 1);
    const minutes = Array.from({ length: 60 }, (_, i) => i);

    const updateTime = (newH24, newMin) => {
        const hh = String(newH24).padStart(2, '0');
        const mm = String(newMin).padStart(2, '0');
        const date = datePart || new Date().toISOString().slice(0, 10);
        onChange(`${date}T${hh}:${mm}`);
    };

    const handleHourChange   = (idx) => updateTime(to24h(hours12[idx], ampm), minute);
    const handleMinuteChange = (idx) => updateTime(hour24, minutes[idx]);
    const toggleAmPm         = () => updateTime(to24h(h12, ampm === 'AM' ? 'PM' : 'AM'), minute);
    const handleDateChange   = (e) => onChange(`${e.target.value}T${String(hour24).padStart(2,'0')}:${String(minute).padStart(2,'0')}`);

    // Keyboard handlers for the display inputs
    const commitHour = (raw) => {
        const parsed = parseInt(raw, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 12) {
            updateTime(to24h(parsed, ampm), minute);
        }
        setHInput(null);
    };
    const commitMinute = (raw) => {
        const parsed = parseInt(raw, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 59) {
            updateTime(hour24, parsed);
        }
        setMInput(null);
    };

    const inputClass = "bg-transparent outline-none text-blue-600 font-black tabular-nums text-center leading-none";

    return (
        <div className="space-y-2">
            {dateLabel && <label className="block text-xs font-medium text-gray-700 mb-1">{dateLabel}</label>}
            <input type="date" value={datePart} onChange={handleDateChange}
                className={`w-full border border-slate-200 rounded px-3 py-1.5 text-sm ${dateClassName}`} />

            <div className="flex items-center gap-3 border border-slate-200 rounded-xl bg-white px-3 py-2">
                {/* Live display — editable with keyboard */}
                <div className="flex flex-col items-center justify-center min-w-[72px]">
                    <div className="flex items-center text-3xl font-black text-blue-600 tabular-nums leading-none">
                        {/* Hour */}
                        {hInput !== null ? (
                            <input
                                autoFocus
                                type="number" min="1" max="12"
                                value={hInput}
                                onChange={e => setHInput(e.target.value)}
                                onBlur={() => commitHour(hInput)}
                                onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); commitHour(hInput); } if (e.key === 'Escape') setHInput(null); }}
                                className={`${inputClass} w-[2ch] text-3xl [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`}
                            />
                        ) : (
                            <span className="cursor-text hover:bg-blue-50 rounded px-0.5 transition-colors"
                                title="Clic para editar hora"
                                onClick={() => setHInput(String(h12))}>
                                {String(h12).padStart(2, '0')}
                            </span>
                        )}
                        <span className="animate-pulse mx-0.5">:</span>
                        {/* Minute */}
                        {mInput !== null ? (
                            <input
                                autoFocus
                                type="number" min="0" max="59"
                                value={mInput}
                                onChange={e => setMInput(e.target.value)}
                                onBlur={() => commitMinute(mInput)}
                                onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); commitMinute(mInput); } if (e.key === 'Escape') setMInput(null); }}
                                className={`${inputClass} w-[2ch] text-3xl [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`}
                            />
                        ) : (
                            <span className="cursor-text hover:bg-blue-50 rounded px-0.5 transition-colors"
                                title="Clic para editar minutos"
                                onClick={() => setMInput(String(minute))}>
                                {String(minute).padStart(2, '0')}
                            </span>
                        )}
                    </div>
                    <span className={`text-xs font-black mt-0.5 ${ampm === 'AM' ? 'text-sky-500' : 'text-orange-500'}`}>{ampm}</span>
                </div>

                <div className="w-px bg-slate-200 self-stretch" />

                {/* Wheels + AM/PM */}
                <div className="flex items-center gap-1 flex-1 justify-center">
                    <WheelColumn items={hours12} selected={hours12.indexOf(h12)} onChange={handleHourChange} display={v => String(v).padStart(2,'0')} />
                    <div className="text-lg font-black text-gray-300 select-none">:</div>
                    <WheelColumn items={minutes} selected={minute} onChange={handleMinuteChange} />
                    <div className="flex flex-col gap-1 ml-1">
                        <button onClick={() => ampm === 'PM' && toggleAmPm()}
                            className={`px-2 py-1 rounded text-xs font-bold transition-colors ${ampm === 'AM' ? 'bg-sky-500 text-white' : 'bg-slate-100 text-gray-400 hover:bg-slate-200'}`}>AM</button>
                        <button onClick={() => ampm === 'AM' && toggleAmPm()}
                            className={`px-2 py-1 rounded text-xs font-bold transition-colors ${ampm === 'PM' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-gray-400 hover:bg-slate-200'}`}>PM</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
