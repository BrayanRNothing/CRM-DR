import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Calendar as CalendarIcon, Clock, User, Phone, CheckCircle2, ChevronLeft, ChevronRight, UserPlus, Briefcase, Mail, MapPin, LogIn, Link as LinkIcon, Copy, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import API_URL from '../../config/api';
import { getToken, getUser } from '../../utils/authUtils';

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];



const ProspectorCalendario = () => {
    const location = useLocation();
    const currentUser = getUser();
    const isVendedor = String(currentUser?.rol || '').toLowerCase() === 'vendedor';
    const currentUserId = String(currentUser?.id || currentUser?._id || '');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedCloser, setSelectedCloser] = useState(isVendedor ? currentUserId : '');
    const [closers, setClosers] = useState([]);
    const [prospectos, setProspectos] = useState([]);
    const [selectedProspect, setSelectedProspect] = useState('');
    const [busySlots, setBusySlots] = useState([]);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
    const [createdEventLink, setCreatedEventLink] = useState(null);
    const [closerLinkedToGoogle, setCloserLinkedToGoogle] = useState(true);
    const [loadingFreeBusy, setLoadingFreeBusy] = useState(false);
    const [misReuniones, setMisReuniones] = useState([]);
    const [loadingMisReuniones, setLoadingMisReuniones] = useState(false);
    const [guardandoResultadoId, setGuardandoResultadoId] = useState(null);
    const [formData, setFormData] = useState({
        notas: ''
    });
    const [activeTab, setActiveTab] = useState('agendar'); // 'agendar' o 'reuniones'

    const cargarMisReuniones = async () => {
        if (!isVendedor) return;
        setLoadingMisReuniones(true);
        try {
            const token = getToken();
            const res = await fetch(`${API_URL}/api/closer/calendario`, {
                headers: { 'x-auth-token': token }
            });
            if (!res.ok) throw new Error('No se pudieron cargar reuniones');
            const data = await res.json();

            const hoy = new Date();
            const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
            const finHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59, 999).getTime();

            const reunionesHoy = (data || [])
                .filter((r) => {
                    const f = new Date(r.fecha).getTime();
                    return f >= inicioHoy && f <= finHoy;
                })
                .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

            setMisReuniones(reunionesHoy);
        } catch (error) {
            console.error('Error cargando reuniones del vendedor:', error);
            setMisReuniones([]);
        } finally {
            setLoadingMisReuniones(false);
        }
    };

    const registrarResultado = async (reunion, resultado) => {
        const clienteId = reunion?.clienteId || reunion?.cliente?.id || reunion?.cliente?._id;
        if (!clienteId) {
            toast.error('Esta reunión no tiene cliente vinculado para registrar resultado.');
            return;
        }

        setGuardandoResultadoId(reunion.id);
        try {
            const token = getToken();
            const res = await fetch(`${API_URL}/api/closer/registrar-reunion`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify({
                    clienteId,
                    resultado,
                    notas: `Resultado registrado desde calendario vendedor (${resultado})`
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.msg || 'Error registrando resultado');
            }

            // Best-effort sync en Google (si existe eventId)
            if (reunion.id) {
                try {
                    await fetch(`${API_URL}/api/google/mark-completed/${reunion.id}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-auth-token': token
                        },
                        body: JSON.stringify({
                            resultado,
                            notas: `Marcado desde calendario vendedor`,
                            clienteNombre: `${reunion?.cliente?.nombres || ''} ${reunion?.cliente?.apellidoPaterno || ''}`.trim()
                        })
                    });
                } catch (e) {
                    console.warn('No se pudo sincronizar evento de Google:', e);
                }
            }

            toast.success('Resultado registrado correctamente');
            if (resultado === 'otra_reunion') {
                toast('Puedes agendar la siguiente reunión en esta misma pantalla.');
            }
            await cargarMisReuniones();
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'No se pudo registrar el resultado');
        } finally {
            setGuardandoResultadoId(null);
        }
    };

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
                    const OCULTAR_USERS = ['brayan', '@brayan', 'closer'];
                    let closersList = data.filter(u => {
                        const isMe = (currentUserId && (String(u.id) === currentUserId || String(u._id) === currentUserId)) || 
                                     (currentUser?.usuario && u.usuario && String(currentUser.usuario).toLowerCase() === String(u.usuario).toLowerCase());
                        const roleMatch = String(u.rol).toLowerCase() === 'closer' || String(u.rol).toLowerCase() === 'vendedor';
                        const isHidden = OCULTAR_USERS.includes(String(u.usuario || '').toLowerCase());
                        
                        if (isMe) return roleMatch;
                        return roleMatch && !isHidden;
                    });

                    // Garantizar que el usuario actual esté en la lista si es vendedor/closer
                    const amIInList = closersList.some(u => (currentUserId && (String(u.id) === currentUserId || String(u._id) === currentUserId)) || (currentUser?.usuario && u.usuario && String(currentUser.usuario).toLowerCase() === String(u.usuario).toLowerCase()));
                    if (!amIInList && (isVendedor || currentUser?.rol === 'closer')) {
                        const meInFetch = data.find(u => (currentUserId && (String(u.id) === currentUserId || String(u._id) === currentUserId)) || (currentUser?.usuario && u.usuario && String(currentUser.usuario).toLowerCase() === String(u.usuario).toLowerCase()));
                        if (meInFetch) closersList.push(meInFetch);
                    }

                    console.log("Filtered Closers:", closersList);
                    setClosers(closersList);

                    // Si el usuario actual es vendedor, autoasigna sus reuniones a sí mismo.
                    if (isVendedor && currentUserId) {
                        const yo = closersList.find(u => 
                            (String(u.id) === currentUserId || String(u._id) === currentUserId) ||
                            (currentUser?.usuario && u.usuario && String(currentUser.usuario).toLowerCase() === String(u.usuario).toLowerCase())
                        );
                        if (yo) setSelectedCloser(String(yo.id || yo._id));
                    }
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

    useEffect(() => {
        // En rol vendedor, mantener asignación por defecto a sí mismo si aún no está elegida.
        if (!isVendedor || selectedCloser || !currentUserId || closers.length === 0) return;
        const yo = closers.find(u => 
            (String(u.id) === currentUserId || String(u._id) === currentUserId) ||
            (currentUser?.usuario && u.usuario && String(currentUser.usuario).toLowerCase() === String(u.usuario).toLowerCase())
        );
        if (yo) setSelectedCloser(String(yo.id || yo._id));
    }, [isVendedor, selectedCloser, currentUserId, closers, currentUser?.usuario]);

    useEffect(() => {
        cargarMisReuniones();
    }, [isVendedor]);

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
            toast.error(isVendedor ? 'Selecciona a quién asignar la reunión' : 'Selecciona un closer');
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
                                                    ${date && selectedCloser && !isSelected ? 'bg-white border-gray-200 hover:border-(--theme-500)/50 text-gray-700' : ''}
                                                    ${isSelected ? 'bg-(--theme-500) text-white shadow-lg scale-105 border-(--theme-500) z-20' : ''}
                                                    ${isTodayDate && !isSelected ? 'bg-(--theme-50) border-2 border-(--theme-500) text-(--theme-700)' : ''}
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
                        <div className="flex-1 bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col overflow-hidden">
                            
                            {/* Tabs Headers */}
                            <div className="flex border-b border-gray-100 mb-4 shrink-0">
                                <button
                                    onClick={() => setActiveTab('agendar')}
                                    className={`flex-1 py-2 text-xs font-bold transition-all border-b-2 ${activeTab === 'agendar' ? 'border-(--theme-500) text-(--theme-600)' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                >
                                    Agendar Cita
                                </button>
                                {isVendedor && (
                                    <button
                                        onClick={() => setActiveTab('reuniones')}
                                        className={`flex-1 py-2 text-xs font-bold transition-all border-b-2 ${activeTab === 'reuniones' ? 'border-(--theme-500) text-(--theme-600)' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                    >
                                        Mis Reuniones
                                    </button>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                                {activeTab === 'agendar' ? (
                                    <div className="animate-in fade-in slide-in-from-right-2 duration-200">
                                        <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                                            <CalendarIcon className="w-5 h-5 text-[#689f38]" />
                                            Agendar Cita
                                        </h2>
                                        <p className="text-xs text-gray-500 mb-4">
                                            Para el <span className="font-bold text-gray-800">{selectedDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                                        </p>

                                        {selectedCloser && !closerLinkedToGoogle && (
                                            <div className="mb-4 flex flex-col p-3 bg-orange-50 border border-orange-200 rounded-lg space-y-1">
                                                <div className="flex items-center gap-2 text-orange-800">
                                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                                    <p className="font-bold text-xs">Calendario No Vinculado</p>
                                                </div>
                                                <p className="text-[11px] text-orange-700 leading-tight">Este closer no ha vinculado Google Calendar. No se verificará disponibilidad ni se creará Meet.</p>
                                            </div>
                                        )}

                                        <form onSubmit={handleSubmit} className="space-y-4">
                                            <div className="space-y-3">
                                                {/* Prospect Selection */}
                                                <div>
                                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                                        Seleccionar Prospecto
                                                    </label>
                                                    <select
                                                        value={selectedProspect}
                                                        onChange={(e) => setSelectedProspect(e.target.value)}
                                                        className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-(--theme-500) focus:border-transparent"
                                                        required
                                                    >
                                                        <option value="">Selecciona...</option>
                                                        {prospectos.map(p => (
                                                            <option key={p.id} value={p.id}>
                                                                {p.nombres} {p.apellidoPaterno}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Closer Selection */}
                                                <div>
                                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                                        {isVendedor ? 'Responsable' : 'Asignar Closer'}
                                                    </label>
                                                    <select
                                                        value={selectedCloser}
                                                        onChange={(e) => setSelectedCloser(e.target.value)}
                                                        className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-(--theme-500) focus:border-transparent"
                                                        required
                                                    >
                                                        <option value="">{isVendedor ? 'Selecciona...' : 'Selecciona closer...'}</option>
                                                        {closers.map(c => (
                                                            <option key={c.id || c._id} value={c.id || c._id}>{c.nombre}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Time Selection */}
                                                <div>
                                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                                                        Horarios Disponibles
                                                    </label>
                                                    <div className="grid grid-cols-2 gap-2 mt-1">
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
                                                                            className={`p-1.5 border rounded-lg text-xs text-center transition-colors 
                                                                                ${slot.isBusy
                                                                                    ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                                                                                    : isSelected
                                                                                        ? 'bg-(--theme-500) border-(--theme-500) text-white font-bold'
                                                                                        : 'bg-white border-gray-200 hover:bg-green-50 text-gray-600'
                                                                                }`}
                                                                        >
                                                                            {timeStr}
                                                                        </button>
                                                                    );
                                                                })
                                                            ) : (
                                                                <div className="col-span-2 text-[10px] text-gray-400 text-center py-2 bg-gray-50 rounded italic">Sin disponibilidad.</div>
                                                            )
                                                        ) : (
                                                            <div className="col-span-2 text-[10px] text-gray-400 text-center py-2 bg-gray-50 rounded italic">Cerrado.</div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Notes */}
                                                <div>
                                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                                        Notas
                                                    </label>
                                                    <textarea
                                                        value={formData.notas}
                                                        onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                                                        rows="2"
                                                        className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-(--theme-500)"
                                                        placeholder="Detalles..."
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={!selectedTimeSlot}
                                                className="w-full py-2.5 px-4 bg-(--theme-500) text-white rounded-xl font-bold hover:bg-[#7cb342] shadow-md shadow-(--theme-500)/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Agendar Cita
                                            </button>

                                            {createdEventLink && (
                                                <div className="mt-4 p-3 bg-(--theme-50) border border-(--theme-200) rounded-lg flex flex-col items-center animate-in zoom-in-95">
                                                    <div className="flex items-center gap-2 text-(--theme-800) mb-2">
                                                        <LinkIcon className="w-4 h-4" />
                                                        <p className="font-bold text-xs">Meet Creado</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(createdEventLink);
                                                            toast.success('Enlace copiado');
                                                        }}
                                                        className="w-full py-2 bg-(--theme-600) text-white rounded-lg hover:bg-(--theme-700) font-medium text-[10px] flex items-center justify-center gap-2 shadow-sm"
                                                    >
                                                        <Copy className="w-3.5 h-3.5" />
                                                        Copiar Enlace
                                                    </button>
                                                </div>
                                            )}
                                        </form>
                                    </div>
                                ) : (
                                    <div className="animate-in fade-in slide-in-from-left-2 duration-200">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-lg font-bold text-gray-900">Reuniones Hoy</h3>
                                            <button
                                                type="button"
                                                onClick={cargarMisReuniones}
                                                className="p-1.5 text-xs rounded-lg hover:bg-slate-100 transition-colors"
                                                title="Actualizar"
                                            >
                                                <LogIn className="w-4 h-4 text-slate-500" />
                                            </button>
                                        </div>

                                        {loadingMisReuniones ? (
                                            <div className="flex items-center justify-center p-8">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-(--theme-500)"></div>
                                            </div>
                                        ) : misReuniones.length === 0 ? (
                                            <p className="text-xs text-gray-400 text-center py-8 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">No hay reuniones hoy.</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {misReuniones.map((r) => (
                                                    <div key={r.id} className="border border-slate-100 rounded-xl p-3 bg-white hover:border-slate-200 transition-colors shadow-sm">
                                                        <div className="mb-2">
                                                            <p className="text-sm font-bold text-gray-900 line-clamp-1">
                                                                {r?.cliente?.nombres || 'Cliente'} {r?.cliente?.apellidoPaterno || ''}
                                                            </p>
                                                            <p className="text-[11px] font-semibold text-(--theme-600) flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                {new Date(r.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-1.5">
                                                            <button 
                                                                type="button" 
                                                                onClick={() => registrarResultado(r, 'venta')} 
                                                                disabled={guardandoResultadoId === r.id}
                                                                className="px-2 py-1.5 text-[10px] font-bold rounded-lg bg-green-50 text-green-700 border border-green-100 hover:bg-green-100 disabled:opacity-60 transition-colors"
                                                            >
                                                                Venta
                                                            </button>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => registrarResultado(r, 'cotizacion')} 
                                                                disabled={guardandoResultadoId === r.id}
                                                                className="px-2 py-1.5 text-[10px] font-bold rounded-lg bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100 disabled:opacity-60 transition-colors"
                                                            >
                                                                Propuesta
                                                            </button>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => registrarResultado(r, 'otra_reunion')} 
                                                                disabled={guardandoResultadoId === r.id}
                                                                className="px-2 py-1.5 text-[10px] font-bold rounded-lg bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 disabled:opacity-60 transition-colors"
                                                            >
                                                                Reagendar
                                                            </button>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => registrarResultado(r, 'no_asistio')} 
                                                                disabled={guardandoResultadoId === r.id}
                                                                className="px-2 py-1.5 text-[10px] font-bold rounded-lg bg-red-50 text-red-700 border border-red-100 hover:bg-red-100 disabled:opacity-60 transition-colors"
                                                            >
                                                                No asistió
                                                            </button>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => registrarResultado(r, 'no_venta')} 
                                                                disabled={guardandoResultadoId === r.id}
                                                                className="col-span-2 px-2 py-1.5 text-[10px] font-bold rounded-lg bg-slate-50 text-slate-700 border border-slate-100 hover:bg-slate-100 disabled:opacity-60 transition-colors"
                                                            >
                                                                No interesado / Otros
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ProspectorCalendario;
