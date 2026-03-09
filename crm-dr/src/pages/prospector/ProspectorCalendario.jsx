import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Calendar as CalendarIcon, Clock, User, Phone, CheckCircle2, ChevronLeft, ChevronRight, UserPlus, Briefcase, Mail, MapPin, LogIn, Link as LinkIcon, Copy, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import API_URL from '../../config/api';
import { getToken } from '../../utils/authUtils';

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];



const ProspectorCalendario = () => {
    const location = useLocation();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedCloser, setSelectedCloser] = useState('');
    const [closers, setClosers] = useState([]);
    const [prospectos, setProspectos] = useState([]);
    const [selectedProspect, setSelectedProspect] = useState('');
    const [busySlots, setBusySlots] = useState([]);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
    const [createdEventLink, setCreatedEventLink] = useState(null);
    const [closerLinkedToGoogle, setCloserLinkedToGoogle] = useState(true);
    const [loadingFreeBusy, setLoadingFreeBusy] = useState(false);
    const [formData, setFormData] = useState({
        notas: ''
    });

    React.useEffect(() => {
        const fetchClosers = async () => {
            try {
                const token = getToken();
                console.log("Fetching closers with token:", token ? "Exists" : "Missing");

                const res = await fetch(`${API_URL}/api/usuarios`, {
                    headers: {
                        'x-auth-token': token
                    }
                });

                console.log("Closers fetch status:", res.status);

                if (res.ok) {
                    const data = await res.json();
                    console.log("All Users Data:", data);
                    const closersList = data.filter(u => u.rol === 'closer' || u.rol === 'doctor');
                    console.log("Filtered Closers:", closersList);
                    setClosers(closersList);
                } else {
                    console.error("Failed to fetch users");
                    const text = await res.text();
                    console.error("Response:", text);
                }
            } catch (error) {
                console.error("Error fetching closers:", error);
            }
        };

        const fetchProspectos = async () => {
            try {
                const token = getToken();
                const res = await fetch(`${API_URL}/api/prospector/prospectos`, {
                    headers: { 'x-auth-token': token }
                });
                if (res.ok) {
                    const data = await res.json();
                    // Filter mainly 'en_contacto' or 'prospecto_nuevo' if needed, or allow all
                    setProspectos(data);
                }
            } catch (error) {
                console.error("Error fetching prospects:", error);
            }
        };

        fetchClosers();
        fetchProspectos();
    }, []);

    // Auto-seleccionar prospecto si viene del Seguimiento
    useEffect(() => {
        if (location.state?.prospecto) {
            const p = location.state.prospecto;
            const id = String(p.id || p._id || '');
            if (id) setSelectedProspect(id);
        }
    }, [location.state]);

    useEffect(() => {
        const fetchAvailability = async () => {
            if (!selectedCloser) {
                setBusySlots([]);
                setCloserLinkedToGoogle(true);
                return;
            }

            setLoadingFreeBusy(true);
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const timeMin = new Date(year, month, 1).toISOString();
            const timeMax = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

            try {
                const token = getToken();
                // Añadir timestamp para evitar caché agresivo del navegador en requests GET 
                const res = await fetch(`${API_URL}/api/google/freebusy/${selectedCloser}?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&_t=${Date.now()}`, {
                    headers: { 'x-auth-token': token },
                    cache: 'no-store'
                });

                const data = await res.json();

                if (!res.ok) {
                    if (data.notLinked) {
                        setCloserLinkedToGoogle(false);
                    } else {
                        console.warn("No se pudo obtener disponibilidad:", data.msg);
                    }
                    setBusySlots([]);
                } else {
                    setCloserLinkedToGoogle(true);

                    // Extraer los horarios ocupados sin importar si la llave es el email o 'primary'
                    const allBusy = Object.values(data.calendars || {}).flatMap(cal => cal.busy || []);
                    setBusySlots(allBusy.map(b => ({
                        start: new Date(b.start),
                        end: new Date(b.end)
                    })));
                }
            } catch (err) {
                console.warn("Error en red al pedir freebusy:", err);
                setBusySlots([]);
            } finally {
                setLoadingFreeBusy(false);
            }
        };
        fetchAvailability();
    }, [selectedCloser, currentDate, closers]);

    const generateSlotsForDay = (date) => {
        if (!date) return [];
        if (date.getDay() === 0) return []; // Sunday off

        const slots = [];
        let current = new Date(date);
        current.setHours(6, 0, 0, 0); // Start 6:00 AM

        const endOfDay = new Date(date);
        endOfDay.setHours(17, 0, 0, 0); // End 5:00 PM

        while (current < endOfDay) {
            const slotStart = new Date(current);
            const slotEnd = new Date(current.getTime() + 45 * 60000); // 45 mins

            if (slotEnd <= endOfDay) {
                const isBusy = busySlots.some(busy => {
                    return (slotStart < busy.end && slotEnd > busy.start);
                });

                // We always push the slot, but we mark it as isBusy so we can render it grayed out
                slots.push({ start: slotStart, end: slotEnd, isBusy });
            }
            current.setTime(slotEnd.getTime());
        }
        return slots;
    };

    // Calendar Helper Functions (Same as CloserCalendario)
    const calendarDays = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];
        for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
        for (let day = 1; day <= daysInMonth; day++) days.push(new Date(year, month, day));
        return days;
    }, [currentDate]);

    const isSameDay = (date1, date2) => {
        if (!date1 || !date2) return false;
        return date1.toDateString() === date2.toDateString();
    };

    const isToday = (date) => {
        if (!date) return false;
        return isSameDay(date, new Date());
    };

    const previousMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const closer = closers.find(c => c.id == selectedCloser);
        if (!closer) {
            toast.error('Selecciona un closer');
            return;
        }

        const prospect = prospectos.find(p => p.id == selectedProspect);
        if (!prospect) {
            toast.error('Selecciona un prospecto');
            return;
        }

        const loadingToast = toast.loading('Agendando cita y creando sala virtual...');

        try {
            if (!selectedTimeSlot) throw new Error("Selecciona un horario disponible");

            const startDateTime = selectedTimeSlot.start;

            const resBackend = await fetch(`${API_URL}/api/prospector/agendar-reunion`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': getToken()
                },
                body: JSON.stringify({
                    clienteId: prospect.id,
                    closerId: selectedCloser,
                    fechaReunion: startDateTime.toISOString(),
                    notas: formData.notas
                })
            });

            const dataBackend = await resBackend.json();

            if (!resBackend.ok) {
                console.error("Error agendando:", dataBackend);
                toast.error(dataBackend.msg || "Error agendando cita");
            } else {
                toast.success(`Cita agendada exitosamente con ${closer.nombre}`);
                if (dataBackend.hangoutLink) {
                    setCreatedEventLink(dataBackend.hangoutLink);
                } else if (closerLinkedToGoogle) {
                    toast.error("Se agendó, pero Google falló en crear la liga de Meet");
                }
            }

            toast.dismiss(loadingToast);
            setFormData({ notas: '' });
            setSelectedTimeSlot(null);
            // We can optionally unset prospect string leaving closer alone for next booking.
            setSelectedProspect('');
        } catch (error) {
            console.error(error);
            toast.dismiss(loadingToast);
            toast.error(error.message || 'Error al agendar la cita');
        }
    };

    return (
        <div className="h-full flex flex-col p-5 overflow-hidden">
            <div className="flex-1 flex flex-col space-y-4 overflow-hidden min-h-0">
                {/* Main Grid */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">

                    {/* Calendar Section (Left Side - 2 Cols) */}
                    <div className="lg:col-span-2 flex flex-col min-h-0">
                        <div className="flex-1 p-8 flex flex-col min-h-0">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <button onClick={previousMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                    <ChevronLeft className="w-6 h-6 text-gray-600" />
                                </button>
                                <div className="text-center">
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                                    </h2>
                                    {!selectedCloser && (
                                        <p className="text-xs font-semibold text-orange-500 mt-1 uppercase tracking-wider">
                                            Selecciona un closer para habilitar
                                        </p>
                                    )}
                                </div>
                                <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                    <ChevronRight className="w-6 h-6 text-gray-600" />
                                </button>
                            </div>

                            {/* Calendar Days */}
                            <div className="flex-1 flex flex-col min-h-0">
                                <div className="grid grid-cols-7 gap-2 mb-2 shrink-0">
                                    {DAYS.map(day => (
                                        <div key={day} className="text-center font-semibold text-gray-600 text-sm py-2">
                                            {day}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex-1 grid grid-cols-7 gap-2 min-h-0" style={{ gridAutoRows: '1fr' }}>
                                    {calendarDays.map((date, index) => {
                                        const isSelected = date && isSameDay(date, selectedDate);
                                        const isTodayDate = date && isToday(date);
                                        return (
                                            <button
                                                key={index}
                                                onClick={() => {
                                                    if (date) {
                                                        setSelectedDate(date);
                                                        setSelectedTimeSlot(null);
                                                        setCreatedEventLink(null);
                                                    }
                                                }}
                                                disabled={!date || !selectedCloser}
                                                className={`
                                                    relative rounded-lg transition-all border flex items-center justify-center p-2 min-h-[72px]
                                                    ${!date ? 'bg-gray-50/50 border-gray-100 cursor-default select-none' : ''}
                                                    ${date && !selectedCloser ? 'opacity-40 cursor-not-allowed bg-gray-50 border-gray-100' : ''}
                                                    ${date && selectedCloser && !isSelected ? 'bg-white border-gray-200 hover:border-[#8bc34a]/50 text-gray-700' : ''}
                                                    ${isSelected ? 'bg-[#8bc34a] text-white shadow-lg scale-105 border-[#8bc34a] z-20' : ''}
                                                    ${isTodayDate && !isSelected ? 'bg-lime-50 border-2 border-[#8bc34a] text-[#558b2f]' : ''}
                                                `}
                                            >
                                                <span className={`text-2xl font-bold leading-none select-none ${isSelected ? 'text-white' : ''}`}>
                                                    {date ? date.getDate() : ''}
                                                </span>
                                                {date && date.getDay() !== 0 && (
                                                    <div className="absolute bottom-2 w-full flex flex-col items-center pointer-events-none">
                                                        {(() => {
                                                            if (!selectedCloser) return null;
                                                            if (loadingFreeBusy) {
                                                                return <span className="text-[10px] leading-tight bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full whitespace-nowrap">Cargando</span>;
                                                            }
                                                            const slotsForDay = generateSlotsForDay(date);
                                                            const busySlotsCount = slotsForDay.filter(s => s.isBusy).length;

                                                            if (busySlotsCount === 0) return null;
                                                            return <span className={`text-[10px] leading-tight font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${isSelected ? 'bg-white text-orange-500' : 'bg-orange-50 text-orange-600 border border-orange-100'}`}>{busySlotsCount} {busySlotsCount === 1 ? 'reunión' : 'reuniones'}</span>;
                                                        })()}
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Scheduling Panel (Right Side - 1 Col) */}
                    <div className="lg:col-span-1 flex flex-col min-h-0">
                        <div className="flex-1 bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col overflow-y-auto">
                            <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                                <CalendarIcon className="w-6 h-6 text-[#689f38]" />
                                Agendar Cita
                            </h2>
                            <p className="text-sm text-gray-500 mb-6">
                                Programando para el <span className="font-bold text-gray-800">{selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                            </p>

                            {selectedCloser && !closerLinkedToGoogle && (
                                <div className="mb-4 flex flex-col p-4 bg-orange-50 border border-orange-200 rounded-xl space-y-2 animate-in fade-in">
                                    <div className="flex items-center gap-2 text-orange-800">
                                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                        <p className="font-bold text-sm">Calendario No Vinculado</p>
                                    </div>
                                    <p className="text-sm text-orange-700">Este closer no ha vinculado su cuenta de Google Calendar en sus ajustes. El sistema no puede verificar sus horarios ocupados ni crear la sala de Meet automáticamente.</p>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-4">
                                    {/* Prospect Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Seleccionar Prospecto
                                        </label>
                                        <select
                                            value={selectedProspect}
                                            onChange={(e) => setSelectedProspect(e.target.value)}
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8bc34a] focus:border-transparent"
                                            required
                                        >
                                            <option value="">Selecciona un prospecto...</option>
                                            {prospectos.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.nombres} {p.apellidoPaterno} - {p.empresa || 'Sin empresa'}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Closer Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Asignar Closer (Virtual)
                                        </label>
                                        <select
                                            value={selectedCloser}
                                            onChange={(e) => setSelectedCloser(e.target.value)}
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8bc34a] focus:border-transparent"
                                            required
                                        >
                                            <option value="">Selecciona un closer...</option>
                                            {closers.map(c => (
                                                <option key={c.id} value={c.id}>{c.nombre}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Time Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Horarios Disponibles ({selectedDate ? selectedDate.toLocaleDateString() : ''})
                                        </label>
                                        <div className="grid grid-cols-3 gap-2 mt-2">
                                            {selectedDate && selectedDate.getDay() !== 0 ? (
                                                generateSlotsForDay(selectedDate).length > 0 ? (
                                                    generateSlotsForDay(selectedDate).map((slot, idx) => {
                                                        const timeStr = slot.start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                                                        const isSelected = selectedTimeSlot?.start.getTime() === slot.start.getTime();
                                                        return (
                                                            <button
                                                                key={idx}
                                                                type="button"
                                                                disabled={slot.isBusy}
                                                                onClick={() => !slot.isBusy && setSelectedTimeSlot(slot)}
                                                                className={`p-2 border rounded-lg text-sm text-center transition-colors 
                                                                    ${slot.isBusy
                                                                        ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-60'
                                                                        : isSelected
                                                                            ? 'bg-[#8bc34a] border-[#8bc34a] text-white font-bold'
                                                                            : 'bg-white border-gray-300 hover:bg-green-50 text-gray-700'
                                                                    }`}
                                                            >
                                                                {timeStr}
                                                            </button>
                                                        );
                                                    })
                                                ) : (
                                                    <div className="col-span-3 text-sm text-gray-500 text-center py-4 bg-gray-50 rounded border border-gray-100 italic">Closer sin disponibilidad este día.</div>
                                                )
                                            ) : (
                                                <div className="col-span-3 text-sm text-gray-500 text-center py-4 bg-gray-50 rounded border border-gray-100 italic">Día no laborable (Domingo).</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Notas Adicionales
                                        </label>
                                        <textarea
                                            value={formData.notas}
                                            onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                                            rows="3"
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8bc34a]"
                                            placeholder="Detalles importantes para el closer..."
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={!selectedTimeSlot}
                                    className="w-full py-3 px-4 bg-[#8bc34a] text-white rounded-xl font-bold hover:bg-[#7cb342] shadow-lg shadow-[#8bc34a]/30 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                >
                                    Agendar Cita
                                </button>

                                {createdEventLink && (
                                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex flex-col items-center animate-in fade-in zoom-in slide-in-from-bottom-2">
                                        <div className="flex items-center gap-2 text-blue-800 mb-3">
                                            <LinkIcon className="w-5 h-5" />
                                            <p className="font-bold">Google Meet Creado</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText(createdEventLink);
                                                toast.success('Enlace copiado al portapapeles');
                                            }}
                                            className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center justify-center gap-2 transition-colors active:scale-95 shadow border border-blue-700"
                                        >
                                            <Copy className="w-4 h-4" />
                                            Copiar Enlace de Invitación
                                        </button>
                                    </div>
                                )}
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProspectorCalendario;
