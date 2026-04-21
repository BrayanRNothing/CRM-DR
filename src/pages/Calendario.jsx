import React, { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Calendar as CalendarIcon,
  Clock,
  Phone,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  User,
  Users,
  Briefcase,
  Mail,
  Link as LinkIcon,
  Copy,
  AlertCircle,
  Trash2,
  Edit2,
  Video as VideoIcon,
  VideoOff,
  X,
  RefreshCw,
  ExternalLink,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";

import API_URL from "../config/api";
import { getToken, getUser } from "../utils/authUtils";

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const Calendario = () => {
  const location = useLocation();
  console.log(
    "VENDEDOR CALENDAR MOUNT/RENDER. Location state:",
    location.state,
  );

  const currentUser = getUser();
  const isVendedor =
    String(currentUser?.rol || "").toLowerCase() === "vendedor";
  const currentUserId = String(currentUser?.id || currentUser?._id || "");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedCloser, setSelectedCloser] = useState(
    isVendedor ? currentUserId : "",
  );
  const [closers, setClosers] = useState([]);
  const [prospectos, setProspectos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [contactType, setContactType] = useState("prospecto"); // "prospecto" | "cliente"
  const [selectedProspect, setSelectedProspect] = useState("");
  const [busySlots, setBusySlots] = useState([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [createdEventLink, setCreatedEventLink] = useState(null);
  const [bookingCheck, setBookingCheck] = useState(null);
  const [closerLinkedToGoogle, setCloserLinkedToGoogle] = useState(true);
  const [googleLinked, setGoogleLinked] = useState(null);
  const [showSyncPrompt, setShowSyncPrompt] = useState(false);
  const [misReuniones, setMisReuniones] = useState([]);
  const [loadingMisReuniones, setLoadingMisReuniones] = useState(false);
  const [formData, setFormData] = useState({
    notas: "",
    invitados: [],
  });
  const [invitadoInput, setInvitadoInput] = useState("");
  const [activeTab, setActiveTab] = useState(
    location.state?.activeTab || "agenda",
  ); // 'agenda' o 'agendar'
  const [googleEvents, setGoogleEvents] = useState([]);
  const [loadingGoogleEvents, setLoadingGoogleEvents] = useState(false);

  // Para controlar el input de invitados en el modal de edición
  const [editInvitadoInput, setEditInvitadoInput] = useState("");

  // Modal: registrar resultado
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedMeetingForResult, setSelectedMeetingForResult] =
    useState(null);
  const [resultNotes, setResultNotes] = useState("");
  // Modal: editar reunión
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMeetingForEdit, setSelectedMeetingForEdit] = useState(null);
  const [editMeetingData, setEditMeetingData] = useState({
    fecha: "",
    notas: "",
    invitados: [],
  });
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  const navigate = useNavigate();

  const cargarMisReuniones = async () => {
    if (!isVendedor) return;
    setLoadingMisReuniones(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/vendedor/calendario`, {
        headers: { "x-auth-token": token },
      });
      if (!res.ok) throw new Error("No se pudieron cargar reuniones");
      const data = await res.json();

      const ahora = new Date().getTime();
      const proximas = (data || [])
        .filter((r) => {
          const f = new Date(r.fecha).getTime();
          const esPendiente = r.resultado === "pendiente" || !r.resultado;
          return f >= ahora && esPendiente;
        })
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

      const processed = proximas.map((r) => {
        let parsedInvitados = [];
        if (r.invitados) {
          try {
            parsedInvitados =
              typeof r.invitados === "string"
                ? JSON.parse(r.invitados)
                : r.invitados;
          } catch (e) {
            console.error("Error parsing invitados for meeting", r.id, e);
          }
        }
        return { ...r, invitados: parsedInvitados };
      });

      setMisReuniones(processed);
      return processed;
    } catch (error) {
      console.error("Error cargando reuniones del vendedor:", error);
      setMisReuniones([]);
      return [];
    } finally {
      setLoadingMisReuniones(false);
    }
  };

  const cargarMisEventosGoogle = async () => {
    if (!isVendedor || !googleLinked) return;
    setLoadingGoogleEvents(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const timeMin = new Date(year, month, 1).toISOString();
      const timeMax = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

      const token = getToken();
      const res = await fetch(
        `${API_URL}/api/google/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`,
        {
          headers: { "x-auth-token": token },
        },
      );

      if (!res.ok) throw new Error("Error al cargar eventos de Google");
      const data = await res.json();
      setGoogleEvents(data || []);
    } catch (error) {
      console.error("Error cargando eventos de Google:", error);
      setGoogleEvents([]);
    } finally {
      setLoadingGoogleEvents(false);
    }
  };

  const registrarResultado = async (reunion, resultado) => {
    const clienteId =
      reunion?.clienteId || reunion?.cliente?.id || reunion?.cliente?._id;
    if (!clienteId) {
      toast.error(
        "Esta reunión no tiene cliente vinculado para registrar resultado.",
      );
      return;
    }

    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/vendedor/registrar-reunion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": token,
        },
        body: JSON.stringify({
          clienteId,
          resultado,
          notas: `Resultado registrado desde calendario vendedor (${resultado})`,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.msg || "Error registrando resultado");
      }

      // Best-effort sync en Google (si existe eventId)
      if (reunion.id) {
        try {
          await fetch(`${API_URL}/api/google/mark-completed/${reunion.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "x-auth-token": token,
            },
            body: JSON.stringify({
              resultado,
              notas: `Marcado desde calendario vendedor`,
              clienteNombre:
                `${reunion?.cliente?.nombres || ""} ${reunion?.cliente?.apellidoPaterno || ""}`.trim(),
            }),
          });
        } catch (e) {
          console.warn("No se pudo sincronizar evento de Google:", e);
        }
      }

      toast.success("Resultado registrado correctamente");
      if (resultado === "otra_reunion") {
        toast("Puedes agendar la siguiente reunión en esta misma pantalla.");
      }
      await cargarMisReuniones();
    } catch (error) {
      console.error(error);
      toast.error(error.message || "No se pudo registrar el resultado");
    }
  };

  const handleEliminarReunion = async (id) => {
    if (!window.confirm("¿Eliminar esta reunión?")) return;
    const t = toast.loading("Eliminando...");
    try {
      const res = await fetch(`${API_URL}/api/actividades/${id}`, {
        method: "DELETE",
        headers: { "x-auth-token": getToken() },
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.mensaje);
      }
      toast.success("Reunión eliminada");
      await cargarMisReuniones();
    } catch (e) {
      toast.error(e.message || "Error al eliminar");
    } finally {
      toast.dismiss(t);
    }
  };

  const handleActualizarReunion = async () => {
    if (!editMeetingData.fecha) {
      toast.error("La fecha es obligatoria");
      return;
    }
    setGuardandoEdicion(true);
    const t = toast.loading("Actualizando...");
    try {
      const res = await fetch(
        `${API_URL}/api/actividades/${selectedMeetingForEdit.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-auth-token": getToken(),
          },
          body: JSON.stringify({
            fecha: new Date(editMeetingData.fecha).toISOString(),
            notas: editMeetingData.notas,
            invitados: editMeetingData.invitados,
          }),
        },
      );
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.mensaje);
      }
      toast.success("Reunión actualizada");
      setShowEditModal(false);
      await cargarMisReuniones();
    } catch (e) {
      toast.error(e.message || "Error al actualizar");
    } finally {
      setGuardandoEdicion(false);
      toast.dismiss(t);
    }
  };

  React.useEffect(() => {
    const fetchClosers = async () => {
      try {
        const token = getToken();
        console.log(
          "Fetching closers with token:",
          token ? "Exists" : "Missing",
        );

        const res = await fetch(`${API_URL}/api/usuarios`, {
          headers: {
            "x-auth-token": token,
          },
        });

        console.log("Closers fetch status:", res.status);

        if (res.ok) {
          const data = await res.json();
          console.log("All Users Data:", data);
          const OCULTAR_USERS = ["brayan", "@brayan", "closer"];
          let closersList = data.filter((u) => {
            const isMe =
              (currentUserId &&
                (String(u.id) === currentUserId ||
                  String(u._id) === currentUserId)) ||
              (currentUser?.usuario &&
                u.usuario &&
                String(currentUser.usuario).toLowerCase() ===
                String(u.usuario).toLowerCase());
            const roleMatch = String(u.rol).toLowerCase() === "vendedor";
            const isHidden = OCULTAR_USERS.includes(
              String(u.usuario || "").toLowerCase(),
            );

            if (isMe) return roleMatch;
            return roleMatch && !isHidden;
          });

          // Garantizar que el usuario actual esté en la lista si es vendedor
          const amIInList = closersList.some(
            (u) =>
              (currentUserId &&
                (String(u.id) === currentUserId ||
                  String(u._id) === currentUserId)) ||
              (currentUser?.usuario &&
                u.usuario &&
                String(currentUser.usuario).toLowerCase() ===
                String(u.usuario).toLowerCase()),
          );
          if (!amIInList && isVendedor) {
            const meInFetch = data.find(
              (u) =>
                (currentUserId &&
                  (String(u.id) === currentUserId ||
                    String(u._id) === currentUserId)) ||
                (currentUser?.usuario &&
                  u.usuario &&
                  String(currentUser.usuario).toLowerCase() ===
                  String(u.usuario).toLowerCase()),
            );
            if (meInFetch) closersList.push(meInFetch);
          }

          console.log("Filtered Closers:", closersList);
          setClosers(closersList);

          // Si el usuario actual es vendedor, autoasigna sus reuniones a sí mismo.
          if (isVendedor && currentUserId) {
            const yo = closersList.find(
              (u) =>
                String(u.id) === currentUserId ||
                String(u._id) === currentUserId ||
                (currentUser?.usuario &&
                  u.usuario &&
                  String(currentUser.usuario).toLowerCase() ===
                  String(u.usuario).toLowerCase()),
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
        const res = await fetch(`${API_URL}/api/vendedor/prospectos`, {
          headers: { "x-auth-token": token },
        });
        if (res.ok) {
          const data = await res.json();
          setProspectos(data);
        }
      } catch (error) {
        console.error("Error fetching prospects:", error);
      }
    };

    const fetchClientes = async () => {
      try {
        const token = getToken();
        const res = await fetch(`${API_URL}/api/vendedor/clientes-ganados`, {
          headers: { "x-auth-token": token },
        });
        if (res.ok) {
          const data = await res.json();
          setClientes(data || []);
        }
      } catch (error) {
        console.error("Error fetching clients:", error);
      }
    };

    const init = async () => {
      try {
        await Promise.all([fetchClosers(), fetchProspectos(), fetchClientes()]);
      } catch (error) {
        console.error("Error en inicialización:", error);
      }
    };
    init();
  }, []);

  // Verificar conexión Google del usuario actual (Vendedor)
  const checkMyConnection = async (isQuiet = false) => {
    if (!isVendedor) return;
    try {
      const res = await fetch(`${API_URL}/api/google/account-info`, {
        headers: { "x-auth-token": getToken() },
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data?.notLinked || data?.connected === false) {
          sessionStorage.removeItem("googleLinkedConfirmed");
          setGoogleLinked(false);
          if (!isQuiet && !sessionStorage.getItem("dismissedSyncPrompt")) {
            setShowSyncPrompt(true);
          }
        } else {
          // Recordar en sesión que el usuario está vinculado para no mostrar modal al volver
          sessionStorage.setItem("googleLinkedConfirmed", "true");
          setGoogleLinked(true);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        // Solo marcar como no vinculado si el error es explícito de vinculación (401 o flag notLinked)
        // Errores 500 / de red se ignoran para evitar falsos positivos
        if (data.notLinked || res.status === 401) {
          sessionStorage.removeItem("googleLinkedConfirmed");
          setGoogleLinked(false);
          // Mostrar prompt pantalla completa SOLO si:
          // 1. No ha sido omitido esta sesión
          // 2. No es una revisión silenciosa (focus / recarga)
          if (!isQuiet && !sessionStorage.getItem("dismissedSyncPrompt")) {
            setShowSyncPrompt(true);
          }
        }
        // Si es un error 500 u otro error temporal, no cambiamos el estado de vinculación
      }
    } catch (err) {
      console.error("Error verificando conexión Google:", err);
      // En error de red, no asumimos desconexión fatal para evitar falsos positivos
    }
  };

  React.useEffect(() => {
    // Si ya sabemos que el usuario estaba vinculado en esta sesión, la verificación inicial es silenciosa
    // Esto evita que el modal aparezca al navegar entre páginas y regresar al calendario
    const wasLinked =
      sessionStorage.getItem("googleLinkedConfirmed") === "true";
    checkMyConnection(wasLinked); // quiet si ya estaba vinculado, ruidoso solo si es primera vez

    // Re-verificar silenciosamente cuando el usuario vuelve a la pestaña
    const handleFocus = () => checkMyConnection(true);
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [isVendedor]);

  // Verificar conexión Google del Closer seleccionado
  React.useEffect(() => {
    if (selectedCloser && closers.length > 0) {
      const closer = closers.find(
        (c) =>
          String(c.id) === String(selectedCloser) ||
          String(c._id) === String(selectedCloser),
      );
      setCloserLinkedToGoogle(!!closer?.googleLinked);
    } else {
      setCloserLinkedToGoogle(true);
    }
  }, [selectedCloser, closers]);

  // Tab and Prospect pre-selection from location state
  useEffect(() => {
    const state = location.state;
    if (!state) return;

    // Tabs switching
    if (state.activeTab) {
      console.log("Setting active tab from state:", state.activeTab);
      setActiveTab(state.activeTab);
    }

    // Prospect selection
    const p = state.prospecto || state.Cliente || state.cliente;
    const idFromState = state.clienteId || (p ? p.id || p._id : null);

    if (idFromState) {
      const sid = String(idFromState);
      setSelectedProspect(sid);
      console.log("Pre-selecting prospect ID:", sid);
    }
  }, [location.state]);

  // Ensure prospect stays selected when list loads (for async robustness)
  useEffect(() => {
    const idFromState =
      location.state?.clienteId ||
      location.state?.prospecto?.id ||
      location.state?.prospecto?._id ||
      location.state?.Cliente?.id ||
      location.state?.Cliente?._id;

    if (idFromState && prospectos.length > 0 && !selectedProspect) {
      setSelectedProspect(String(idFromState));
    }
  }, [prospectos, location.state]);

  const fetchAvailability = async () => {
    if (!selectedCloser) {
      setBusySlots([]);
      setCloserLinkedToGoogle(true);
      return;
    }

    const closer = closers.find(
      (c) => String(c.id || c._id) === String(selectedCloser),
    );
    if (closer && !closer.googleRefreshToken && !closer.googleAccessToken) {
      setCloserLinkedToGoogle(false);
      setBusySlots([]);
      return;
    }

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const timeMin = new Date(year, month, 1).toISOString();
    const timeMax = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

    try {
      const token = getToken();
      const res = await fetch(
        `${API_URL}/api/google/freebusy/${selectedCloser}?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&_t=${Date.now()}`,
        {
          headers: { "x-auth-token": token },
          cache: "no-store",
        },
      );

      const data = await res.json();
      if (!res.ok) {
        if (data.notLinked) setCloserLinkedToGoogle(false);
        setBusySlots([]);
      } else if (data.notLinked) {
        setCloserLinkedToGoogle(false);
        setBusySlots([]);
      } else {
        setCloserLinkedToGoogle(true);
        const allBusy = Object.values(data.calendars || {}).flatMap(
          (cal) => cal.busy || [],
        );
        setBusySlots(
          allBusy.map((b) => ({
            start: new Date(b.start),
            end: new Date(b.end),
          })),
        );
      }
    } catch {
      setBusySlots([]);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, [selectedCloser, currentDate, closers]);

  useEffect(() => {
    // En rol vendedor, mantener asignación por defecto a sí mismo si aún no está elegida.
    if (!isVendedor || selectedCloser || !currentUserId || closers.length === 0)
      return;
    const yo = closers.find(
      (u) =>
        String(u.id) === currentUserId ||
        String(u._id) === currentUserId ||
        (currentUser?.usuario &&
          u.usuario &&
          String(currentUser.usuario).toLowerCase() ===
          String(u.usuario).toLowerCase()),
    );
    if (yo) setSelectedCloser(String(yo.id || yo._id));
  }, [
    isVendedor,
    selectedCloser,
    currentUserId,
    closers,
    currentUser?.usuario,
  ]);

  useEffect(() => {
    cargarMisReuniones();
    cargarMisEventosGoogle();
  }, [isVendedor, currentDate, googleLinked]);

  const generateSlotsForDay = (date) => {
    if (!date) return [];
    if (date.getDay() === 0) return []; // Sunday off

    const slots = [];
    let current = new Date(date);
    current.setHours(6, 0, 0, 0); // Start 6:00 AM

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 0, 0); // End 11:59 PM

    while (current < endOfDay) {
      const slotStart = new Date(current);
      const slotEnd = new Date(current.getTime() + 30 * 60000); // 30 mins

      if (slotEnd <= endOfDay) {
        const isBusy = busySlots.some((busy) => {
          return slotStart < busy.end && slotEnd > busy.start;
        });

        // We always push the slot, but we mark it as isBusy so we can render it grayed out
        slots.push({ start: slotStart, end: slotEnd, isBusy });
      }
      current.setTime(slotEnd.getTime());
    }
    return slots;
  };

  const getDayStats = (date) => {
    if (!date) return { crm: 0, google: 0 };
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const crmCount = misReuniones.filter((r) => {
      const d = new Date(r.fecha);
      return d >= start && d <= end;
    }).length;

    const googleCount = googleEvents.filter((evt) => {
      if (!evt.start || (!evt.start.dateTime && !evt.start.date)) return false;
      const d = evt.start.dateTime
        ? new Date(evt.start.dateTime)
        : new Date(evt.start.date + "T00:00:00");
      if (d < start || d > end) return false;
      // Filter CRM duplicates
      const isCRM =
        (evt.description &&
          (evt.description.includes("[ID Actividad:") ||
            evt.description.includes("[SISTEMA-CRM]"))) ||
        (evt.summary &&
          (evt.summary.includes("Próxima reunión agendada:") ||
            evt.summary.includes("[CITA]") ||
            evt.summary.includes("[CITA AGENDADA]")));
      return !isCRM;
    }).length;

    return { crm: crmCount, google: googleCount };
  };

  const combinedDayEvents = useMemo(() => {
    if (!selectedDate) return [];

    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const merged = [];

    // Add CRM Meetings
    misReuniones.forEach((r) => {
      const d = new Date(r.fecha);
      if (d >= startOfDay && d <= endOfDay) {
        merged.push({
          type: "crm",
          id: r.id,
          date: d,
          raw: r,
          title: `${r.cliente?.nombres || "Cliente"} ${r.cliente?.apellidoPaterno || ""}`,
          description: r.notas,
          meet: r.googleMeetLink,
        });
      }
    });

    // Add Google Events
    googleEvents.forEach((evt) => {
      if (!evt.start || (!evt.start.dateTime && !evt.start.date)) return;
      // Manejar eventos de todo el día si es start.date (se asignan a las 00:00)
      const d = evt.start.dateTime
        ? new Date(evt.start.dateTime)
        : new Date(evt.start.date + "T00:00:00");

      if (d >= startOfDay && d <= endOfDay) {
        // Filtramos las citas de CRM creadas por el sistema para no duplicarlas.
        const isCRM =
          (evt.description &&
            (evt.description.includes("[ID Actividad:") ||
              evt.description.includes("[SISTEMA-CRM]"))) ||
          (evt.summary &&
            (evt.summary.includes("Próxima reunión agendada:") ||
              evt.summary.includes("[CITA]") ||
              evt.summary.includes("[CITA AGENDADA]")));

        if (!isCRM) {
          merged.push({
            type: "google",
            id: evt.id,
            date: d,
            raw: evt,
            title: evt.summary || "(Evento sin título)",
            description: evt.description,
            meet: evt.hangoutLink || evt.conferenceData?.entryPoints?.[0]?.uri,
            htmlLink: evt.htmlLink,
          });
        }
      }
    });

    // Ordenar por hora
    merged.sort((a, b) => a.date - b.date);
    return merged;
  }, [selectedDate, misReuniones, googleEvents]);

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
    for (let day = 1; day <= daysInMonth; day++)
      days.push(new Date(year, month, day));
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

  const previousMonth = () =>
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1),
    );
  const nextMonth = () =>
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1),
    );

  const addInvitadoLocal = () => {
    if (!invitadoInput) return;
    const normalized = invitadoInput.trim().toLowerCase();
    if (normalized && !formData.invitados.includes(normalized)) {
      setFormData({
        ...formData,
        invitados: [...formData.invitados, normalized],
      });
      setInvitadoInput("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBookingCheck(null);
    setCreatedEventLink(null);

    const closer = closers.find(
      (c) => String(c.id || c._id) === String(selectedCloser),
    );
    if (!closer) {
      toast.error("Selecciona un vendedor");
      return;
    }

    // Buscar en la lista correcta según el tipo de contacto
    const sourceList = contactType === "cliente" ? clientes : prospectos;
    const prospect = sourceList.find(
      (p) => String(p.id || p._id) === String(selectedProspect),
    );
    if (!prospect) {
      toast.error(contactType === "cliente" ? "Selecciona un cliente" : "Selecciona un prospecto");
      return;
    }

    const loadingToast = toast.loading(
      "Agendando cita y creando sala virtual...",
    );

    try {
      if (!selectedTimeSlot)
        throw new Error("Selecciona un horario disponible");

      const startDateTime = selectedTimeSlot.start;

      const resBackend = await fetch(
        `${API_URL}/api/vendedor/agendar-reunion`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-auth-token": getToken(),
          },
          body: JSON.stringify({
            clienteId: prospect.id,
            closerId: selectedCloser,
            fechaReunion: startDateTime.toISOString(),
            notas: formData.notas,
            invitados: formData.invitados,
          }),
        },
      );

      let dataBackend = null;
      const rawBody = await resBackend.text();
      if (rawBody) {
        try {
          dataBackend = JSON.parse(rawBody);
        } catch {
          throw new Error("Respuesta inválida del servidor al agendar la cita");
        }
      }
      if (!resBackend.ok) {
        if (dataBackend?.code === "google_config_error") {
          throw new Error(
            `Error de configuración Google: ${dataBackend.googleError?.message || dataBackend.msg}. Revisa los permisos en Ajustes.`,
          );
        }
        throw new Error(dataBackend?.msg || "Error al agendar cita");
      }

      if (!dataBackend?.actividad && !dataBackend?.cliente) {
        throw new Error("La cita no se confirmó correctamente en el servidor");
      }

      toast.success("Cita agendada con éxito");

      const finalLink = dataBackend.hangoutLink || dataBackend.meetLink;
      if (finalLink) {
        setCreatedEventLink(finalLink);
      } else {
        toast("Cita guardada en CRM. No se generó enlace de Google Meet.");
      }

      // Si venimos de un flujo de llamada, registrar la acción en el historial
      if (location.state?.fromCall) {
        try {
          const rolePath = "vendedor";

          await fetch(`${API_URL}/api/${rolePath}/registrar-actividad`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-auth-token": getToken(),
            },
            body: JSON.stringify({
              clienteId: prospect.id,
              tipo: "llamada",
              resultado: "exitoso",
              notas: "Agendó reunión",
            }),
          });
          console.log("Call activity registered from deferred flow");
        } catch (err) {
          console.error("Error registering deferred call activity:", err);
        }
      }

      // ⚡ Refresco Inmediato
      const reunionesActualizadas = await cargarMisReuniones();
      await cargarMisEventosGoogle();
      await fetchAvailability();

      const actividadId = String(
        dataBackend?.actividad?.id || dataBackend?.actividad?._id || "",
      );
      const encontroEnAgenda = actividadId
        ? reunionesActualizadas.some(
          (r) => String(r.id || r._id) === actividadId,
        )
        : false;

      if (encontroEnAgenda) {
        setBookingCheck({
          type: "success",
          message: "Reunion confirmada y visible en tu agenda.",
        });
      } else {
        setBookingCheck({
          type: "warning",
          message:
            "Reunion guardada, pero aun no aparece en lista. Recarga la agenda en unos segundos.",
        });
      }

      toast.dismiss(loadingToast);
      setFormData({ notas: "", invitados: [] });
      setInvitadoInput("");
      setSelectedTimeSlot(null);
      // We can optionally unset prospect string leaving closer alone for next booking.
      setSelectedProspect("");
    } catch (error) {
      console.error(error);
      toast.dismiss(loadingToast);
      setBookingCheck({
        type: "error",
        message: error.message || "No se pudo agendar la cita",
      });
      toast.error(error.message || "Error al agendar la cita");
    }
  };

  // ── MODALES ───────────────────────────────────────────────────────────
  const OUTCOMES = [
    {
      id: "venta",
      label: "Venta Cerrada",
      emoji: "🏆",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-700",
    },
    {
      id: "cotizacion",
      label: "Propuesta Enviada",
      emoji: "📄",
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-700",
    },
    {
      id: "otra_reunion",
      label: "Reagendar",
      emoji: "📅",
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-700",
    },
    {
      id: "no_asistio",
      label: "No Asistió",
      emoji: "👻",
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-700",
    },
    {
      id: "no_venta",
      label: "No Interesado",
      emoji: "❌",
      bg: "bg-slate-50",
      border: "border-slate-200",
      text: "text-slate-600",
    },
  ];

  const ResultModal = () => {
    if (!showResultModal || !selectedMeetingForResult) return null;
    const cliente = selectedMeetingForResult?.cliente;
    return (
      <div
        className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4"
        style={{
          background: "rgba(15,23,42,0.55)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div
          className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
          style={{ animation: "slideUp 0.25s cubic-bezier(.16,1,.3,1)" }}
        >
          <div className="px-6 pt-6 pb-4 flex justify-between items-start border-b border-slate-50">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-0.5">
                Registrar resultado
              </p>
              <h3 className="text-lg font-black text-slate-900">
                {cliente?.nombres} {cliente?.apellidoPaterno}
              </h3>
              {cliente?.empresa && (
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  {cliente.empresa}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowResultModal(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors mt-0.5"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
          <div className="px-5 pt-4 pb-2 grid grid-cols-2 gap-2">
            {OUTCOMES.map((o) => (
              <button
                key={o.id}
                onClick={() => {
                  registrarResultado(
                    selectedMeetingForResult,
                    o.id,
                    resultNotes,
                  );
                  setShowResultModal(false);
                }}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border ${o.bg} ${o.border} ${o.text} font-bold text-xs transition-all hover:scale-[1.02] active:scale-[0.98] text-left`}
              >
                <span className="text-xl">{o.emoji}</span>
                <span>{o.label}</span>
              </button>
            ))}
          </div>
          <div className="px-5 pt-3 pb-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Notas (opcional)
            </p>
            <textarea
              value={resultNotes}
              onChange={(e) => setResultNotes(e.target.value)}
              placeholder="Agrega detalles importantes de la reunión..."
              className="w-full text-sm p-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none bg-slate-50/50"
              rows={3}
            />
          </div>
          <div className="px-5 pb-5 pt-2">
            <button
              onClick={() => setShowResultModal(false)}
              className="w-full py-2.5 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  };

  const EditMeetingModal = () => {
    if (!showEditModal || !selectedMeetingForEdit) return null;
    return (
      <div
        className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4"
        style={{
          background: "rgba(15,23,42,0.55)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div
          className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
          style={{ animation: "slideUp 0.25s cubic-bezier(.16,1,.3,1)" }}
        >
          <div className="px-6 pt-6 pb-4 flex justify-between items-start border-b border-slate-50">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-0.5">
                Editar reunión
              </p>
              <h3 className="text-lg font-black text-slate-900">
                {selectedMeetingForEdit?.cliente?.nombres}{" "}
                {selectedMeetingForEdit?.cliente?.apellidoPaterno}
              </h3>
            </div>
            <button
              onClick={() => setShowEditModal(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
          <div className="px-5 pt-4 space-y-4 pb-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                Fecha y hora
              </label>
              <input
                type="datetime-local"
                value={editMeetingData.fecha}
                onChange={(e) =>
                  setEditMeetingData({
                    ...editMeetingData,
                    fecha: e.target.value,
                  })
                }
                className="w-full p-3 text-sm border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-300 bg-slate-50/50"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                Invitados
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="email"
                  value={editInvitadoInput}
                  onChange={(e) => setEditInvitadoInput(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="flex-1 p-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 bg-slate-50/50"
                />
                <button
                  onClick={() => {
                    if (
                      editInvitadoInput &&
                      !editMeetingData.invitados.includes(editInvitadoInput)
                    ) {
                      setEditMeetingData({
                        ...editMeetingData,
                        invitados: [
                          ...editMeetingData.invitados,
                          editInvitadoInput,
                        ],
                      });
                      setEditInvitadoInput("");
                    }
                  }}
                  className="px-3 bg-slate-900 text-white rounded-xl text-xs font-bold"
                >
                  +
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {editMeetingData.invitados?.map((inv, idx) => (
                  <span
                    key={idx}
                    className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-600 border border-slate-200"
                  >
                    {inv}
                    <X
                      className="w-2.5 h-2.5 cursor-pointer hover:text-red-500"
                      onClick={() =>
                        setEditMeetingData({
                          ...editMeetingData,
                          invitados: editMeetingData.invitados.filter(
                            (i) => i !== inv,
                          ),
                        })
                      }
                    />
                  </span>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                Notas
              </label>
              <textarea
                value={editMeetingData.notas}
                onChange={(e) =>
                  setEditMeetingData({
                    ...editMeetingData,
                    notas: e.target.value,
                  })
                }
                placeholder="Notas o ajustes sobre el cambio..."
                rows={3}
                className="w-full p-3 text-sm border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none bg-slate-50/50"
              />
            </div>
          </div>
          <div className="px-5 pb-6 flex gap-3">
            <button
              onClick={() => setShowEditModal(false)}
              className="flex-1 py-3 text-sm font-bold text-slate-500 border border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleActualizarReunion}
              disabled={guardandoEdicion}
              className="flex-1 py-3 text-sm font-bold text-white bg-slate-900 rounded-2xl hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {guardandoEdicion ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const SyncPromptModal = () => {
    if (!showSyncPrompt) return null;
    return (
      <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/40">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden transform animate-in zoom-in-95 duration-200">
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-(--theme-50) rounded-full flex items-center justify-center mx-auto mb-6">
              <div className="w-14 h-14 bg-(--theme-500) rounded-2xl flex items-center justify-center rotate-12 shadow-lg shadow-(--theme-500)/30">
                <LinkIcon className="w-8 h-8 text-white -rotate-12" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">
              Vincula tu Calendario
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-8">
              Para poder crear salas de{" "}
              <span className="font-bold text-slate-700">Google Meet</span> y
              gestionar tus citas automáticamente, necesitamos conectar con tu
              cuenta de Google.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate("/vendedor/ajustes")}
                className="w-full py-4 bg-(--theme-500) text-white rounded-2xl font-black text-sm hover:bg-[#7cb342] transition-all shadow-lg shadow-(--theme-500)/20"
              >
                IR A VINCULAR AHORA
              </button>
              <button
                onClick={() => {
                  sessionStorage.setItem("dismissedSyncPrompt", "true");
                  setShowSyncPrompt(false);
                }}
                className="w-full py-3 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
              >
                Omitir por ahora
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col md:p-5 overflow-hidden -mx-4 -mt-4 md:m-0">
      <ResultModal />
      <EditMeetingModal />
      <SyncPromptModal />
      <div className="flex-1 flex flex-col space-y-4 overflow-hidden min-h-0 bg-white md:bg-transparent">
        {/* Main Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-0 md:gap-6 min-h-0">
          {/* Calendar Section (Left Side - 2 Cols) */}
          <div className="lg:col-span-2 flex flex-col min-h-0">
            <div className="flex-1 bg-white md:border md:border-gray-200 md:rounded-xl p-5 md:p-6 md:shadow-sm flex flex-col min-h-0">
              {/* Header */}
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
                </div>
                <button
                  onClick={nextMonth}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              {/* Calendar Days */}
              <div className="flex-1 flex flex-col min-h-0">
                <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 shrink-0">
                  {DAYS.map((day) => (
                    <div
                      key={day}
                      className="text-center font-bold text-gray-400 text-[10px] sm:text-sm py-1 uppercase tracking-wider"
                    >
                      {day}
                    </div>
                  ))}
                </div>
                <div className="flex-1 grid grid-cols-7 gap-1 sm:gap-2 auto-rows-fr min-h-0">
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
                                                    relative rounded-2xl transition-all border flex items-center justify-center p-1 md:p-2 min-h-[44px] md:min-h-[72px] aspect-square md:aspect-auto
                                                    ${!date ? "bg-transparent border-transparent cursor-default select-none" : ""}
                                                    ${date && !selectedCloser ? "opacity-40 cursor-not-allowed bg-slate-50 border-slate-100" : ""}
                                                    ${date && selectedCloser && !isSelected ? "bg-white border-slate-200 hover:border-(--theme-500)/50 hover:shadow-sm text-slate-700" : ""}
                                                    ${isSelected ? "bg-(--theme-500) text-white shadow-lg shadow-(--theme-500)/30 scale-105 border-(--theme-500) z-20" : ""}
                                                    ${isTodayDate && !isSelected ? "bg-(--theme-50) border-(--theme-200) text-(--theme-700)" : ""}
                                                    ${isTodayDate && !isSelected ? 'after:content-["HOY"] after:absolute after:top-1 lg:after:top-1.5 after:right-1 lg:after:right-1.5 after:text-[6px] lg:after:text-[8px] after:font-black after:text-(--theme-500) after:bg-white after:px-1 after:py-0.5 after:rounded-sm after:shadow-sm' : ""}
                                                `}
                      >
                        <span
                          className={`text-sm md:text-2xl font-black leading-none select-none ${isSelected ? "text-white" : ""}`}
                        >
                          {date ? date.getDate() : ""}
                        </span>
                        {date && date.getDay() !== 0 && (
                          <div className="absolute bottom-1.5 w-full flex justify-center pointer-events-none px-1">
                            {(() => {
                              if (!selectedCloser) return null;
                              const stats = getDayStats(date);

                              if (stats.crm === 0 && stats.google === 0)
                                return null;
                              return (
                                <div className="flex gap-1 items-center justify-center">
                                  {stats.crm > 0 && (
                                    <div className="flex items-center">
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-(--theme-500)"} shadow-sm`}
                                      />
                                      {stats.crm > 1 && (
                                        <span
                                          className={`text-[8px] font-black ml-0.5 ${isSelected ? "text-white" : "text-slate-400"}`}
                                        >
                                          {stats.crm}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {stats.google > 0 && (
                                    <div className="flex items-center">
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white/50" : "bg-blue-400"} shadow-sm`}
                                      />
                                      {stats.google > 1 && (
                                        <span
                                          className={`text-[8px] font-black ml-0.5 ${isSelected ? "text-white" : "text-slate-400"}`}
                                        >
                                          {stats.google}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
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
            <div className="flex-1 bg-white border-t border-slate-100 md:border md:border-gray-200 md:rounded-xl p-5 md:p-4 md:shadow-sm flex flex-col overflow-hidden">
              {/* Tabs Headers */}
              <div className="flex border-b border-gray-100 mb-4 shrink-0">
                <button
                  onClick={() => setActiveTab("agenda")}
                  className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === "agenda" ? "border-(--theme-500) text-(--theme-600)" : "border-transparent text-slate-400 hover:text-slate-600"}`}
                >
                  Agenda
                </button>
                <button
                  onClick={() => setActiveTab("agendar")}
                  className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === "agendar" ? "border-(--theme-500) text-(--theme-600)" : "border-transparent text-slate-400 hover:text-slate-600"}`}
                >
                  Agendar
                </button>
              </div>

              <div
                className={`flex-1 flex flex-col min-h-0 ${activeTab === "agendar" ? "overflow-hidden" : "overflow-y-auto"} pr-1`}
                style={{ scrollbarWidth: "thin" }}
              >
                {activeTab === "agendar" ? (
                  <div className="animate-in fade-in slide-in-from-right-2 duration-200 flex-1 flex flex-col min-h-0">
                    <div className="flex flex-col flex-1 min-h-0 space-y-4 px-1">
                      {/* ── HEADER ───────────────────────── */}
                      <div className="shrink-0 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-(--theme-50) text-(--theme-600) rounded-lg border border-(--theme-100)">
                              <CalendarIcon className="w-4 h-4" />
                            </span>
                            <h3 className="text-sm font-black text-slate-800 tracking-tight">Agendar Cita</h3>
                          </div>
                          <p className="text-[10px] font-bold text-(--theme-500) uppercase tracking-wider mt-1 ml-0.5">
                            {selectedDate.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "short" }).toUpperCase()}
                          </p>
                        </div>
                        {selectedCloser && !closerLinkedToGoogle && (
                          <div className="px-2 py-1 bg-amber-50 border border-amber-100 rounded-lg flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-amber-500" />
                            <span className="text-[8px] font-black text-amber-600 uppercase tracking-tighter">SIN SYNC</span>
                          </div>
                        )}
                      </div>

                      {/* Toggle Prospecto / Cliente — simple */}
                      <div className="shrink-0 flex gap-1 border-b border-slate-100 pb-0">
                        <button
                          type="button"
                          onClick={() => { setContactType("prospecto"); setSelectedProspect(""); }}
                          className={`px-3 py-2 text-xs font-bold transition-all border-b-2 -mb-px ${
                            contactType === "prospecto"
                              ? "border-(--theme-500) text-(--theme-600)"
                              : "border-transparent text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          Prospecto
                        </button>
                        <button
                          type="button"
                          onClick={() => { setContactType("cliente"); setSelectedProspect(""); }}
                          className={`px-3 py-2 text-xs font-bold transition-all border-b-2 -mb-px ${
                            contactType === "cliente"
                              ? "border-(--theme-500) text-(--theme-600)"
                              : "border-transparent text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          Cliente
                        </button>
                      </div>

                      <form
                        onSubmit={handleSubmit}
                        className="flex-1 flex flex-col min-h-0 space-y-3 pb-2 pr-1 custom-scrollbar overflow-y-auto"
                      >
                        {/* 1. Selección de contacto + closer */}
                        <div className="space-y-2.5 shrink-0">
                          {/* Contacto */}
                          <div>
                            <label className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-0.5">
                              {contactType === "cliente" ? <Briefcase className="w-3 h-3 text-(--theme-500)" /> : <User className="w-3 h-3 text-(--theme-500)" />}
                              {contactType === "cliente" ? "Cliente" : "Prospecto"}
                            </label>
                            <div className="relative">
                              <select
                                value={selectedProspect}
                                onChange={(e) => setSelectedProspect(e.target.value)}
                                className="w-full h-10 pl-3 pr-8 text-[11px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-(--theme-500)/20 focus:border-(--theme-500) outline-none transition-all cursor-pointer appearance-none"
                                required
                              >
                                <option value="" disabled>
                                  {contactType === "cliente" ? "Seleccionar cliente..." : "Seleccionar prospecto..."}
                                </option>
                                {(contactType === "cliente" ? clientes : prospectos).map((p) => (
                                  <option key={p.id || p._id} value={p.id || p._id}>
                                    {p.nombres} {p.apellidoPaterno ? p.apellidoPaterno.charAt(0) + "." : ""}
                                    {p.empresa ? ` — ${p.empresa}` : ""}
                                  </option>
                                ))}
                              </select>
                              <ChevronRight className="w-3 h-3 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                            </div>
                            {contactType === "cliente" && clientes.length === 0 && (
                              <p className="text-[9px] text-amber-500 font-bold mt-1 ml-1">No hay clientes ganados registrados aún.</p>
                            )}
                            {contactType === "prospecto" && prospectos.length === 0 && (
                              <p className="text-[9px] text-amber-500 font-bold mt-1 ml-1">No hay prospectos disponibles.</p>
                            )}
                          </div>

                          {/* Closer / Responsable + Invitados — misma fila */}
                          <div className="grid grid-cols-2 gap-2">
                            {/* Closer */}
                            <div>
                              <label className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-0.5">
                                <Users className="w-3 h-3 text-(--theme-500)" />
                                {currentUser?.rol === "vendedor" ? "Responsable" : "Closer"}
                              </label>
                              <div className="relative">
                                <select
                                  value={selectedCloser}
                                  onChange={(e) => setSelectedCloser(e.target.value)}
                                  className="w-full h-9 pl-2.5 pr-7 text-[10px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-(--theme-500)/20 focus:border-(--theme-500) outline-none transition-all cursor-pointer appearance-none"
                                  required
                                >
                                  <option value="" disabled>Seleccionar...</option>
                                  {closers.map((c) => (
                                    <option key={c.id || c._id} value={c.id || c._id}>
                                      {c.nombre}
                                    </option>
                                  ))}
                                </select>
                                <ChevronRight className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                              </div>
                            </div>

                            {/* Invitados */}
                            <div>
                              <label className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-0.5">
                                <UserPlus className="w-3 h-3 text-(--theme-500)" />
                                Invitados
                              </label>
                              <div className="flex gap-1.5">
                                <input
                                  type="email"
                                  value={invitadoInput}
                                  onChange={(e) => setInvitadoInput(e.target.value)}
                                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addInvitadoLocal())}
                                  placeholder="correo@..."
                                  className="flex-1 h-9 px-2.5 text-[10px] font-medium border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-(--theme-500)/30 outline-none transition-all min-w-0"
                                />
                                <button
                                  type="button"
                                  onClick={addInvitadoLocal}
                                  className="w-9 h-9 shrink-0 flex items-center justify-center bg-(--theme-500) text-white rounded-xl hover:bg-(--theme-600) transition-all"
                                >
                                  <UserPlus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              {/* Pills de invitados agregados */}
                              {formData.invitados.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {formData.invitados.map((inv, idx) => (
                                    <span
                                      key={idx}
                                      className="flex items-center gap-1 px-1.5 py-0.5 bg-white text-slate-600 rounded text-[8px] font-bold border border-slate-200"
                                    >
                                      {inv.split("@")[0]}
                                      <X
                                        className="w-2 h-2 cursor-pointer hover:text-red-500"
                                        onClick={() =>
                                          setFormData({
                                            ...formData,
                                            invitados: formData.invitados.filter((i) => i !== inv),
                                          })
                                        }
                                      />
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 3. Horarios Grid (Compacto) */}
                        <div className="shrink-0">
                          <label className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                            <Clock className="w-3 h-3" /> Horarios Disponibles
                          </label>
                          <div className="grid grid-cols-3 gap-1.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                            {selectedDate && selectedDate.getDay() !== 0 ? (
                              generateSlotsForDay(selectedDate).length > 0 ? (
                                generateSlotsForDay(selectedDate).map(
                                  (slot, idx) => {
                                    const timeStr =
                                      slot.start.toLocaleTimeString("es-ES", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      });
                                    const isSelected =
                                      selectedTimeSlot?.start.getTime() ===
                                      slot.start.getTime();
                                    return (
                                      <button
                                        key={idx}
                                        type="button"
                                        disabled={slot.isBusy}
                                        onClick={() =>
                                          !slot.isBusy &&
                                          setSelectedTimeSlot(slot)
                                        }
                                        className={`w-full py-1.5 border rounded-lg text-[10px] font-bold text-center transition-all duration-150
                                          ${slot.isBusy
                                            ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed line-through"
                                            : isSelected
                                              ? "bg-(--theme-600) border-(--theme-600) text-white shadow-md ring-1 ring-white ring-offset-1"
                                              : "bg-white border-slate-200 text-slate-600 hover:border-(--theme-500) hover:text-(--theme-600) hover:bg-(--theme-50)"
                                          }`}
                                      >
                                        {timeStr}
                                      </button>
                                    );
                                  },
                                )
                              ) : (
                                <div className="col-span-3 text-[10px] text-slate-400 text-center py-6 bg-slate-50/50 rounded-2xl italic border border-dashed border-slate-200 flex flex-col items-center justify-center gap-2">
                                  <VideoOff className="w-4 h-4 opacity-30" />
                                  Sin horarios disponibles
                                </div>
                              )
                            ) : (
                              <div className="col-span-3 text-[10px] text-slate-400 text-center py-6 bg-slate-50/50 rounded-2xl italic border border-dashed border-slate-200">
                                Día festivo / descanso
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 4. Notas y Pie (Compacto) */}
                        <div className="shrink-0 space-y-3">
                          <div>
                            <label className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                              <FileText className="w-3 h-3 text-slate-300" />{" "}
                              Notas
                            </label>
                            <textarea
                              value={formData.notas}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  notas: e.target.value,
                                })
                              }
                              rows="2"
                              className="w-full p-2.5 text-[10px] font-medium border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-(--theme-500)/20 focus:border-(--theme-500) outline-none transition-all resize-none placeholder:text-slate-300"
                              placeholder="Agrega contexto, agenda o instrucciones para la reunión..."
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={!selectedTimeSlot || !selectedProspect}
                            className="w-full py-3.5 px-4 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all disabled:opacity-40 disabled:grayscale disabled:shadow-none disabled:cursor-not-allowed"
                            style={{
                              background: (!selectedTimeSlot || !selectedProspect)
                                ? undefined
                                : "linear-gradient(135deg, var(--theme-600) 0%, var(--theme-500) 100%)",
                              color: "white",
                              boxShadow: (!selectedTimeSlot || !selectedProspect) ? "none" : "0 8px 24px -4px color-mix(in srgb, var(--theme-500) 35%, transparent)",
                            }}
                          >
                            {selectedTimeSlot
                              ? `✓ Confirmar · ${selectedTimeSlot.start.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`
                              : "Selecciona un horario primero"}
                          </button>

                          {createdEventLink && (
                            <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-2xl flex flex-col items-center animate-in zoom-in-95">
                              <div className="flex items-center gap-2 text-blue-700 mb-2">
                                <LinkIcon className="w-4 h-4" />
                                <p className="font-black text-[9px] uppercase tracking-wider text-blue-800">
                                  Meet Generado
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(
                                    createdEventLink,
                                  );
                                  toast.success("Enlace de Meet copiado");
                                }}
                                className="w-full py-2 bg-white border border-blue-200 text-blue-600 rounded-xl hover:bg-blue-50 font-black text-[10px] flex items-center justify-center gap-2 shadow-sm transition-all"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                COPIAR ENLACE
                              </button>
                            </div>
                          )}

                          {bookingCheck && (
                            <div
                              className={`p-3 rounded-2xl border text-[11px] font-bold ${bookingCheck.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : bookingCheck.type === "warning" ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-rose-50 border-rose-200 text-rose-700"}`}
                            >
                              {bookingCheck.message}
                            </div>
                          )}
                        </div>
                      </form>
                    </div>
                  </div>
                ) : (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="flex items-center justify-between mb-5 bg-white sticky top-0 z-10 py-1 border-b border-slate-100">
                      <div className="flex flex-col">
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">
                          Agenda{" "}
                          <span className="text-(--theme-500) font-bold ml-1">
                            {selectedDate.toLocaleDateString("es-ES", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          Planificación del día
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          cargarMisReuniones();
                          cargarMisEventosGoogle();
                        }}
                        className="p-2 text-slate-400 hover:text-(--theme-600) hover:bg-(--theme-50) rounded-xl transition-all"
                        title="Actualizar agenda"
                      >
                        <RefreshCw
                          className={`w-5 h-5 ${loadingMisReuniones || loadingGoogleEvents ? "animate-spin" : ""}`}
                        />
                      </button>
                    </div>

                    {googleLinked === false && (
                      <div className="mb-4 flex flex-col p-3 bg-orange-50 border border-orange-200 rounded-2xl space-y-1 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-2 text-orange-800">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <p className="font-bold text-xs">
                            Calendario no vinculado
                          </p>
                        </div>
                        <p className="text-[10px] text-orange-700 leading-tight">
                          Vincula tu cuenta de Google en{" "}
                          <span className="font-bold">Ajustes &gt; Google</span>{" "}
                          para visualizar eventos y unificar la agenda.
                        </p>
                      </div>
                    )}

                    {loadingMisReuniones || loadingGoogleEvents ? (
                      <div className="flex items-center justify-center p-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-(--theme-500)"></div>
                      </div>
                    ) : combinedDayEvents.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center opacity-70">
                        <CalendarIcon className="w-12 h-12 text-gray-200 mb-3" />
                        <p className="text-sm font-bold text-gray-400">
                          Día sin eventos
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4 pb-6 px-1">
                        {combinedDayEvents.map((evt, eventIdx) => {
                          const fecha = evt.date;

                          if (evt.type === "crm") {
                            const r = evt.raw;
                            const hasMeet = !!r.googleMeetLink;
                            return (
                              <div
                                key={`crm-${r.id}-${eventIdx}`}
                                className="relative group"
                              >
                                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group-hover:border-(--theme-200)">
                                  <div className="p-4 relative">
                                    <div className="absolute top-4 right-4 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg">
                                      <span className="text-[9px] font-black text-slate-500 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />{" "}
                                        {fecha.toLocaleTimeString("en-US", {
                                          hour: "numeric",
                                          minute: "2-digit",
                                          hour12: true,
                                        })}
                                      </span>
                                    </div>

                                    {/* Card Header */}
                                    <div className="flex items-start gap-4 mb-4">
                                      <div className="flex-1 min-w-0">
                                        {/* 1. Title Top */}
                                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">
                                          Reunión con prospecto
                                        </span>

                                        {/* 2. Name + Shortcut */}
                                        <div className="flex items-center gap-2 mb-1">
                                          <h4 className="text-sm font-black text-slate-900 truncate">
                                            {r?.cliente?.nombres}{" "}
                                            {r?.cliente?.apellidoPaterno}
                                          </h4>
                                          <button
                                            onClick={() =>
                                              navigate("/vendedor/prospectos", {
                                                state: { prospecto: r.cliente },
                                              })
                                            }
                                            className="p-1 text-(--theme-500) hover:bg-(--theme-50) rounded transition-colors"
                                            title="Ver panel del prospecto"
                                          >
                                            <ExternalLink className="w-3 h-3.5" />
                                          </button>
                                        </div>

                                        {/* 3. Contact & Company */}
                                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                                          {r?.cliente?.empresa && (
                                            <p className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                              <Briefcase className="w-2.5 h-2.5" />{" "}
                                              {r.cliente.empresa}
                                            </p>
                                          )}
                                          {r.cliente?.correo && (
                                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400">
                                              <Mail className="w-2.5 h-2.5 text-slate-300" />{" "}
                                              {r.cliente.correo}
                                            </div>
                                          )}
                                          {r.cliente?.whatsapp && (
                                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400">
                                              <Phone className="w-2.5 h-2.5 text-slate-300" />{" "}
                                              {r.cliente.whatsapp}
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Mini Actions (Edit/Delete) */}
                                      <div className="flex gap-1 shrink-0">
                                        <button
                                          onClick={() => {
                                            setSelectedMeetingForEdit(r);
                                            setEditMeetingData({
                                              fecha: new Date(r.fecha)
                                                .toISOString()
                                                .slice(0, 16),
                                              notas: r.notas || "",
                                              invitados: r.invitados || [],
                                            });
                                            setShowEditModal(true);
                                          }}
                                          className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                          title="Editar"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() =>
                                            handleEliminarReunion(r.id)
                                          }
                                          className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                          title="Eliminar"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* 4. Invitados Section */}
                                    {(() => {
                                      const guests = r.invitados || [];
                                      // Si no hay invitados adicionales, mostramos al prospecto para que no esté vacío
                                      const finalGuests =
                                        guests.length > 0
                                          ? guests
                                          : r.cliente?.correo
                                            ? [r.cliente.correo]
                                            : [];

                                      if (finalGuests.length === 0) return null;

                                      return (
                                        <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
                                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mr-1">
                                            Invitados:
                                          </p>
                                          {finalGuests.map((inv, idx) => (
                                            <div
                                              key={idx}
                                              className="flex items-center gap-1 px-1.5 py-0.5 bg-(--theme-50) rounded-md border border-(--theme-100) text-[9px] font-bold text-(--theme-700)"
                                              title={inv}
                                            >
                                              <Mail className="w-2 h-2" />
                                              <span className="truncate max-w-[150px]">
                                                {inv}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    })()}

                                    {/* 5. Notes Section */}
                                    {r.notas && (
                                      <div className="mb-1">
                                        <div className="p-2.5 bg-slate-50/70 rounded-lg border border-slate-100">
                                          <p className="text-[10px] font-medium text-slate-500 leading-relaxed italic line-clamp-3">
                                            "{r.notas}"
                                          </p>
                                        </div>
                                      </div>
                                    )}

                                    {/* Footer Actions */}
                                    <div className="flex gap-2 pt-3 border-t border-slate-50">
                                      {/* 50% - Join Meet */}
                                      {hasMeet ? (
                                        <a
                                          href={r.googleMeetLink}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex-2 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                                        >
                                          <VideoIcon className="w-3.5 h-3.5" />{" "}
                                          Meet
                                        </a>
                                      ) : (
                                        <button
                                          disabled
                                          className="flex-2 flex items-center justify-center gap-2 py-2.5 bg-slate-100 text-slate-300 text-[10px] font-black uppercase tracking-wider rounded-lg border border-slate-200 cursor-not-allowed"
                                        >
                                          <VideoOff className="w-3.5 h-3.5" />{" "}
                                          No Link
                                        </button>
                                      )}

                                      {/* 25% - Copy Link */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (hasMeet) {
                                            navigator.clipboard.writeText(
                                              r.googleMeetLink,
                                            );
                                            toast.success(
                                              "Enlace de Meet copiado",
                                            );
                                          }
                                        }}
                                        disabled={!hasMeet}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 ${hasMeet ? "bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200" : "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"} text-[10px] font-black uppercase tracking-wider rounded-lg transition-all border`}
                                        title="Copiar Enlace"
                                      >
                                        <Copy className="w-3.5 h-3.5" />
                                      </button>

                                      {/* 25% - Result */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedMeetingForResult(r);
                                          setResultNotes(r.notas || "");
                                          setShowResultModal(true);
                                        }}
                                        className="flex-1 flex items-center justify-center py-2.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider rounded-lg hover:bg-slate-800 transition-all shadow-md"
                                        title="Registrar Resultado"
                                      >
                                        Res.
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          } else {
                            // Google Event
                            const g = evt.raw;
                            const isVideo = !!evt.meet;
                            return (
                              <div
                                key={`google-${g.id}`}
                                className="relative group"
                              >
                                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                                  <div className="relative p-4">
                                    <div className="absolute top-4 right-4 bg-blue-50 border border-blue-100 px-2 py-1 rounded-lg">
                                      <span className="text-[10px] font-black text-blue-600 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />{" "}
                                        {fecha.toLocaleTimeString("en-US", {
                                          hour: "numeric",
                                          minute: "2-digit",
                                          hour12: true,
                                        })}
                                      </span>
                                    </div>
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex flex-col">
                                        <div className="flex items-center gap-2 mb-1.5">
                                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                                            Personal de Google
                                          </span>
                                        </div>
                                        <h4 className="text-sm font-bold text-slate-700 wrap-break-word pr-20">
                                          {evt.title}
                                        </h4>
                                        {evt.description && (
                                          <p className="text-[11px] font-medium text-slate-400 mt-2 leading-relaxed line-clamp-2">
                                            {evt.description.replace(
                                              /<[^>]*>?/gm,
                                              "",
                                            )}
                                          </p>
                                        )}
                                        {/* Google Attendees Section */}
                                        {g.attendees?.length > 0 && (
                                          <div className="flex items-center gap-1.5 flex-wrap mt-3 mb-1">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mr-1">
                                              Invitados:
                                            </p>
                                            {g.attendees.map((att, idx) => (
                                              <div
                                                key={idx}
                                                className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 rounded-md border border-blue-100 text-[9px] font-bold text-blue-600"
                                                title={att.email}
                                              >
                                                <User className="w-2 h-2" />
                                                <span className="truncate max-w-[120px]">
                                                  {att.email}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-50">
                                      {/* 50% - Join */}
                                      {isVideo ? (
                                        <a
                                          href={evt.meet}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex-2 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-700 transition-all shadow-md"
                                        >
                                          <VideoIcon className="w-3.5 h-3.5" />{" "}
                                          Meet
                                        </a>
                                      ) : (
                                        <button
                                          disabled
                                          className="flex-2 flex items-center justify-center gap-2 py-2.5 bg-slate-100 text-slate-300 text-[9px] font-black uppercase tracking-widest rounded-lg border border-slate-200 cursor-not-allowed"
                                        >
                                          <VideoOff className="w-3.5 h-3.5" />{" "}
                                          No Link
                                        </button>
                                      )}

                                      {/* 25% - Copy */}
                                      <button
                                        onClick={() => {
                                          if (isVideo) {
                                            navigator.clipboard.writeText(
                                              evt.meet,
                                            );
                                            toast.success(
                                              "Enlace de Meet copiado",
                                            );
                                          }
                                        }}
                                        disabled={!isVideo}
                                        className={`flex-1 flex items-center justify-center py-2.5 rounded-lg border transition-all ${isVideo ? "bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100" : "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"}`}
                                        title="Copiar Link"
                                      >
                                        <Copy className="w-3.5 h-3.5" />
                                      </button>

                                      {/* 25% - Calendar */}
                                      <a
                                        href={evt.htmlLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 flex items-center justify-center py-2.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-sm"
                                        title="Ver en Calendar"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
};

export default Calendario;
