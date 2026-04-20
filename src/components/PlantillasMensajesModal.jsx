import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FileText, Copy, MessageSquare, Mail, Plus, Trash2, X, ExternalLink } from 'lucide-react';
import API_URL from '../config/api';
import { getToken, getUser } from '../utils/authUtils';

const getAuthHeaders = () => ({ 'x-auth-token': getToken() || '' });

const normalizePhone = (value) => String(value || '').replace(/\D/g, '');

const applyTemplate = (text, contacto) => {
  const user = getUser();
  const replacements = {
    '{{nombre}}': String(contacto?.nombres || '').trim(),
    '{{empresa}}': String(contacto?.empresa || '').trim(),
    '{{telefono}}': String(contacto?.telefono || '').trim(),
    '{{correo}}': String(contacto?.correo || '').trim(),
    '{{etapa}}': String(contacto?.etapaEmbudo || '').trim(),
    '{{vendedor}}': String(user?.nombre || '').trim(),
    '{{fecha_hoy}}': new Date().toLocaleDateString('es-MX')
  };

  return Object.entries(replacements).reduce((acc, [k, v]) => acc.split(k).join(v), text || '');
};

export default function PlantillasMensajesModal({ contacto, scope = 'prospecto' }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({ nombre: '', canal: 'general', contenido: '' });
  const [saving, setSaving] = useState(false);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ scope });
      const res = await axios.get(`${API_URL}/api/plantillas?${params.toString()}`, { headers: getAuthHeaders() });
      setTemplates(res.data || []);
      if (!selectedId && res.data?.length) setSelectedId(res.data[0].id);
    } catch (error) {
      toast.error(error?.response?.data?.mensaje || 'No se pudieron cargar plantillas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadTemplates();
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) =>
      String(t.nombre || '').toLowerCase().includes(q) || String(t.contenido || '').toLowerCase().includes(q)
    );
  }, [templates, query]);

  const selected = filtered.find((t) => String(t.id) === String(selectedId)) || filtered[0] || null;
  const rendered = applyTemplate(selected?.contenido || '', contacto);

  const copyToClipboard = async (content) => {
    if (!content.trim()) return;
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Mensaje copiado');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const createTemplate = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.contenido.trim()) {
      toast.error('Nombre y contenido son requeridos');
      return;
    }

    setSaving(true);
    try {
      await axios.post(`${API_URL}/api/plantillas`, {
        nombre: form.nombre.trim(),
        canal: form.canal,
        scope,
        contenido: form.contenido
      }, { headers: getAuthHeaders() });
      setForm({ nombre: '', canal: 'general', contenido: '' });
      toast.success('Plantilla creada');
      loadTemplates();
    } catch (error) {
      toast.error(error?.response?.data?.mensaje || 'No se pudo crear plantilla');
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (id) => {
    if (!window.confirm('¿Eliminar esta plantilla?')) return;
    try {
      await axios.delete(`${API_URL}/api/plantillas/${id}`, { headers: getAuthHeaders() });
      toast.success('Plantilla eliminada');
      if (String(selectedId) === String(id)) setSelectedId(null);
      loadTemplates();
    } catch (error) {
      toast.error(error?.response?.data?.mensaje || 'No se pudo eliminar');
    }
  };

  const waNumber = normalizePhone(contacto?.telefono || contacto?.telefono2 || '');
  const waUrl = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(rendered)}` : '';
  const mailUrl = contacto?.correo
    ? `mailto:${contacto.correo}?subject=${encodeURIComponent('Seguimiento')}&body=${encodeURIComponent(rendered)}`
    : '';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-8 w-8 inline-flex items-center justify-center rounded-md bg-indigo-50 hover:bg-indigo-100 transition-colors shadow-xs border border-indigo-100"
        title="Plantillas de mensajes"
      >
        <FileText className="w-4.5 h-4.5 text-indigo-600" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[1200] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="font-black text-slate-800 tracking-tight">Plantillas de Mensajes</div>
              <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] min-h-[560px]">
              <div className="border-r border-slate-100 p-4 space-y-3">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar plantilla"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />

                <div className="space-y-2 max-h-[300px] overflow-auto pr-1">
                  {loading ? (
                    <div className="text-sm text-slate-500">Cargando plantillas...</div>
                  ) : filtered.length === 0 ? (
                    <div className="text-sm text-slate-500">Sin plantillas</div>
                  ) : (
                    filtered.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedId(t.id)}
                        className={`w-full text-left p-3 rounded-lg border ${String(selected?.id) === String(t.id) ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold text-sm text-slate-800 truncate">{t.nombre}</div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTemplate(t.id);
                            }}
                            className="p-1 rounded hover:bg-rose-100 text-rose-600"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex gap-2 items-center">
                          {t.canal === 'whatsapp' && <MessageSquare className="w-3 h-3" />}
                          {t.canal === 'correo' && <Mail className="w-3 h-3" />}
                          <span>{t.canal}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <form onSubmit={createTemplate} className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="font-semibold text-sm text-slate-700">Nueva plantilla</div>
                  <input
                    value={form.nombre}
                    onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                    placeholder="Nombre"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                  <select
                    value={form.canal}
                    onChange={(e) => setForm((p) => ({ ...p, canal: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="general">General</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="correo">Correo</option>
                  </select>
                  <textarea
                    rows={4}
                    value={form.contenido}
                    onChange={(e) => setForm((p) => ({ ...p, contenido: e.target.value }))}
                    placeholder="Hola {{nombre}}, te contacto por..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-60 inline-flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar plantilla'}
                  </button>
                </form>
              </div>

              <div className="p-4 space-y-3">
                <div className="text-sm font-semibold text-slate-700">Vista previa aplicada</div>
                <textarea
                  rows={12}
                  value={rendered}
                  readOnly
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50"
                />

                <div className="text-xs text-slate-500">
                  {'Variables: {{nombre}}, {{empresa}}, {{telefono}}, {{correo}}, {{etapa}}, {{vendedor}}, {{fecha_hoy}}'}
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(rendered)}
                    className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-semibold inline-flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" /> Copiar
                  </button>

                  {waUrl && (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm font-semibold inline-flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" /> Abrir WhatsApp
                    </a>
                  )}

                  {mailUrl && (
                    <a
                      href={mailUrl}
                      className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-semibold inline-flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" /> Abrir Correo
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
