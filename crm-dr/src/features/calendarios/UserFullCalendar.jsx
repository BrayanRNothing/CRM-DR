import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
    Calendar as CalendarIcon, Clock, User, Phone, ChevronLeft, ChevronRight,
    CheckCircle2, XCircle, Video, UserPlus, AlertCircle, Copy, Link as LinkIcon,
    Plus, Mail, Briefcase, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import API_URL from '../../config/api';
import { getToken } from '../../utils/authUtils';

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/* ── helpers ── */
function decodeRole() {
    try {
        const token = getToken();
        if (!token) return null;
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.usuario?.rol || null;
    } catch { return null; }
}
const isSameDay = (a, b) => a && b && a.toDateString() === b.toDateString();
const isToday = (d) => d && isSameDay(d, new Date());
const fmtHora = (fecha) => new Date(fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
const fmtFecha = (d) => d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

const CalendarioCompleto = ({ forceModo }) => {
    const location = useLocation();
    
    // Si se pasa un modo forzado (ej. 'vista', 'agendador'), lo usamos. Si no, usamos el rol de la sesión.
    const rawRole = decodeRole(); // 'prospector' | 'closer' | 'admin' | 'doctor'
    const role = forceModo || rawRole;
    
    const isProspector = role === 'prospector' || role === 'agendador';
    const isVista = forceModo === 'vista';

    /* ── shared state ── */
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());

    /* ── prospector state ── */
    const [closers, setClosers] = useState([]);
    const [prospectos, setProspectos] = useState([]);
    const [selectedCloser, setSelectedCloser] = useState('');
    const [selectedProspect, setSelectedProspect] = useState('');
    const [busySlots, setBusySlots] = useState([]);
    const [loadingBusy, setLoadingBusy] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [notasAgendar, setNotasAgendar] = useState('');
    const [createdLink, setCreatedLink] = useState(null);
    const [closerLinked, setCloserLinked] = useState(true);

    /* ── closer state ── */
    const [reuniones, setReuniones] = useState([]);
    const [googleLinked, setGoogleLinked] = useState(null);
    const [loadingEvents, setLoadingEvents] = useState(false);
    /* modal registrar */
    const [modalReg, setModalReg] = useState(null);
    const [pasoModal, setPasoModal] = useState('asistencia');
    const [notasModal, setNotasModal] = useState('');
    const [guardando, setGuardando] = useState(false);
    /* modal nueva reunión (closer) */
    const [modalNueva, setModalNueva] = useState(false);
    const [nuevaForm, setNuevaForm] = useState({ prospecto: '', fecha: '', hora: '10:00', duracion: '60', notas: '' });
    const [guardandoNueva, setGuardandoNueva] = useState(false);
    /* form agendar siguiente (dentro de modal reg) */
    const [siguienteForm, setSiguienteForm] = useState({ fecha: '', hora: '10:00', duracion: '60', notas: '' });

    /* ═══ PROSPECTOR — cargar closers + prospectos ═══ */
    useEffect(() => {
        if (!isProspector) return;
        const token = getToken();
        Promise.all([
            fetch(`${API_URL}/api/usuarios`, { headers: { 'x-auth-token': token } }).then(r => r.json()),
            fetch(`${API_URL}/api/prospector/prospectos`, { headers: { 'x-auth-token': token } }).then(r => r.json()),
        ]).then(([users, pros]) => {
            setClosers(Array.isArray(users) ? users.filter(u => u.rol === 'closer' || u.rol === 'doctor') : []);
            setProspectos(Array.isArray(pros) ? pros : []);
        }).catch(console.error);
    }, [isProspector]);

    /* auto-seleccionar prospecto si viene de Seguimiento */
    useEffect(() => {
        if (isProspector && location.state?.prospecto) {
            const p = location.state.prospecto;
            const id = String(p.id || p._id || '');
            if (id) setSelectedProspect(id);
        }
        if (!isProspector && location.state?.prospecto) {
            const p = location.state.prospecto;
            const mañana = new Date(); mañana.setDate(mañana.getDate() + 1);
            setNuevaForm(f => ({
                ...f,
                fecha: mañana.toISOString().split('T')[0],
                prospecto: String(p.id || p._id || '')
            }));
            setModalNueva(true);
            window.history.replaceState({}, document.title);
        }
    }, [location.state, isProspector]);

    /* ═══ PROSPECTOR — freebusy ═══ */
    useEffect(() => {
        if (!isProspector || !selectedCloser) { setBusySlots([]); setCloserLinked(true); return; }
        setLoadingBusy(true);
        const year = currentDate.getFullYear(), month = currentDate.getMonth();
        const timeMin = new Date(year, month, 1).toISOString();
        const timeMax = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
        fetch(`${API_URL}/api/google/freebusy/${selectedCloser}?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&_t=${Date.now()}`, {
            headers: { 'x-auth-token': getToken() }, cache: 'no-store'
        }).then(async r => {
            const d = await r.json();
            if (!r.ok) { setCloserLinked(!d.notLinked); setBusySlots([]); }
            else {
                setCloserLinked(true);
                const all = Object.values(d.calendars || {}).flatMap(c => c.busy || []);
                setBusySlots(all.map(b => ({ start: new Date(b.start), end: new Date(b.end) })));
            }
        }).catch(() => setBusySlots([])).finally(() => setLoadingBusy(false));
    }, [isProspector, selectedCloser, currentDate]);

    /* ═══ CLOSER — cargar eventos de Google ═══ */
    const fetchEvents = useCallback(async () => {
        if (isProspector) return;
        setLoadingEvents(true);
        const year = currentDate.getFullYear(), month = currentDate.getMonth();
        const timeMin = new Date(year, month, 1).toISOString();
        const timeMax = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
        try {
            const token = getToken();
            const r = await fetch(`${API_URL}/api/google/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`, {
                headers: { 'x-auth-token': token }
            });
            if (r.status === 400 || r.status === 404) { setGoogleLinked(false); return; }
            if (!r.ok) throw new Error();
            setGoogleLinked(true);
            const events = await r.json();

            let completados = [];
            try {
                const cr = await fetch(`${API_URL}/api/closer/google-events-completados`, { headers: { 'x-auth-token': token } });
                if (cr.ok) completados = await cr.json();
            } catch { }

            setReuniones(events.map(ev => {
                const desc = ev.description || '';
                const agendadoPorM = desc.match(/Agendado por:? (.*?)(\n|$)/i);
                const notasM = desc.match(/Notas: (.*?)(\n|$)/s);
                const comp = completados.find(e => e.googleEventId === ev.id || e === ev.id);
                return {
                    id: ev.id,
                    fecha: ev.start.dateTime || ev.start.date,
                    cliente: {
                        nombres: ev.summary || 'Sin Título', apellidoPaterno: '',
                        empresa: '', telefono: '',
                        correo: ev.attendees?.find(a => !a.self)?.email || ''
                    },
                    prospector: agendadoPorM ? agendadoPorM[1].trim() : 'Google Calendar',
                    notas: notasM ? notasM[1].trim() : desc,
                    meetLink: ev.hangoutLink,
                    estado: comp ? 'realizada' : 'pendiente',
                    resultadoExacto: typeof comp === 'object' ? comp?.resultado : null,
                    clienteId: null,
                };
            }));
        } catch { if (googleLinked === null) setGoogleLinked(false); }
        finally { setLoadingEvents(false); }
    }, [isProspector, currentDate]);

    useEffect(() => { fetchEvents(); }, [fetchEvents]);

    /* ═══ Calendar grid ═══ */
    const calendarDays = useMemo(() => {
        const year = currentDate.getFullYear(), month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const days = [];
        for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
        for (let d = 1; d <= new Date(year, month + 1, 0).getDate(); d++) days.push(new Date(year, month, d));
        return days;
    }, [currentDate]);

    /* ═══ Slots for Prospector ═══ */
    const generateSlots = useCallback((date) => {
        if (!date || date.getDay() === 0) return [];
        const slots = [];
        let cur = new Date(date); cur.setHours(6, 0, 0, 0);
        const end = new Date(date); end.setHours(17, 0, 0, 0);
        while (cur < end) {
            const s = new Date(cur), e = new Date(cur.getTime() + 45 * 60000);
            if (e <= end) {
                const isBusy = busySlots.some(b => s < b.end && e > b.start);
                slots.push({ start: s, end: e, isBusy });
            }
            cur.setTime(e.getTime());
        }
        return slots;
    }, [busySlots]);

    /* reuniones del closer indexadas por día */
    const reunionesPorDia = useMemo(() => {
        const m = {};
        reuniones.forEach(r => {
            const k = new Date(r.fecha).toDateString();
            if (!m[k]) m[k] = [];
            m[k].push(r);
        });
        return m;
    }, [reuniones]);

    const reunionesDia = useMemo(() =>
        (reunionesPorDia[selectedDate.toDateString()] || []).sort((a, b) => new Date(a.fecha) - new Date(b.fecha)),
        [reunionesPorDia, selectedDate]);

    /* ═══ Prospector — submit agendar ═══ */
    const handleAgendar = async (e) => {
        e.preventDefault();
        if (!selectedSlot) { toast.error('Selecciona un horario'); return; }
        const closer = closers.find(c => c.id == selectedCloser);
        const prospect = prospectos.find(p => p.id == selectedProspect);
        if (!closer || !prospect) { toast.error('Selecciona closer y prospecto'); return; }
        const t = toast.loading('Agendando cita...');
        try {
            const r = await fetch(`${API_URL}/api/prospector/agendar-reunion`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': getToken() },
                body: JSON.stringify({ clienteId: prospect.id, closerId: selectedCloser, fechaReunion: selectedSlot.start.toISOString(), notas: notasAgendar })
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.msg || 'Error');
            toast.success(`✅ Cita agendada con ${closer.nombre}`);
            if (d.hangoutLink) setCreatedLink(d.hangoutLink);
            setSelectedSlot(null); setNotasAgendar(''); setSelectedProspect('');
        } catch (err) { toast.error(err.message); }
        finally { toast.dismiss(t); }
    };

    /* ═══ Closer — registrar resultado ═══ */
    const handleRegistrar = async (resultado) => {
        setGuardando(true);
        try {
            const token = getToken();
            const clienteId = modalReg.clienteId;

            if (clienteId) {
                const r = await fetch(`${API_URL}/api/closer/registrar-reunion`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                    body: JSON.stringify({ clienteId, resultado, notas: notasModal })
                });
                if (!r.ok) { const d = await r.json(); throw new Error(d.msg); }
            } else {
                await fetch(`${API_URL}/api/closer/registrar-actividad`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                    body: JSON.stringify({ tipo: 'cita', resultado: resultado === 'venta' ? 'convertido' : resultado === 'no_asistio' || resultado === 'no_venta' ? 'fallido' : 'exitoso', descripcion: { no_asistio: 'No asistió', no_venta: 'No le interesó', otra_reunion: 'Quiere otra reunión', cotizacion: 'Quiere cotización', venta: '¡Venta cerrada!' }[resultado], notas: notasModal })
                });
            }

            // marcar completado en BD y Google
            await Promise.allSettled([
                fetch(`${API_URL}/api/closer/marcar-evento-completado`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-auth-token': token }, body: JSON.stringify({ googleEventId: modalReg.id, clienteId, resultado, notas: notasModal }) }),
                fetch(`${API_URL}/api/google/mark-completed/${modalReg.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-auth-token': token }, body: JSON.stringify({ resultado, notas: notasModal, clienteNombre: `${modalReg.cliente.nombres} ${modalReg.cliente.apellidoPaterno}` }) }),
            ]);

            setReuniones(prev => prev.map(r => r.id === modalReg.id ? { ...r, estado: 'realizada', resultadoExacto: resultado } : r));

            if (resultado === 'otra_reunion') { setPasoModal('agendar'); setNotasModal(''); }
            else {
                const msgs = { no_asistio: '❌ No asistió', no_venta: '😐 No le interesó', cotizacion: '💰 Quiere cotización', venta: '🎉 ¡Venta cerrada!' };
                toast.success(msgs[resultado] || 'Registrado');
                setModalReg(null);
            }
        } catch (err) { toast.error(err.message || 'Error'); }
        finally { setGuardando(false); }
    };

    /* ═══ Closer — agendar siguiente reunión ═══ */
    const handleAgendarSiguiente = async () => {
        if (!siguienteForm.fecha || !siguienteForm.hora) { toast.error('Fecha y hora requeridas'); return; }
        setGuardando(true);
        try {
            const token = getToken();
            const start = new Date(`${siguienteForm.fecha}T${siguienteForm.hora}:00`);
            const end = new Date(start.getTime() + parseInt(siguienteForm.duracion) * 60000);
            const nombre = `${modalReg.cliente.nombres} ${modalReg.cliente.apellidoPaterno}`.trim();
            const r = await fetch(`${API_URL}/api/google/create-event`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify({ title: `Reunión con ${nombre}`, startDateTime: start.toISOString(), endDateTime: end.toISOString(), description: siguienteForm.notas, clienteId: modalReg.clienteId })
            });
            if (!r.ok) { const d = await r.json(); throw new Error(d.msg); }
            toast.success('📅 Próxima reunión agendada');
            setModalReg(null);
            fetchEvents();
        } catch (err) { toast.error(err.message || 'Error'); }
        finally { setGuardando(false); }
    };

    /* ═══ Closer — nueva reunión manual ═══ */
    const handleNuevaReunion = async () => {
        if (!nuevaForm.fecha || !nuevaForm.hora) { toast.error('Fecha y hora requeridas'); return; }
        setGuardandoNueva(true);
        try {
            const token = getToken();
            const start = new Date(`${nuevaForm.fecha}T${nuevaForm.hora}:00`);
            const end = new Date(start.getTime() + parseInt(nuevaForm.duracion) * 60000);
            const prospect = prospectos.find(p => String(p.id) === nuevaForm.prospecto);
            const nombre = prospect ? `${prospect.nombres} ${prospect.apellidoPaterno}`.trim() : 'Cliente';
            const r = await fetch(`${API_URL}/api/google/create-event`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify({ title: `Reunión con ${nombre}`, startDateTime: start.toISOString(), endDateTime: end.toISOString(), description: nuevaForm.notas || '', clienteId: nuevaForm.prospecto || null })
            });
            if (!r.ok) { const d = await r.json(); throw new Error(d.msg); }
            toast.success('📅 Reunión agendada en Google Calendar');
            setModalNueva(false); setNuevaForm({ prospecto: '', fecha: '', hora: '10:00', duracion: '60', notas: '' });
            fetchEvents();
        } catch (err) { toast.error(err.message || 'Error'); }
        finally { setGuardandoNueva(false); }
    };

    /* load prospectos for closer nueva reunion */
    useEffect(() => {
        if (isProspector || prospectos.length > 0) return;
        fetch(`${API_URL}/api/closer/prospectos`, { headers: { 'x-auth-token': getToken() } })
            .then(r => r.ok ? r.json() : []).then(d => setProspectos(Array.isArray(d) ? d : [])).catch(() => { });
    }, [isProspector, prospectos.length]);

    /* ── stat cards for closer ── */
    const stats = useMemo(() => {
        const pend = reuniones.filter(r => r.estado === 'pendiente').length;
        const hoy = reuniones.filter(r => isSameDay(new Date(r.fecha), new Date())).length;
        const mes = reuniones.length;
        return { pend, hoy, mes };
    }, [reuniones]);

    /* ══════════════════ RENDER ══════════════════ */
    return (
        <div className="h-full flex flex-col overflow-hidden bg-gray-50">

            {/* ── Top Header ── */}
            <div className="shrink-0 px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-blue-600" />
                        Mi Calendario
                    </h1>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {isProspector ? 'Agenda reuniones con closers' : 'Tus reuniones del mes'}
                    </p>
                </div>

                {/* Closer: stats + botón nueva reunión */}
                {!isProspector && (
                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center gap-4">
                            {[
                                { label: 'Hoy', val: stats.hoy, color: 'text-blue-600' },
                                { label: 'Pendientes', val: stats.pend, color: 'text-orange-500' },
                                { label: 'Este mes', val: stats.mes, color: 'text-green-600' },
                            ].map(s => (
                                <div key={s.label} className="text-center">
                                    <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
                                    <p className="text-xs text-gray-400">{s.label}</p>
                                </div>
                            ))}
                        </div>
                        {!isVista && (
                            <button onClick={() => setModalNueva(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-200">
                                <Plus className="w-4 h-4" /> Nueva Reunión
                            </button>
                        )}
                        <button onClick={fetchEvents} title="Actualizar" disabled={loadingEvents}
                            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
                            <RefreshCw className={`w-4 h-4 text-gray-500 ${loadingEvents ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                )}

                {/* Google not linked warning */}
                {!isProspector && googleLinked === false && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-700">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        Vincula Google Calendar en Ajustes para ver tus reuniones
                    </div>
                )}
            </div>

            {/* ── Main Content ── */}
            <div className="flex-1 flex overflow-hidden min-h-0 p-4 gap-4">

                {/* ── Calendar Grid (left 2/3) ── */}
                <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-w-0">

                    {/* Month nav */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                            className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                            <ChevronLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div className="text-center">
                            <h2 className="text-lg font-bold text-gray-900">{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
                            {isProspector && !selectedCloser && (
                                <p className="text-xs text-orange-500 font-medium mt-0.5">Selecciona un closer para ver disponibilidad</p>
                            )}
                            {googleLinked === null && !isProspector && (
                                <p className="text-xs text-gray-400 animate-pulse mt-0.5">Verificando Google Calendar...</p>
                            )}
                        </div>
                        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                            className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                            <ChevronRight className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>

                    {/* Day headers */}
                    <div className="grid grid-cols-7 px-4 pt-3 pb-1">
                        {DAYS.map(d => (
                            <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
                        ))}
                    </div>

                    {/* Day cells */}
                    <div className="flex-1 grid grid-cols-7 gap-1 px-4 pb-4 min-h-0" style={{ gridAutoRows: '1fr' }}>
                        {calendarDays.map((date, i) => {
                            const isSelected = date && isSameDay(date, selectedDate);
                            const todayDate = date && isToday(date);
                            // Indicators
                            let badge = null;
                            if (date && isProspector && selectedCloser) {
                                const slots = generateSlots(date);
                                const busyCount = slots.filter(s => s.isBusy).length;
                                if (loadingBusy) badge = <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">...</span>;
                                else if (busyCount > 0) badge = <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-white/30 text-white' : 'bg-orange-100 text-orange-600'}`}>{busyCount} ocup.</span>;
                            }
                            if (date && !isProspector) {
                                const count = (reunionesPorDia[date.toDateString()] || []).length;
                                if (count > 0) badge = <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-white/30 text-white' : 'bg-blue-100 text-blue-600'}`}>{count} {count === 1 ? 'reunión' : 'reuniones'}</span>;
                            }
                            return (
                                <button key={i} disabled={!date}
                                    onClick={() => { if (date) { setSelectedDate(date); setSelectedSlot(null); setCreatedLink(null); } }}
                                    className={`relative flex flex-col items-center justify-center rounded-xl border transition-all duration-150 p-3 min-h-[80px]
                                        ${!date ? 'bg-transparent border-transparent cursor-default' : ''}
                                        ${date && !isSelected && !todayDate ? 'bg-white border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 text-gray-700' : ''}
                                        ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200 scale-105 z-10' : ''}
                                        ${todayDate && !isSelected ? 'bg-blue-50 border-2 border-blue-500 text-blue-700 font-bold' : ''}
                                    `}>
                                    {date && <span className={`text-2xl font-bold leading-none ${isSelected ? 'text-white' : ''}`}>{date.getDate()}</span>}
                                    {badge && <div className="mt-1.5">{badge}</div>}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── Right Panel (1/3) ── */}
                <div className="w-72 xl:w-80 shrink-0 flex flex-col gap-4 min-h-0 overflow-y-auto">

                    {/* ── PROSPECTOR Panel ── */}
                    {isProspector && (
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-4">
                            <div>
                                <h3 className="font-bold text-gray-900 mb-0.5 flex items-center gap-2">
                                    <CalendarIcon className="w-4 h-4 text-blue-600" />
                                    Agendar Reunión
                                </h3>
                                <p className="text-xs text-gray-400">{fmtFecha(selectedDate)}</p>
                            </div>

                            {/* Closer not linked warning */}
                            {selectedCloser && !closerLinked && (
                                <div className="flex flex-col gap-1 p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-700">
                                    <div className="flex items-center gap-1 font-bold"><AlertCircle className="w-3.5 h-3.5" />Closer sin Google vinculado</div>
                                    <p>No se puede verificar su disponibilidad ni crear sala de Meet.</p>
                                </div>
                            )}

                            <form onSubmit={handleAgendar} className="flex flex-col gap-3">
                                {/* Prospecto */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Prospecto</label>
                                    <select value={selectedProspect} onChange={e => setSelectedProspect(e.target.value)} required
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400">
                                        <option value="">Selecciona...</option>
                                        {prospectos.map(p => <option key={p.id} value={p.id}>{p.nombres} {p.apellidoPaterno}</option>)}
                                    </select>
                                </div>
                                {/* Closer */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Closer / Doctor</label>
                                    <select value={selectedCloser} onChange={e => setSelectedCloser(e.target.value)} required
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400">
                                        <option value="">Selecciona...</option>
                                        {closers.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                    </select>
                                </div>
                                {/* Time slots */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-2">Horarios disponibles</label>
                                    {!selectedCloser ? (
                                        <p className="text-xs text-gray-400 italic text-center py-3">Selecciona un closer primero</p>
                                    ) : selectedDate.getDay() === 0 ? (
                                        <p className="text-xs text-gray-400 italic text-center py-3">Domingo — no laborable</p>
                                    ) : loadingBusy ? (
                                        <p className="text-xs text-gray-400 animate-pulse text-center py-3">Cargando disponibilidad...</p>
                                    ) : (
                                        <div className="grid grid-cols-3 gap-1.5 max-h-40 overflow-y-auto">
                                            {generateSlots(selectedDate).map((slot, idx) => {
                                                const timeStr = slot.start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                                                const isSel = selectedSlot?.start.getTime() === slot.start.getTime();
                                                return (
                                                    <button key={idx} type="button" disabled={slot.isBusy}
                                                        onClick={() => !slot.isBusy && setSelectedSlot(slot)}
                                                        className={`py-1.5 px-1 text-xs rounded-lg border text-center transition-all
                                                            ${slot.isBusy ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed line-through'
                                                                : isSel ? 'bg-blue-600 border-blue-600 text-white font-bold shadow-sm'
                                                                    : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700'}`}>
                                                        {timeStr}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                {/* Notas */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Notas (opcional)</label>
                                    <textarea value={notasAgendar} onChange={e => setNotasAgendar(e.target.value)} rows={2}
                                        placeholder="Detalles para el closer..."
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 resize-none" />
                                </div>
                                <button type="submit" disabled={!selectedSlot}
                                    className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none">
                                    Agendar Cita
                                </button>
                            </form>

                            {/* Meet link creado */}
                            {createdLink && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex flex-col gap-2">
                                    <div className="flex items-center gap-1.5 text-green-800 font-bold text-xs">
                                        <LinkIcon className="w-3.5 h-3.5" /> Google Meet creado
                                    </div>
                                    <button onClick={() => { navigator.clipboard.writeText(createdLink); toast.success('Enlace copiado'); }}
                                        className="flex items-center justify-center gap-1.5 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors">
                                        <Copy className="w-3.5 h-3.5" /> Copiar enlace
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── CLOSER Panel ── */}
                    {!isProspector && (
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100 shrink-0">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                    <CalendarIcon className="w-4 h-4 text-blue-600" />
                                    Reuniones del día
                                </h3>
                                <p className="text-xs text-gray-400 mt-0.5">{fmtFecha(selectedDate)}</p>
                                <p className="text-xs text-gray-500 mt-1">{reunionesDia.length} {reunionesDia.length === 1 ? 'reunión' : 'reuniones'}</p>
                            </div>

                            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 max-h-[calc(100vh-14rem)]" style={{ scrollbarWidth: 'thin' }}>
                                {reunionesDia.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10 text-center">
                                        <CalendarIcon className="w-10 h-10 text-gray-200 mb-2" />
                                        <p className="text-sm text-gray-400 font-medium">Sin reuniones este día</p>
                                        <p className="text-xs text-gray-300 mt-0.5">Selecciona otro día o agenda una nueva</p>
                                    </div>
                                ) : reunionesDia.map(reunion => (
                                    <div key={reunion.id}
                                        className={`rounded-xl border p-3.5 transition-all relative mt-2 ${reunion.estado === 'pendiente' ? 'border-blue-200 bg-blue-50/40' : 'border-gray-200 bg-gray-50'}`}>

                                        {/* resultado badge */}
                                        {reunion.estado === 'realizada' && reunion.resultadoExacto && (
                                            <div className={`absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-sm
                                                ${reunion.resultadoExacto === 'venta' ? 'bg-green-500 text-white border-green-600' :
                                                    reunion.resultadoExacto === 'cotizacion' ? 'bg-blue-500 text-white border-blue-600' :
                                                        reunion.resultadoExacto === 'otra_reunion' ? 'bg-yellow-500 text-white border-yellow-600' :
                                                            reunion.resultadoExacto === 'no_asistio' ? 'bg-red-500 text-white border-red-600' : 'bg-gray-500 text-white border-gray-600'}`}>
                                                {{ venta: '🎉 Venta', cotizacion: '💰 Cotización', otra_reunion: '📅 Otra reunión', no_asistio: '❌ No asistió', no_venta: '😐 No le interesó' }[reunion.resultadoExacto] || '✅ Completada'}
                                            </div>
                                        )}

                                        {/* hora + estado */}
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5 text-gray-500" />
                                                <span className="font-bold text-gray-900 text-sm">{fmtHora(reunion.fecha)}</span>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${reunion.estado === 'pendiente' ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'}`}>
                                                {reunion.estado === 'pendiente' ? '⏳ Pendiente' : '✅ Realizada'}
                                            </span>
                                        </div>

                                        {/* Cliente */}
                                        <div className="mb-2">
                                            <div className="flex items-center gap-1 text-xs text-gray-500 mb-0.5"><User className="w-3 h-3" />Cliente</div>
                                            <p className="font-semibold text-gray-900 text-sm pl-1">{reunion.cliente.nombres} {reunion.cliente.apellidoPaterno}</p>
                                            {reunion.cliente.correo && <p className="text-xs text-gray-500 flex items-center gap-1 pl-1 mt-0.5"><Mail className="w-2.5 h-2.5" />{reunion.cliente.correo}</p>}
                                        </div>

                                        {/* Agendado por */}
                                        <div className="mb-2 text-xs text-gray-500 flex items-center gap-1 pl-1">
                                            <UserPlus className="w-3 h-3 text-blue-400" />
                                            Por: <span className="font-medium text-gray-700">{reunion.prospector}</span>
                                        </div>

                                        {/* Notas */}
                                        {reunion.notas && (
                                            <div className="mb-2 text-xs text-gray-600 bg-yellow-50 border border-yellow-100 rounded-lg p-2">
                                                {reunion.notas.length > 80 ? reunion.notas.slice(0, 80) + '…' : reunion.notas}
                                            </div>
                                        )}

                                        {/* Acciones */}
                                        <div className="flex gap-2 mt-2">
                                            {reunion.meetLink && (
                                                <a href={reunion.meetLink} target="_blank" rel="noopener noreferrer"
                                                    className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-blue-600 text-white text-xs rounded-lg font-bold hover:bg-blue-700 transition-colors">
                                                    <Video className="w-3 h-3" /> Meet
                                                </a>
                                            )}
                                            {reunion.estado === 'pendiente' && !isVista && (
                                                <button onClick={() => { setModalReg(reunion); setPasoModal('asistencia'); setNotasModal(''); setSiguienteForm({ fecha: '', hora: '10:00', duracion: '60', notas: '' }); }}
                                                    className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs rounded-lg font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors">
                                                    <CheckCircle2 className="w-3 h-3" /> Registrar
                                                </button>
                                            )}
                                            {reunion.estado === 'realizada' && (
                                                <div className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-green-50 border border-green-200 text-green-700 text-xs rounded-lg font-bold">
                                                    <CheckCircle2 className="w-3 h-3" /> Registrada
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ════ MODAL: Registrar Reunión (Closer) ════ */}
            {modalReg && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
                        {/* Header modal */}
                        <div className="p-5 border-b border-gray-100">
                            <div className="flex items-center justify-between mb-1">
                                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                                    Registrar Reunión
                                </h2>
                                <button onClick={() => setModalReg(null)} className="p-1.5 hover:bg-gray-100 rounded-full">
                                    <XCircle className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>
                            <p className="text-sm text-gray-500">
                                {new Date(modalReg.fecha).toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                {' · '}<span className="font-semibold text-gray-700">{modalReg.cliente.nombres}</span>
                            </p>
                            {/* Stepper */}
                            <div className="flex items-center gap-2 mt-3">
                                {['asistencia', 'resultado', 'agendar'].map((paso, i) => (
                                    <React.Fragment key={paso}>
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                                            ${pasoModal === paso ? 'bg-blue-600 text-white' :
                                                ['resultado', 'agendar'].slice(0, ['asistencia', 'resultado', 'agendar'].indexOf(pasoModal)).includes(paso) ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>{i + 1}</div>
                                        {i < 2 && <div className={`flex-1 h-1 rounded-full transition-colors ${pasoModal === 'agendar' || (pasoModal === 'resultado' && i === 0) ? 'bg-blue-600' : 'bg-gray-200'}`} />}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>

                        <div className="p-5 space-y-3">
                            {pasoModal === 'asistencia' ? (
                                <>
                                    <p className="text-sm font-semibold text-gray-700 text-center mb-3">¿El cliente asistió?</p>
                                    <button onClick={() => setPasoModal('resultado')}
                                        className="w-full py-3.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all">
                                        <CheckCircle2 className="w-5 h-5" /> ✅ Sí asistió
                                    </button>
                                    <button onClick={() => handleRegistrar('no_asistio')} disabled={guardando}
                                        className="w-full py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60">
                                        <XCircle className="w-5 h-5" /> ❌ No asistió
                                    </button>
                                </>
                            ) : pasoModal === 'resultado' ? (
                                <>
                                    <p className="text-sm font-semibold text-gray-700 text-center">¿Cuál fue el resultado?</p>
                                    {[
                                        { id: 'venta', label: '¡Venta cerrada!', sub: 'Convertir a cliente', emoji: '🎉', color: 'bg-green-500 hover:bg-green-600' },
                                        { id: 'cotizacion', label: 'Quiere cotización', sub: 'Pasa a negociación', emoji: '💰', color: 'bg-blue-500 hover:bg-blue-600' },
                                        { id: 'otra_reunion', label: 'Quiere otra reunión', sub: 'Agendar siguiente cita', emoji: '📅', color: 'bg-yellow-500 hover:bg-yellow-600' },
                                        { id: 'no_venta', label: 'No le interesó', sub: 'Marcar como perdido', emoji: '😐', color: 'bg-gray-500 hover:bg-gray-600' },
                                    ].map(op => (
                                        <button key={op.id} onClick={() => handleRegistrar(op.id)} disabled={guardando}
                                            className={`w-full px-4 py-3 ${op.color} text-white rounded-xl flex items-center gap-3 font-semibold transition-all disabled:opacity-60`}>
                                            <span className="text-xl">{op.emoji}</span>
                                            <div className="text-left"><p className="text-sm font-bold">{op.label}</p><p className="text-xs opacity-80">{op.sub}</p></div>
                                        </button>
                                    ))}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Notas (opcional)</label>
                                        <textarea value={notasModal} onChange={e => setNotasModal(e.target.value)} rows={2} placeholder="Observaciones..."
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 resize-none" />
                                    </div>
                                    <button onClick={() => setPasoModal('asistencia')} className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">← Volver</button>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                                        <span className="text-2xl">📅</span>
                                        <div><p className="text-sm font-bold text-yellow-800">Guardado: Quiere otra reunión</p><p className="text-xs text-yellow-600">Agenda la próxima cita</p></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha *</label>
                                            <input type="date" value={siguienteForm.fecha} min={new Date().toISOString().split('T')[0]}
                                                onChange={e => setSiguienteForm(f => ({ ...f, fecha: e.target.value }))}
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Hora *</label>
                                            <input type="time" value={siguienteForm.hora} onChange={e => setSiguienteForm(f => ({ ...f, hora: e.target.value }))}
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Duración</label>
                                        <select value={siguienteForm.duracion} onChange={e => setSiguienteForm(f => ({ ...f, duracion: e.target.value }))}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400">
                                            <option value="30">30 min</option><option value="45">45 min</option>
                                            <option value="60">1 hora</option><option value="90">1.5 horas</option><option value="120">2 horas</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Notas</label>
                                        <textarea value={siguienteForm.notas} onChange={e => setSiguienteForm(f => ({ ...f, notas: e.target.value }))} rows={2}
                                            placeholder="Temas a tratar..." className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 resize-none" />
                                    </div>
                                    <button onClick={handleAgendarSiguiente} disabled={guardando || !siguienteForm.fecha || !siguienteForm.hora}
                                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all">
                                        {guardando ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CalendarIcon className="w-4 h-4" />}
                                        {guardando ? 'Agendando...' : 'Agendar en Google Calendar'}
                                    </button>
                                    <button onClick={() => setModalReg(null)} className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">Saltar</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ════ MODAL: Nueva Reunión (Closer) ════ */}
            {modalNueva && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="font-bold text-gray-900 flex items-center gap-2">
                                <Plus className="w-5 h-5 text-blue-600" /> Nueva Reunión
                            </h2>
                            <button onClick={() => setModalNueva(false)} className="p-1.5 hover:bg-gray-100 rounded-full">
                                <XCircle className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            {prospectos.length > 0 && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Prospecto / Cliente (opcional)</label>
                                    <select value={nuevaForm.prospecto} onChange={e => setNuevaForm(f => ({ ...f, prospecto: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400">
                                        <option value="">Sin prospecto asociado</option>
                                        {prospectos.map(p => <option key={p.id} value={p.id}>{p.nombres} {p.apellidoPaterno}</option>)}
                                    </select>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha *</label>
                                    <input type="date" value={nuevaForm.fecha} min={new Date().toISOString().split('T')[0]}
                                        onChange={e => setNuevaForm(f => ({ ...f, fecha: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Hora *</label>
                                    <input type="time" value={nuevaForm.hora} onChange={e => setNuevaForm(f => ({ ...f, hora: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Duración</label>
                                <select value={nuevaForm.duracion} onChange={e => setNuevaForm(f => ({ ...f, duracion: e.target.value }))}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400">
                                    <option value="30">30 min</option><option value="45">45 min</option>
                                    <option value="60">1 hora</option><option value="90">1.5 horas</option><option value="120">2 horas</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Notas (opcional)</label>
                                <textarea value={nuevaForm.notas} onChange={e => setNuevaForm(f => ({ ...f, notas: e.target.value }))} rows={2}
                                    placeholder="Temas a tratar, contexto..."
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 resize-none" />
                            </div>
                            <button onClick={handleNuevaReunion} disabled={guardandoNueva || !nuevaForm.fecha || !nuevaForm.hora}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-md shadow-blue-200">
                                {guardandoNueva ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CalendarIcon className="w-4 h-4" />}
                                {guardandoNueva ? 'Agendando...' : 'Agendar en Google Calendar'}
                            </button>
                            <button onClick={() => setModalNueva(false)} className="w-full py-2 text-sm text-gray-400 hover:text-gray-600">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarioCompleto;
