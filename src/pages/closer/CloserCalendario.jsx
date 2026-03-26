import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Calendar as CalendarIcon, Clock, User, Phone, CheckCircle2, XCircle, MapPin, ChevronLeft, ChevronRight, LogIn, Video, Briefcase, Mail, AlertCircle, UserPlus, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import API_URL from '../../config/api';
import { getToken } from '../../utils/authUtils';



const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const CloserCalendario = () => {
    const location = useLocation();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [reuniones, setReuniones] = useState([]);
    const [modalRegistrar, setModalRegistrar] = useState(null);
    const [pasoModal, setPasoModal] = useState('asistencia');
    const [notasModal, setNotasModal] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [nuevaReunionForm, setNuevaReunionForm] = useState({ fecha: '', hora: '10:00', duracion: '60', notas: '' });
    // Modal de agendado directo (desde Seguimiento)
    const [modalAgendarDirecto, setModalAgendarDirecto] = useState(null); // { prospecto: {...} }
    const [agendarDirectoForm, setAgendarDirectoForm] = useState({ fecha: '', hora: '10:00', duracion: '60', notas: '' });
    const [guardandoDirecto, setGuardandoDirecto] = useState(false);
    // null = verificando, true = vinculado, false = no vinculado
    const [googleLinked, setGoogleLinked] = useState(null);
    const [userInfo, setUserInfo] = useState(null);

    const abrirModalRegistrar = async (reunion) => {
        let reunionFinal = { ...reunion };
        setPasoModal('asistencia');
        setNotasModal('');

        // Si no tiene clienteId (viene de Google Calendar), intentar obtenerlo
        if (!reunion.clienteId && reunion.cliente && reunion.cliente.nombres) {
            try {
                const token = getToken();
                const nombreCliente = `${reunion.cliente.nombres || ''} ${reunion.cliente.apellidoPaterno || ''}`.toLowerCase().trim();
                const telefonoCliente = (reunion.cliente.telefono || '').replace(/\D/g, '');

                // Buscar cliente por nombre o teléfono en prospectos del closer
                const res = await fetch(`${API_URL}/api/closer/prospectos`, {
                    headers: { 'x-auth-token': token }
                });

                if (res.ok) {
                    const clientes = await res.json();
                    let clientesEncontrados = [];

                    // Buscar por teléfono primero (más único)
                    if (telefonoCliente) {
                        clientesEncontrados = clientes.filter(c => {
                            const cTelefono = (c.telefono || '').replace(/\D/g, '');
                            return cTelefono === telefonoCliente;
                        });
                    }

                    // Si no encuentra por teléfono, buscar por nombre exacto
                    if (clientesEncontrados.length === 0) {
                        clientesEncontrados = clientes.filter(c => {
                            const cNombre = `${c.nombres || ''} ${c.apellidoPaterno || ''}`.toLowerCase().trim();
                            return cNombre === nombreCliente;
                        });
                    }

                    // Si no encuentra por nombre exacto, buscar similar
                    if (clientesEncontrados.length === 0) {
                        clientesEncontrados = clientes.filter(c => {
                            const cNombre = `${c.nombres || ''} ${c.apellidoPaterno || ''}`.toLowerCase();
                            return cNombre.includes(nombreCliente) || nombreCliente.includes(cNombre);
                        });
                    }

                    if (clientesEncontrados.length > 0) {
                        // Si hay múltiples, tomar el más reciente por ultimaInteraccion
                        const clienteEncontrado = clientesEncontrados.sort((a, b) => {
                            const dateA = new Date(a.ultimaInteraccion || a.fechaCreacion || 0);
                            const dateB = new Date(b.ultimaInteraccion || b.fechaCreacion || 0);
                            return dateB - dateA; // Más reciente primero
                        })[0];

                        reunionFinal.clienteId = clienteEncontrado.id || clienteEncontrado._id;
                        console.log(`✅ Cliente encontrado y vinculado:`, clienteEncontrado.nombres, `(${clientesEncontrados.length} coincidencias)`, `ID:`, reunionFinal.clienteId);
                    } else {
                        console.warn(`⚠️ No se encontró cliente en base de datos para: "${nombreCliente}" | Teléfono: ${telefonoCliente}`);
                    }
                }
            } catch (err) {
                console.error('❌ Error al buscar cliente:', err);
                // Continuar aunque falle la búsqueda
            }
        }

        setModalRegistrar(reunionFinal);

        // Pre-llenar fecha de mañana por defecto
        const manana = new Date();
        manana.setDate(manana.getDate() + 7);
        setNuevaReunionForm({ fecha: manana.toISOString().split('T')[0], hora: '10:00', duracion: '60', notas: '' });
    };

    const cerrarModal = () => {
        setModalRegistrar(null);
        setPasoModal('asistencia');
        setNotasModal('');
    };

    // Detectar si llegamos desde Seguimiento con un prospecto pre-seleccionado
    useEffect(() => {
        const prospecto = location.state?.prospecto;
        if (prospecto) {
            const enSemana = new Date();
            enSemana.setDate(enSemana.getDate() + 7);
            setAgendarDirectoForm({ fecha: enSemana.toISOString().split('T')[0], hora: '10:00', duracion: '60', notas: '' });
            setModalAgendarDirecto({ prospecto });
            // Limpiar el state para no reabrir si se recarga
            window.history.replaceState({}, document.title);
        }
    }, []);

    const handleAgendarDirecto = async () => {
        if (!agendarDirectoForm.fecha || !agendarDirectoForm.hora) {
            toast.error('Selecciona fecha y hora');
            return;
        }
        setGuardandoDirecto(true);
        try {
            const token = getToken();
            const prospecto = modalAgendarDirecto.prospecto;
            const clienteId = prospecto.id || prospecto._id;
            const startDT = new Date(`${agendarDirectoForm.fecha}T${agendarDirectoForm.hora}:00`);
            const endDT = new Date(startDT.getTime() + parseInt(agendarDirectoForm.duracion) * 60000);
            const nombre = `${prospecto.nombres || ''} ${prospecto.apellidoPaterno || ''}`.trim();

            const res = await fetch(`${API_URL}/api/google/create-event`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify({
                    title: `Reunión con ${nombre}`,
                    startDateTime: startDT.toISOString(),
                    endDateTime: endDT.toISOString(),
                    description: agendarDirectoForm.notas || `Reunión agendada${prospecto.empresa ? ` — ${prospecto.empresa}` : ''}`,
                    clienteId
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.msg || 'Error al crear evento');
            }
            const data = await res.json();
            toast.success(`📅 ¡Reunión con ${nombre} agendada!`);
            if (data.meetLink) toast.success(`Google Meet listo`, { duration: 4000 });
            setModalAgendarDirecto(null);
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Error al agendar');
        } finally {
            setGuardandoDirecto(false);
        }
    };

    const handleRegistrarReunion = async (resultado) => {
        // Si el resultado es 'otra_reunion', en vez de guardar directo, mostrar el paso 3
        if (resultado === 'otra_reunion') {
            // Primero registramos el resultado de la reunión actual
            setGuardando(true);
            try {
                const token = getToken();
                const clienteId = modalRegistrar.clienteId;
                if (clienteId) {
                    const res = await fetch(`${API_URL}/api/closer/registrar-reunion`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                        body: JSON.stringify({ clienteId, resultado, notas: notasModal, fechaReunion: modalRegistrar.fecha })
                    });
                    if (!res.ok) { const d = await res.json(); throw new Error(d.msg); }
                }

                // Guardar en BD que fue completado
                try {
                    await fetch(`${API_URL}/api/closer/marcar-evento-completado`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                        body: JSON.stringify({
                            googleEventId: modalRegistrar.id,
                            clienteId: clienteId,
                            resultado,
                            notas: notasModal
                        })
                    });
                    console.log('✅ Evento guardado como completado en BD');
                } catch (bdErr) {
                    console.warn('⚠️ No se guardó en BD:', bdErr);
                }

                // Sincronizar con Google Calendar
                try {
                    await fetch(`${API_URL}/api/google/mark-completed/${modalRegistrar.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                        body: JSON.stringify({
                            resultado,
                            notas: notasModal,
                            clienteNombre: `${modalRegistrar.cliente.nombres} ${modalRegistrar.cliente.apellidoPaterno}`
                        })
                    });
                    console.log('✅ Evento marcado como completado en Google Calendar');
                } catch (gErr) {
                    console.warn('⚠️ No se sincronizó con Google Calendar:', gErr);
                }

                setReuniones(prev => prev.map(r => r.id === modalRegistrar.id ? { ...r, estado: 'realizada', resultadoExacto: resultado } : r));
                // Pasar al paso de agendar nueva reunión
                setPasoModal('agendar');
                setNotasModal('');
            } catch (err) {
                toast.error(err.message || 'Error al registrar');
            } finally {
                setGuardando(false);
            }
            return;
        }

        setGuardando(true);
        try {
            const token = getToken();
            const clienteId = modalRegistrar.clienteId;
            if (clienteId) {
                const res = await fetch(`${API_URL}/api/closer/registrar-reunion`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                    body: JSON.stringify({ clienteId, resultado, notas: notasModal, fechaReunion: modalRegistrar.fecha })
                });
                if (!res.ok) { const data = await res.json(); throw new Error(data.msg || 'Error al registrar'); }
            } else {
                await fetch(`${API_URL}/api/closer/registrar-actividad`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                    body: JSON.stringify({
                        tipo: 'cita',
                        resultado: resultado === 'venta' ? 'convertido' : resultado === 'no_asistio' || resultado === 'no_venta' ? 'fallido' : 'exitoso',
                        descripcion: {
                            no_asistio: 'Reunión — Cliente no asistió',
                            no_venta: 'Reunión realizada — No le interesó',
                            otra_reunion: 'Reunión realizada — Quiere otra reunión',
                            cotizacion: 'Reunión realizada — Quiere cotización',
                            venta: 'Reunión realizada — ¡Venta cerrada!'
                        }[resultado],
                        notas: notasModal
                    })
                });
            }

            // Guardar en BD que fue completado
            try {
                await fetch(`${API_URL}/api/closer/marcar-evento-completado`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                    body: JSON.stringify({
                        googleEventId: modalRegistrar.id,
                        clienteId: clienteId,
                        resultado,
                        notas: notasModal
                    })
                });
                console.log('✅ Evento guardado como completado en BD');
            } catch (bdErr) {
                console.warn('⚠️ No se guardó en BD:', bdErr);
            }

            // Sincronizar con Google Calendar
            try {
                await fetch(`${API_URL}/api/google/mark-completed/${modalRegistrar.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                    body: JSON.stringify({
                        resultado,
                        notas: notasModal,
                        clienteNombre: `${modalRegistrar.cliente.nombres} ${modalRegistrar.cliente.apellidoPaterno}`
                    })
                });
                console.log('✅ Evento marcado como completado en Google Calendar');
            } catch (gErr) {
                console.warn('⚠️ No se sincronizó con Google Calendar:', gErr);
            }

            setReuniones(prev => prev.map(r => r.id === modalRegistrar.id ? { ...r, estado: 'realizada', resultadoExacto: resultado } : r));
            const mensajes = {
                no_asistio: '❌ Registrado: Cliente no asistió',
                no_venta: '😐 Registrado: No le interesó',
                cotizacion: '💰 Registrado: Quiere cotización',
                venta: '🎉 ¡Venta cerrada! Registrado'
            };
            toast.success(mensajes[resultado] || 'Reunión registrada');
            cerrarModal();
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Error al registrar la reunión');
        } finally {
            setGuardando(false);
        }
    };

    const handleAgendarNuevaReunion = async () => {
        if (!nuevaReunionForm.fecha || !nuevaReunionForm.hora) {
            toast.error('Selecciona la fecha y hora de la próxima reunión');
            return;
        }
        setGuardando(true);
        try {
            const token = getToken();
            const startDT = new Date(`${nuevaReunionForm.fecha}T${nuevaReunionForm.hora}:00`);
            const endDT = new Date(startDT.getTime() + parseInt(nuevaReunionForm.duracion) * 60000);
            const clienteNombre = `${modalRegistrar.cliente.nombres} ${modalRegistrar.cliente.apellidoPaterno}`.trim();

            const res = await fetch(`${API_URL}/api/google/create-event`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify({
                    title: `Reunión con ${clienteNombre}`,
                    startDateTime: startDT.toISOString(),
                    endDateTime: endDT.toISOString(),
                    description: nuevaReunionForm.notas || `Seguimiento — ${modalRegistrar.cliente.empresa || ''}`,
                    clienteId: modalRegistrar.clienteId
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.msg || 'Error al crear evento');
            }
            const data = await res.json();

            // Registrar actividad de cita en el CRM para actualizar etapa a reunion_agendada
            if (modalRegistrar.clienteId) {
                try {
                    await fetch(`${API_URL}/api/closer/registrar-actividad`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                        body: JSON.stringify({
                            clienteId: modalRegistrar.clienteId,
                            tipo: 'cita',
                            resultado: 'exitoso',
                            descripcion: `Nueva reunión agendada — ${clienteNombre}`,
                            notas: nuevaReunionForm.notas || '',
                            fechaCita: startDT.toISOString()
                        })
                    });
                } catch (crmErr) {
                    console.warn('⚠️ No se actualizó etapa en CRM:', crmErr);
                }
            }

            toast.success('📅 ¡Reunión agendada en Google Calendar!');
            if (data.meetLink) toast.success(`Meet: ${data.meetLink}`, { duration: 5000 });
            cerrarModal();
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Error al agendar reunión');
        } finally {
            setGuardando(false);
        }
    };

    useEffect(() => {
        const fetchEvents = async () => {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const timeMin = new Date(year, month, 1).toISOString();
            const timeMax = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

            try {
                const token = getToken();
                const res = await fetch(`${API_URL}/api/google/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`, {
                    headers: { 'x-auth-token': token }
                });

                if (res.status === 400 || res.status === 404) {
                    // El backend confirma que no hay tokens guardados para este usuario
                    setGoogleLinked(false);
                    localStorage.removeItem('google_linked');
                    return;
                }

                if (!res.ok) throw new Error('Error fetching events');

                // El backend confirmó tokens válidos — marcar como vinculado
                setGoogleLinked(true);
                localStorage.setItem('google_linked', 'true');
                const googleEvents = await res.json();

                // Traer lista de eventos completados
                let eventosCompletados = [];
                try {
                    const completadosRes = await fetch(`${API_URL}/api/closer/google-events-completados`, {
                        headers: { 'x-auth-token': token }
                    });
                    if (completadosRes.ok) {
                        eventosCompletados = await completadosRes.json();
                        console.log(`📋 Eventos completados cargados: ${eventosCompletados.length}`);
                    }
                } catch (err) {
                    console.warn('⚠️ No se pudieron cargar eventos completados:', err);
                }

                const mappedEvents = googleEvents.map(event => {
                    // Parse description for details
                    const desc = event.description || '';
                    const agendadoPorMatch = desc.match(/Agendado por:? (.*?)(\n|$)/i);
                    const agendadoPor = agendadoPorMatch ? agendadoPorMatch[1].trim() : 'Google Calendar';
                    const notasMatch = desc.match(/Notas: (.*?)(\n|$)/s);
                    const notas = notasMatch ? notasMatch[1].trim() : desc;

                    const telefonoMatch = desc.match(/Cliente: (.*?) -/);
                    const telefono = telefonoMatch ? telefonoMatch[1].trim() : '';

                    // Verificar si fue completado
                    const completadoGuardado = eventosCompletados.find(e => e.googleEventId === event.id || e === event.id);
                    const estadoEvento = completadoGuardado ? 'realizada' : 'pendiente';
                    const resultadoExacto = typeof completadoGuardado === 'object' ? completadoGuardado.resultado : null;

                    return {
                        id: event.id,
                        fecha: event.start.dateTime || event.start.date,
                        cliente: {
                            nombres: event.summary || 'Sin Título',
                            apellidoPaterno: '',
                            empresa: '',
                            telefono: telefono,
                            correo: event.attendees?.find(a => !a.self)?.email || ''
                        },
                        prospector: agendadoPor,
                        notas: notas,
                        meetLink: event.hangoutLink,
                        estado: estadoEvento,
                        resultadoExacto
                    };
                });
                setReuniones(mappedEvents);
            } catch (error) {
                console.error("Error fetching events:", error);
                // En caso de error de red, no cambiar el estado de vinculación
                if (googleLinked === null) setGoogleLinked(false);
            }
        };

        // Siempre intentar verificar con el backend al montar o cambiar mes
        // No depender de localStorage — el backend es la fuente de verdad
        fetchEvents();
    }, [currentDate]);

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
                                <div className="text-center">
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                                    </h2>
                                    {googleLinked === false && (
                                        <p className="text-xs font-semibold text-orange-500 mt-1 uppercase tracking-wider">
                                            Calendario no vinculado
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={nextMonth}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <ChevronRight className="w-6 h-6 text-gray-600" />
                                </button>
                            </div>

                            {googleLinked === null ? (
                                <div className="mb-4 flex justify-center items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl animate-pulse">
                                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                    <p className="text-gray-500 text-sm">Verificando conexión con Google...</p>
                                </div>
                            ) : !googleLinked ? (
                                <div className="mb-4 flex flex-col justify-center items-center text-center p-4 bg-orange-50 border border-orange-200 rounded-xl space-y-3 animate-in fade-in">
                                    <div className="flex items-center gap-2 text-orange-800 justify-center">
                                        <AlertCircle className="w-5 h-5 shrink-0" />
                                        <h3 className="font-bold">Calendario no vinculado</h3>
                                    </div>
                                    <p className="text-orange-700 text-sm">Debes vincular tu cuenta de Google en "Ajustes &gt; Google" para ver tus reuniones agendadas.</p>
                                </div>
                            ) : null}

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
                                        const appointmentCount = hasAppointments ? hasAppointments.length : 0;
                                        const isSelected = date && isSameDay(date, selectedDate);
                                        const isTodayDate = date && isToday(date);

                                        return (
                                            <button
                                                key={index}
                                                onClick={() => date && setSelectedDate(date)}
                                                disabled={!date}
                                                className={`
                                                    relative rounded-lg transition-all font-medium border flex items-center justify-center p-2 min-h-[72px]
                                                    ${!date ? 'bg-gray-50/50 border-gray-100 cursor-default select-none' : ''}
                                                    ${date && !isSelected ? 'bg-white border-gray-200 hover:border-(--theme-500)/50 text-gray-700' : ''}
                                                    ${isSelected ? 'bg-(--theme-500) text-white shadow-lg scale-105 border-(--theme-500) z-20' : ''}
                                                    ${isTodayDate && !isSelected ? 'bg-(--theme-50) border-2 border-(--theme-500) text-(--theme-700)' : ''}
                                                `}
                                            >
                                                <span className={`text-2xl font-bold leading-none select-none ${isSelected ? 'text-white' : ''}`}>
                                                    {date ? date.getDate() : ''}
                                                </span>
                                                {date && appointmentCount > 0 && (
                                                    <div className="absolute bottom-2 w-full flex flex-col items-center pointer-events-none">
                                                        <span className={`text-[10px] leading-tight font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${isSelected ? 'bg-white text-(--theme-500)' : 'bg-orange-50 text-orange-600 border border-orange-100'}`}>
                                                            {appointmentCount} {appointmentCount === 1 ? 'reunión' : 'reuniones'}
                                                        </span>
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
                        <div className="flex-1 bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col min-h-0 overflow-hidden">
                            <div className="mb-4 shrink-0">
                                <div className="flex items-center gap-2 mb-2">
                                    <CalendarIcon className="w-5 h-5 text-(--theme-500)" />
                                    <h2 className="text-lg font-bold text-gray-900">Reuniones Agendadas</h2>
                                </div>
                                <p className="text-sm text-gray-600">
                                    {selectedDate.toLocaleDateString('es-ES', {
                                        weekday: 'long',
                                        day: 'numeric',
                                        month: 'long'
                                    })}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {selectedDateAppointments.length} {selectedDateAppointments.length === 1 ? 'reunión' : 'reuniones'}
                                </p>
                            </div>

                            {/* Appointments List */}
                            <div className="flex-1 space-y-3 overflow-y-auto min-h-0 pr-2"
                                style={{ scrollbarWidth: 'thin', scrollbarColor: '#14b8a6 #f3f4f6' }}>
                                {selectedDateAppointments.length === 0 ? (
                                    <div className="text-center py-12 flex flex-col items-center justify-center h-full">
                                        <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500 text-sm font-medium">No hay reuniones</p>
                                        <p className="text-gray-400 text-xs mt-1">Selecciona otro día para ver reuniones</p>
                                    </div>
                                ) : (
                                    selectedDateAppointments
                                        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
                                        .map((reunion) => (
                                            <div
                                                key={reunion.id}
                                                className={`border rounded-lg p-4 transition-all hover:shadow-md animate-in fade-in relative mt-2 ${reunion.estado === 'pendiente'
                                                    ? 'border-(--theme-200) bg-(--theme-50)/50 hover:border-(--theme-300)'
                                                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                                                    }`}
                                            >
                                                {/* Etiqueta de Resultado para Completadas */}
                                                {reunion.estado === 'realizada' && reunion.resultadoExacto && (
                                                    <div className={`absolute -top-3 right-4 px-3 py-1 rounded-full text-xs font-bold shadow-sm border ${reunion.resultadoExacto === 'venta' ? 'bg-(--theme-500) text-white border-(--theme-600)' :
                                                            reunion.resultadoExacto === 'cotizacion' ? 'bg-(--theme-500) text-white border-(--theme-600)' :
                                                                reunion.resultadoExacto === 'otra_reunion' ? 'bg-yellow-500 text-white border-yellow-600' :
                                                                    reunion.resultadoExacto === 'no_asistio' ? 'bg-red-500 text-white border-red-600' :
                                                                        'bg-gray-500 text-white border-gray-600'
                                                        }`}>
                                                        {reunion.resultadoExacto === 'venta' ? '🎉 Venta Cerrada' :
                                                            reunion.resultadoExacto === 'cotizacion' ? '💰 Quiere cotización' :
                                                                reunion.resultadoExacto === 'otra_reunion' ? '📅 Quiere otra reunión' :
                                                                    reunion.resultadoExacto === 'no_asistio' ? '❌ No asistió' :
                                                                        reunion.resultadoExacto === 'no_venta' ? '😐 No le interesó' :
                                                                            '✅ Completada'}
                                                    </div>
                                                )}

                                                {/* Time and Status */}
                                                <div className="flex items-center justify-between mb-3 mt-1">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-4 h-4 text-gray-600" />
                                                        <span className="font-semibold text-gray-900">
                                                            {formatearHora(reunion.fecha)}
                                                        </span>
                                                    </div>
                                                    <span
                                                        className={`px-2 py-1 rounded-full text-xs font-semibold ${reunion.estado === 'pendiente'
                                                            ? 'bg-(--theme-500) text-white'
                                                            : 'bg-green-600 text-white'
                                                            }`}
                                                    >
                                                        {reunion.estado === 'pendiente' ? '⏳ Pendiente' : '✅ Completada'}
                                                    </span>
                                                </div>

                                                {/* Agendado Por (Prospector) */}
                                                <div className="mb-3 p-2 bg-white/80 rounded border border-gray-200">
                                                    <p className="text-xs text-gray-600 font-medium mb-1 flex items-center gap-1">
                                                        <UserPlus className="w-3 h-3 text-(--theme-500)" />
                                                        Agendado Por:
                                                    </p>
                                                    <p className="text-sm font-bold text-gray-900 pl-1">{reunion.prospector}</p>
                                                </div>

                                                {/* Client Info */}
                                                <div className="mb-3 bg-white/80 rounded border border-gray-200 p-2">
                                                    <p className="text-xs text-gray-600 font-medium mb-1 flex items-center gap-1">
                                                        <User className="w-3 h-3" />
                                                        Cliente:
                                                    </p>
                                                    <h3 className="font-bold text-gray-900 mb-1 pl-1">
                                                        {reunion.cliente.nombres} {reunion.cliente.apellidoPaterno}
                                                    </h3>
                                                    {reunion.cliente.empresa && (
                                                        <p className="text-sm text-gray-600 flex items-center gap-1 pl-1">
                                                            <Briefcase className="w-3 h-3 text-gray-400" />
                                                            {reunion.cliente.empresa}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Contact */}
                                                <div className="mb-3 space-y-1 bg-white/80 rounded border border-gray-200 p-2">
                                                    {reunion.cliente.telefono && (
                                                        <p className="text-xs text-gray-600 flex items-center gap-1 pl-1">
                                                            <Phone className="w-3 h-3" />
                                                            <span className="font-mono text-gray-900">{reunion.cliente.telefono}</span>
                                                        </p>
                                                    )}
                                                    {reunion.cliente.correo && (
                                                        <p className="text-xs text-gray-600 flex items-center gap-1 pl-1 truncate">
                                                            <Mail className="w-3 h-3 shrink-0" />
                                                            <span className="truncate text-gray-900">{reunion.cliente.correo}</span>
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Notes */}
                                                {reunion.notas && (
                                                    <div className="mb-3 p-2 bg-yellow-50/80 rounded border border-yellow-100">
                                                        <p className="text-xs text-gray-600 font-medium mb-1">Notas:</p>
                                                        <p className="text-xs text-gray-700 leading-relaxed">{reunion.notas}</p>
                                                    </div>
                                                )}

                                                {/* Actions */}
                                                <div className="flex gap-2 mt-3">
                                                    {reunion.meetLink && (
                                                        <a
                                                            href={reunion.meetLink}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex-1 px-3 py-2 bg-(--theme-500) text-white text-xs rounded-lg hover:bg-(--theme-600) transition-colors flex items-center justify-center gap-1 font-bold shadow-sm"
                                                        >
                                                            <Video className="w-3 h-3" />
                                                            Unirse a Meet
                                                        </a>
                                                    )}

                                                    {reunion.estado === 'pendiente' && (
                                                        <button
                                                            onClick={() => abrirModalRegistrar(reunion)}
                                                            className="flex-1 px-3 py-2 bg-white text-gray-700 text-xs rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-1 border border-gray-200 shadow-sm font-medium hover:border-gray-300"
                                                        >
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            Registrar
                                                        </button>
                                                    )}

                                                    {reunion.estado === 'realizada' && (
                                                        <div className="flex-1 px-3 py-2 bg-green-100 text-green-700 text-xs rounded-lg flex items-center justify-center gap-1 border border-green-300 shadow-sm font-bold">
                                                            <CheckCircle2 className="w-4 h-4" />
                                                            ✅ Registrada
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modal Registrar Reunión */}
                {modalRegistrar && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in">

                            {/* Header */}
                            <div className="p-6 border-b border-gray-100">
                                <div className="flex items-center justify-between mb-1">
                                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        <CheckCircle2 className="w-5 h-5 text-(--theme-500)" />
                                        Registrar Reunión
                                    </h2>
                                    <button onClick={cerrarModal} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                                        <XCircle className="w-5 h-5 text-gray-400" />
                                    </button>
                                </div>
                                <p className="text-sm text-gray-500">
                                    {new Date(modalRegistrar.fecha).toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    {' · '}<span className="font-semibold text-gray-700">{modalRegistrar.cliente.nombres} {modalRegistrar.cliente.apellidoPaterno}</span>
                                </p>
                                {modalRegistrar.cliente.empresa && (
                                    <p className="text-xs text-gray-400 mt-0.5">{modalRegistrar.cliente.empresa}</p>
                                )}

                                {/* Indicador de paso */}
                                <div className="flex items-center gap-2 mt-3">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${pasoModal === 'asistencia' ? 'bg-(--theme-500) text-white' : 'bg-green-500 text-white'
                                        }`}>1</div>
                                    <div className={`flex-1 h-1 rounded-full transition-colors ${pasoModal !== 'asistencia' ? 'bg-(--theme-500)' : 'bg-gray-200'
                                        }`} />
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${pasoModal === 'resultado' ? 'bg-(--theme-500) text-white' :
                                        pasoModal === 'agendar' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                                        }`}>2</div>
                                    <div className={`flex-1 h-1 rounded-full transition-colors ${pasoModal === 'agendar' ? 'bg-(--theme-500)' : 'bg-gray-200'
                                        }`} />
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${pasoModal === 'agendar' ? 'bg-(--theme-500) text-white' : 'bg-gray-200 text-gray-400'
                                        }`}>3</div>
                                </div>
                            </div>

                            <div className="p-6 space-y-3">
                                {pasoModal === 'asistencia' ? (
                                    <>
                                        <p className="text-sm font-semibold text-gray-700 text-center mb-4">¿El cliente asistió a la reunión?</p>

                                        <button
                                            onClick={() => setPasoModal('resultado')}
                                            className="w-full px-4 py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-all flex items-center justify-center gap-3 font-semibold shadow-sm hover:shadow-md"
                                        >
                                            <CheckCircle2 className="w-5 h-5" />
                                            ✅ Sí asistió
                                        </button>

                                        <button
                                            onClick={() => handleRegistrarReunion('no_asistio')}
                                            disabled={guardando}
                                            className="w-full px-4 py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all flex items-center justify-center gap-3 font-semibold shadow-sm hover:shadow-md disabled:opacity-60"
                                        >
                                            <XCircle className="w-5 h-5" />
                                            ❌ No asistió
                                        </button>
                                    </>
                                ) : pasoModal === 'resultado' ? (
                                    <>
                                        <p className="text-sm font-semibold text-gray-700 text-center mb-1">¿Cuál fue el resultado?</p>
                                        <p className="text-xs text-gray-400 text-center mb-4">El cliente asistió a la reunión</p>

                                        <button
                                            onClick={() => handleRegistrarReunion('venta')}
                                            disabled={guardando}
                                            className="w-full px-4 py-3.5 bg-(--theme-500) hover:bg-(--theme-600) text-white rounded-xl transition-all flex items-center gap-3 font-semibold shadow-sm hover:shadow-md disabled:opacity-60"
                                        >
                                            <span className="text-xl">🎉</span>
                                            <div className="text-left">
                                                <p className="text-sm font-bold">¡Venta cerrada!</p>
                                                <p className="text-xs opacity-80">Convertir a cliente</p>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => handleRegistrarReunion('cotizacion')}
                                            disabled={guardando}
                                            className="w-full px-4 py-3.5 bg-(--theme-500) hover:bg-(--theme-600) text-white rounded-xl transition-all flex items-center gap-3 font-semibold shadow-sm hover:shadow-md disabled:opacity-60"
                                        >
                                            <span className="text-xl">💰</span>
                                            <div className="text-left">
                                                <p className="text-sm font-bold">Quiere cotización</p>
                                                <p className="text-xs opacity-80">Pasa a negociación</p>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => handleRegistrarReunion('otra_reunion')}
                                            disabled={guardando}
                                            className="w-full px-4 py-3.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl transition-all flex items-center gap-3 font-semibold shadow-sm hover:shadow-md disabled:opacity-60"
                                        >
                                            <span className="text-xl">📅</span>
                                            <div className="text-left">
                                                <p className="text-sm font-bold">Quiere otra reunión</p>
                                                <p className="text-xs opacity-80">Agendar siguiente cita</p>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => handleRegistrarReunion('no_venta')}
                                            disabled={guardando}
                                            className="w-full px-4 py-3.5 bg-gray-500 hover:bg-gray-600 text-white rounded-xl transition-all flex items-center gap-3 font-semibold shadow-sm hover:shadow-md disabled:opacity-60"
                                        >
                                            <span className="text-xl">😐</span>
                                            <div className="text-left">
                                                <p className="text-sm font-bold">No le interesó</p>
                                                <p className="text-xs opacity-80">Marcar como perdido</p>
                                            </div>
                                        </button>

                                        {/* Campo de notas */}
                                        <div className="pt-2">
                                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notas (opcional)</label>
                                            <textarea
                                                value={notasModal}
                                                onChange={e => setNotasModal(e.target.value)}
                                                placeholder="Agrega notas sobre la reunión..."
                                                rows={2}
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-(--theme-500) resize-none text-gray-700 placeholder-gray-400"
                                            />
                                        </div>

                                        <button
                                            onClick={() => setPasoModal('asistencia')}
                                            className="w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                                        >
                                            ← Volver
                                        </button>
                                    </>
                                ) : (
                                    /* PASO 3 — Agendar próxima reunión */
                                    <>
                                        <div className="flex items-center gap-2 mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                                            <span className="text-2xl">📅</span>
                                            <div>
                                                <p className="text-sm font-bold text-yellow-800">Resultado guardado: Quiere otra reunión</p>
                                                <p className="text-xs text-yellow-600">Ahora agenda la próxima cita en tu calendario</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Fecha *</label>
                                                    <input
                                                        type="date"
                                                        value={nuevaReunionForm.fecha}
                                                        min={new Date().toISOString().split('T')[0]}
                                                        onChange={e => setNuevaReunionForm(f => ({ ...f, fecha: e.target.value }))}
                                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-(--theme-500) text-gray-700"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Hora *</label>
                                                    <input
                                                        type="time"
                                                        value={nuevaReunionForm.hora}
                                                        onChange={e => setNuevaReunionForm(f => ({ ...f, hora: e.target.value }))}
                                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-(--theme-500) text-gray-700"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Duración</label>
                                                <select
                                                    value={nuevaReunionForm.duracion}
                                                    onChange={e => setNuevaReunionForm(f => ({ ...f, duracion: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-(--theme-500) text-gray-700"
                                                >
                                                    <option value="30">30 minutos</option>
                                                    <option value="45">45 minutos</option>
                                                    <option value="60">1 hora</option>
                                                    <option value="90">1.5 horas</option>
                                                    <option value="120">2 horas</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notas de la próxima reunión</label>
                                                <textarea
                                                    value={nuevaReunionForm.notas}
                                                    onChange={e => setNuevaReunionForm(f => ({ ...f, notas: e.target.value }))}
                                                    placeholder="Temas a tratar, contexto..."
                                                    rows={2}
                                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-(--theme-500) resize-none text-gray-700 placeholder-gray-400"
                                                />
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleAgendarNuevaReunion}
                                            disabled={guardando || !nuevaReunionForm.fecha || !nuevaReunionForm.hora}
                                            className="w-full px-4 py-3.5 bg-(--theme-500) hover:bg-(--theme-600) text-white rounded-xl transition-all flex items-center justify-center gap-2 font-bold shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {guardando ? (
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <Calendar className="w-4 h-4" />
                                            )}
                                            {guardando ? 'Agendando...' : 'Agendar en Google Calendar'}
                                        </button>

                                        <button
                                            onClick={cerrarModal}
                                            className="w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                                        >
                                            Saltar (¿ya no quiere?)
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                {/* Modal Agendar Directo — desde Seguimiento */}
                {modalAgendarDirecto && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in">
                            {/* Header */}
                            <div className="p-5 border-b border-gray-100">
                                <div className="flex items-center justify-between mb-1">
                                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-(--theme-500)" />
                                        Agendar Reunión
                                    </h2>
                                    <button onClick={() => setModalAgendarDirecto(null)} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                                        <XCircle className="w-4 h-4 text-gray-400" />
                                    </button>
                                </div>
                                <p className="text-sm font-semibold text-gray-700">
                                    {modalAgendarDirecto.prospecto.nombres} {modalAgendarDirecto.prospecto.apellidoPaterno}
                                </p>
                                {modalAgendarDirecto.prospecto.empresa && (
                                    <p className="text-xs text-gray-400">{modalAgendarDirecto.prospecto.empresa}</p>
                                )}
                            </div>

                            <div className="p-5 space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Fecha *</label>
                                        <input
                                            type="date"
                                            value={agendarDirectoForm.fecha}
                                            min={new Date().toISOString().split('T')[0]}
                                            onChange={e => setAgendarDirectoForm(f => ({ ...f, fecha: e.target.value }))}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-(--theme-500) text-gray-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Hora *</label>
                                        <input
                                            type="time"
                                            value={agendarDirectoForm.hora}
                                            onChange={e => setAgendarDirectoForm(f => ({ ...f, hora: e.target.value }))}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-(--theme-500) text-gray-700"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Duración</label>
                                    <select
                                        value={agendarDirectoForm.duracion}
                                        onChange={e => setAgendarDirectoForm(f => ({ ...f, duracion: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-(--theme-500) text-gray-700"
                                    >
                                        <option value="30">30 minutos</option>
                                        <option value="45">45 minutos</option>
                                        <option value="60">1 hora</option>
                                        <option value="90">1.5 horas</option>
                                        <option value="120">2 horas</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notas (opcional)</label>
                                    <textarea
                                        value={agendarDirectoForm.notas}
                                        onChange={e => setAgendarDirectoForm(f => ({ ...f, notas: e.target.value }))}
                                        placeholder="Temas a tratar, contexto..."
                                        rows={2}
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-(--theme-500) resize-none text-gray-700 placeholder-gray-400"
                                    />
                                </div>

                                <button
                                    onClick={handleAgendarDirecto}
                                    disabled={guardandoDirecto || !agendarDirectoForm.fecha || !agendarDirectoForm.hora}
                                    className="w-full px-4 py-3.5 bg-(--theme-500) hover:bg-(--theme-600) text-white rounded-xl transition-all flex items-center justify-center gap-2 font-bold shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {guardandoDirecto ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Calendar className="w-4 h-4" />
                                    )}
                                    {guardandoDirecto ? 'Agendando...' : 'Agendar en Google Calendar'}
                                </button>

                                <button
                                    onClick={() => setModalAgendarDirecto(null)}
                                    className="w-full px-4 py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
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
