import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, User, Phone, CheckCircle2, XCircle, MapPin, ChevronLeft, ChevronRight, LogIn } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { listEvents } from '../../services/googleCalendar';
import toast from 'react-hot-toast';

const MOCK_REUNIONES = [
    {
        id: 1,
        fecha: '2026-02-16T14:00:00',
        cliente: {
            nombres: 'María',
            apellidoPaterno: 'Hernández',
            empresa: 'Innovación Digital',
            telefono: '555-0104',
            correo: 'maria@innovacion.com'
        },
        prospector: 'Alex Mendoza',
        notas: 'Cliente interesado en solución empresarial',
        estado: 'pendiente'
    },
    {
        id: 2,
        fecha: '2026-02-16T16:30:00',
        cliente: {
            nombres: 'Pedro',
            apellidoPaterno: 'Sánchez',
            empresa: 'Desarrollo Web',
            telefono: '555-0105',
            correo: 'pedro@desarrolloweb.com'
        },
        prospector: 'Angel Torres',
        notas: 'Seguimiento de propuesta enviada',
        estado: 'pendiente'
    },
    {
        id: 3,
        fecha: '2026-02-17T10:00:00',
        cliente: {
            nombres: 'Laura',
            apellidoPaterno: 'Martínez',
            empresa: 'Consultoría Estratégica',
            telefono: '555-0106',
            correo: 'laura@consultoria.com'
        },
        prospector: 'Alex Mendoza',
        notas: 'Primera reunión - presentación de servicios',
        estado: 'pendiente'
    },
    {
        id: 4,
        fecha: '2026-02-15T15:00:00',
        cliente: {
            nombres: 'Jorge',
            apellidoPaterno: 'Ramírez',
            empresa: 'Tech Innovations',
            telefono: '555-0107',
            correo: 'jorge@techinnovations.com'
        },
        prospector: 'Angel Torres',
        notas: 'Reunión completada - cliente interesado',
        estado: 'realizada'
    },
    {
        id: 5,
        fecha: '2026-02-18T11:00:00',
        cliente: {
            nombres: 'Ana',
            apellidoPaterno: 'González',
            empresa: 'Marketing Pro',
            telefono: '555-0108',
            correo: 'ana@marketingpro.com'
        },
        prospector: 'Alex Mendoza',
        notas: 'Seguimiento de cotización',
        estado: 'pendiente'
    }
];

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const CloserCalendario = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [reuniones, setReuniones] = useState([]);
    const [modalRegistrar, setModalRegistrar] = useState(null);
    const [accessToken, setAccessToken] = useState(null);

    const login = useGoogleLogin({
        onSuccess: (tokenResponse) => {
            setAccessToken(tokenResponse.access_token);
            toast.success('Conectado con Google Calendar');
        },
        onError: () => toast.error('Error al conectar con Google'),
        scope: 'https://www.googleapis.com/auth/calendar.readonly',
    });

    React.useEffect(() => {
        if (!accessToken) return;

        const fetchEvents = async () => {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const timeMin = new Date(year, month, 1).toISOString();
            const timeMax = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

            try {
                const googleEvents = await listEvents(accessToken, timeMin, timeMax);
                const mappedEvents = googleEvents.map(event => ({
                    id: event.id,
                    fecha: event.start.dateTime || event.start.date,
                    cliente: {
                        nombres: event.summary || 'Sin Título',
                        apellidoPaterno: '',
                        empresa: '',
                        telefono: '',
                        correo: ''
                    },
                    prospector: 'Google Calendar',
                    notas: event.description || '',
                    estado: 'pendiente'
                }));
                setReuniones(mappedEvents);
            } catch (error) {
                console.error("Error fetching events:", error);
                toast.error("Error al cargar eventos");
            }
        };

        fetchEvents();
    }, [accessToken, currentDate]);

    // Get dates that have appointments
    const datesWithAppointments = useMemo(() => {
        const dates = {};
        reuniones.forEach(reunion => {
            const date = new Date(reunion.fecha);
            const dateKey = date.toDateString();
            if (!dates[dateKey]) {
                dates[dateKey] = [];
            }
            dates[dateKey].push(reunion);
        });
        return dates;
    }, [reuniones]);

    // Get appointments for selected date
    const selectedDateAppointments = useMemo(() => {
        const dateKey = selectedDate.toDateString();
        return datesWithAppointments[dateKey] || [];
    }, [selectedDate, datesWithAppointments]);

    // Generate calendar days
    const calendarDays = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];

        // Add empty cells for days before month starts
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(new Date(year, month, day));
        }

        return days;
    }, [currentDate]);

    const formatearHora = (fecha) => {
        const date = new Date(fecha);
        return date.toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleRegistrarReunion = (asistio) => {
        alert(`Reunión marcada como: ${asistio ? 'Realizada' : 'No asistió'}`);
        setModalRegistrar(null);
    };

    const isSameDay = (date1, date2) => {
        if (!date1 || !date2) return false;
        return date1.toDateString() === date2.toDateString();
    };

    const isToday = (date) => {
        if (!date) return false;
        return isSameDay(date, new Date());
    };

    const previousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    };

    return (
        <div className="h-full flex flex-col p-5 overflow-hidden">
            <div className="flex-1 flex flex-col space-y-4 overflow-hidden min-h-0">
                {/* Main Layout: Calendar + Details Panel */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
                    {/* Calendar - Left Side (2/3) */}
                    <div className="lg:col-span-2 flex flex-col min-h-0">
                        <div className="flex-1 p-8 flex flex-col min-h-0">
                            {/* Calendar Header */}
                            <div className="flex items-center justify-between mb-6">
                                <button
                                    onClick={previousMonth}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <ChevronLeft className="w-6 h-6 text-gray-600" />
                                </button>
                                <h2 className="text-2xl font-bold text-gray-900">
                                    {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                                </h2>
                                <button
                                    onClick={nextMonth}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <ChevronRight className="w-6 h-6 text-gray-600" />
                                </button>
                            </div>

                            {!accessToken && (
                                <div className="mb-4 flex justify-center">
                                    <button
                                        onClick={() => login()}
                                        className="py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                                    >
                                        <LogIn className="w-4 h-4" />
                                        Conectar Google Calendar
                                    </button>
                                </div>
                            )}

                            {/* Calendar Grid */}
                            <div className="flex-1 flex flex-col min-h-0">
                                {/* Day Headers */}
                                <div className="grid grid-cols-7 gap-2 mb-2 shrink-0">
                                    {DAYS.map(day => (
                                        <div key={day} className="text-center font-semibold text-gray-600 text-sm py-2">
                                            {day}
                                        </div>
                                    ))}
                                </div>

                                {/* Calendar Days */}
                                <div className="flex-1 grid grid-cols-7 gap-2 min-h-0" style={{ gridAutoRows: '1fr' }}>
                                    {calendarDays.map((date, index) => {
                                        const hasAppointments = date && datesWithAppointments[date.toDateString()];
                                        const isSelected = date && isSameDay(date, selectedDate);
                                        const isTodayDate = date && isToday(date);

                                        return (
                                            <button
                                                key={index}
                                                onClick={() => date && setSelectedDate(date)}
                                                disabled={!date}
                                                className={`
                                                    relative rounded-lg transition-all font-medium text-lg
                                                    ${!date ? 'invisible' : ''}
                                                    ${isSelected ? 'bg-teal-500 text-white shadow-lg scale-105' : 'hover:bg-gray-100'}
                                                    ${isTodayDate && !isSelected ? 'bg-teal-50 border-2 border-teal-500 text-teal-700' : ''}
                                                    ${!isSelected && !isTodayDate ? 'text-gray-700' : ''}
                                                `}
                                            >
                                                {date && date.getDate()}
                                                {hasAppointments && (
                                                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-teal-500'}`}></div>
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Appointments Panel - Right Side (1/3) */}
                    <div className="lg:col-span-1 flex flex-col min-h-0">
                        <div className="flex-1 bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col min-h-0">
                            <div className="mb-4 shrink-0">
                                <h2 className="text-lg font-bold text-gray-900">
                                    {selectedDate.toLocaleDateString('es-ES', {
                                        weekday: 'long',
                                        day: 'numeric',
                                        month: 'long'
                                    })}
                                </h2>
                                <p className="text-sm text-gray-600 mt-1">
                                    {selectedDateAppointments.length} {selectedDateAppointments.length === 1 ? 'reunión' : 'reuniones'}
                                </p>
                            </div>

                            {/* Appointments List */}
                            <div className="flex-1 space-y-3 overflow-y-auto min-h-0 pr-2"
                                style={{ scrollbarWidth: 'thin', scrollbarColor: '#14b8a6 #f3f4f6' }}>
                                {selectedDateAppointments.length === 0 ? (
                                    <div className="text-center py-12">
                                        <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500 text-sm">No hay reuniones programadas</p>
                                    </div>
                                ) : (
                                    selectedDateAppointments
                                        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
                                        .map((reunion) => (
                                            <div
                                                key={reunion.id}
                                                className={`border rounded-lg p-4 transition-all hover:shadow-md ${reunion.estado === 'pendiente'
                                                    ? 'border-blue-200 bg-blue-50/50'
                                                    : 'border-green-200 bg-green-50/50'
                                                    }`}
                                            >
                                                {/* Time and Status */}
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-4 h-4 text-gray-600" />
                                                        <span className="font-semibold text-gray-900">
                                                            {formatearHora(reunion.fecha)}
                                                        </span>
                                                    </div>
                                                    <span
                                                        className={`px-2 py-1 rounded-full text-xs font-semibold ${reunion.estado === 'pendiente'
                                                            ? 'bg-blue-500 text-white'
                                                            : 'bg-green-500 text-white'
                                                            }`}
                                                    >
                                                        {reunion.estado === 'pendiente' ? 'Pendiente' : 'Completada'}
                                                    </span>
                                                </div>

                                                {/* Client Info */}
                                                <div className="mb-3">
                                                    <h3 className="font-bold text-gray-900 mb-1">
                                                        {reunion.cliente.nombres} {reunion.cliente.apellidoPaterno}
                                                    </h3>
                                                    <p className="text-sm text-gray-600 flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {reunion.cliente.empresa}
                                                    </p>
                                                </div>

                                                {/* Contact */}
                                                <div className="mb-3 space-y-1">
                                                    <p className="text-xs text-gray-600 flex items-center gap-1">
                                                        <Phone className="w-3 h-3" />
                                                        {reunion.cliente.telefono}
                                                    </p>
                                                    <p className="text-xs text-gray-600 flex items-center gap-1">
                                                        <User className="w-3 h-3" />
                                                        Agendada por: {reunion.prospector}
                                                    </p>
                                                </div>

                                                {/* Notes */}
                                                {reunion.notas && (
                                                    <div className="mb-3 p-2 bg-white/80 rounded border border-gray-200">
                                                        <p className="text-xs text-gray-700">{reunion.notas}</p>
                                                    </div>
                                                )}

                                                {/* Actions */}
                                                {reunion.estado === 'pendiente' && (
                                                    <div className="flex gap-2 mt-3">
                                                        <button
                                                            onClick={() => setModalRegistrar(reunion)}
                                                            className="flex-1 px-3 py-2 bg-teal-500 text-white text-xs rounded-lg hover:bg-teal-600 transition-colors flex items-center justify-center gap-1"
                                                        >
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            Registrar
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modal Registrar Reunión */}
                {modalRegistrar && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Registrar Reunión</h2>
                            <p className="text-gray-600 mb-6">
                                Cliente: <span className="text-gray-900 font-semibold">
                                    {modalRegistrar.cliente.nombres} {modalRegistrar.cliente.apellidoPaterno}
                                </span>
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={() => handleRegistrarReunion(true)}
                                    className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2 font-medium"
                                >
                                    <CheckCircle2 className="w-5 h-5" />
                                    Cliente Asistió - Marcar como Realizada
                                </button>

                                <button
                                    onClick={() => handleRegistrarReunion(false)}
                                    className="w-full px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2 font-medium"
                                >
                                    <XCircle className="w-5 h-5" />
                                    Cliente NO Asistió
                                </button>

                                <button
                                    onClick={() => setModalRegistrar(null)}
                                    className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CloserCalendario;
