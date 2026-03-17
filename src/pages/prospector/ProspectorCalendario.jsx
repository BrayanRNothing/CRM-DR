import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, User, Phone, CheckCircle2, ChevronLeft, ChevronRight, UserPlus, Briefcase, Mail, MapPin, LogIn } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { createMeeting } from '../../services/googleCalendar';
import toast from 'react-hot-toast';
import API_URL from '../../config/api';

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];



const ProspectorCalendario = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedCloser, setSelectedCloser] = useState('');
    const [closers, setClosers] = useState([]);
    const [accessToken, setAccessToken] = useState(null);
    const [formData, setFormData] = useState({
        nombre: '',
        empresa: '',
        telefono: '',
        correo: '',
        notas: ''
    });

    const login = useGoogleLogin({
        onSuccess: (tokenResponse) => {
            setAccessToken(tokenResponse.access_token);
            toast.success('Conectado con Google Calendar');
        },
        onError: () => toast.error('Error al conectar con Google'),
        scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
    });

    React.useEffect(() => {
        const fetchClosers = async () => {
            try {
                // TODO: Ensure backend allows this request for prospector role, otherwise might need adjustments in backend/routes/usuarios.js
                // For now assuming we can fetch or using a specific endpoint if needed.
                // To keep it simple as requested, currently relying on existing structure.
                // NOTE: If this fails with 403, we need to update backend permissions.
                const res = await fetch(`${API_URL}/api/usuarios`, {
                    headers: {
                        'x-auth-token': localStorage.getItem('token') // Assuming token is stored here
                    }
                });
                if (res.ok) {
                    const data = await res.json();
                    setClosers(data.filter(u => u.rol === 'closer'));
                } else {
                    console.error("Failed to fetch users");
                    // Fallback or error handling
                }
            } catch (error) {
                console.error("Error fetching closers:", error);
            }
        };
        fetchClosers();
    }, []);

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

        if (!accessToken) {
            toast.error('Por favor conecta con Google Calendar primero');
            return;
        }

        const closer = closers.find(c => c.id == selectedCloser);
        if (!closer) {
            toast.error('Selecciona un closer');
            return;
        }

        const loadingToast = toast.loading('Agendando cita...');

        try {
            const timeInput = e.target.querySelector('input[type="time"]').value;
            if (!timeInput) throw new Error("Selecciona una hora");

            const [hours, minutes] = timeInput.split(':');
            const startDateTime = new Date(selectedDate);
            startDateTime.setHours(parseInt(hours), parseInt(minutes), 0);

            const endDateTime = new Date(startDateTime);
            endDateTime.setMinutes(endDateTime.getMinutes() + 30); // 30 min duration default

            const eventDetails = {
                summary: `Cita de Cierre: ${formData.nombre}`,
                description: `Cliente: ${formData.telefono} - ${formData.empresa}\nNotas: ${formData.notas}\nAgendado por Prospecter.`,
                start: {
                    dateTime: startDateTime.toISOString(),
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                },
                end: {
                    dateTime: endDateTime.toISOString(),
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                },
                attendees: [
                    { email: closer.email }
                ],
                conferenceData: {
                    createRequest: { requestId: "meeting-" + Date.now() }
                }
            };

            await createMeeting(accessToken, eventDetails);
            toast.dismiss(loadingToast);
            toast.success(`Cita agendada con ${closer.nombre}`);

            setFormData({ nombre: '', empresa: '', telefono: '', correo: '', notas: '' });
            setSelectedCloser('');
        } catch (error) {
            console.error(error);
            toast.dismiss(loadingToast);
            toast.error('Error al agendar la cita');
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
                                <h2 className="text-2xl font-bold text-gray-900">
                                    {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                                </h2>
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
                                <CalendarIcon className="w-6 h-6 text-teal-600" />
                                Agendar Cita
                            </h2>
                            <p className="text-sm text-gray-500 mb-6">
                                Programando para el <span className="font-bold text-gray-800">{selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                            </p>

                            {!accessToken && (
                                <button
                                    onClick={() => login()}
                                    className="w-full mb-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                                >
                                    <LogIn className="w-4 h-4" />
                                    Conectar Google Calendar
                                </button>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Closer Selector */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Asignar a Closer *</label>
                                    <select
                                        value={selectedCloser}
                                        onChange={(e) => setSelectedCloser(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                        required
                                    >
                                        <option value="">Seleccionar Closer...</option>
                                        {closers.map(closer => (
                                            <option key={closer.id} value={closer.id}>{closer.nombre} - {closer.email}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Time Selector (Simple for now) */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Hora *</label>
                                    <input
                                        type="time"
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                        required
                                    />
                                </div>

                                <div className="border-t border-gray-200 my-4 pt-4">
                                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                        <User className="w-4 h-4" /> Datos del Cliente
                                    </h3>

                                    <div className="space-y-3">
                                        <div>
                                            <input
                                                type="text"
                                                name="nombre"
                                                placeholder="Nombre Completo"
                                                value={formData.nombre}
                                                onChange={handleInputChange}
                                                className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                                                <div className="px-3 bg-gray-50 border-r border-gray-300">
                                                    <Briefcase className="w-4 h-4 text-gray-500" />
                                                </div>
                                                <input
                                                    type="text"
                                                    name="empresa"
                                                    placeholder="Empresa"
                                                    value={formData.empresa}
                                                    onChange={handleInputChange}
                                                    className="w-full p-2 text-sm focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                                                <div className="px-2 bg-gray-50 border-r border-gray-300">
                                                    <Phone className="w-3 h-3 text-gray-500" />
                                                </div>
                                                <input
                                                    type="tel"
                                                    name="telefono"
                                                    placeholder="Teléfono"
                                                    value={formData.telefono}
                                                    onChange={handleInputChange}
                                                    className="w-full p-2 text-sm focus:outline-none"
                                                    required
                                                />
                                            </div>
                                            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                                                <div className="px-2 bg-gray-50 border-r border-gray-300">
                                                    <Mail className="w-3 h-3 text-gray-500" />
                                                </div>
                                                <input
                                                    type="email"
                                                    name="correo"
                                                    placeholder="Correo"
                                                    value={formData.correo}
                                                    onChange={handleInputChange}
                                                    className="w-full p-2 text-sm focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Notas / Contexto</label>
                                    <textarea
                                        name="notas"
                                        rows="3"
                                        value={formData.notas}
                                        onChange={handleInputChange}
                                        className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                        placeholder="Detalles importantes para el closer..."
                                    ></textarea>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-bold shadow-md flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 className="w-5 h-5" />
                                    Confirmar Cita
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProspectorCalendario;
