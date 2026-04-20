import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Temas disponibles
export const THEMES = [
  { id: 'green', label: 'Original', color: '#8bc34a', className: 'theme-green' },
  { id: 'blue', label: 'Azul', color: '#3b82f6', className: 'theme-blue' },
  { id: 'purple', label: 'Morado', color: '#a855f7', className: 'theme-purple' },
  { id: 'orange', label: 'Naranja', color: '#f97316', className: 'theme-orange' },
  { id: 'teal', label: 'Verde Azulado', color: '#14b8a6', className: 'theme-teal' },
  { id: 'rose', label: 'Rosa', color: '#f43f5e', className: 'theme-rose' },
  { id: 'cyan', label: 'Cian', color: '#06b6d4', className: 'theme-cyan' },
  { id: 'slate', label: 'Grafito', color: '#64748b', className: 'theme-slate' },
  { id: 'amber', label: 'Ámbar', color: '#f59e0b', className: 'theme-amber' },
  { id: 'aurora', label: 'Aurora', color: '#22c55e', className: 'theme-aurora', swatch: 'gradient', swatchGradient: 'linear-gradient(135deg, #34d399 0%, #22d3ee 50%, #4f46e5 100%)' },
  { id: 'neon', label: 'Neon', color: '#00f5d4', className: 'theme-neon', swatch: 'gradient', swatchGradient: 'linear-gradient(135deg, #00f5d4 0%, #00bbf9 45%, #9b5de5 100%)' },
  { id: 'sunset', label: 'Sunset', color: '#fb7185', className: 'theme-sunset', swatch: 'gradient', swatchGradient: 'linear-gradient(135deg, #fb7185 0%, #fb923c 55%, #facc15 100%)' },
  { id: 'midnight', label: 'Midnight', color: '#334155', className: 'theme-midnight', swatch: 'gradient', swatchGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' },
  { id: 'pastel', label: 'Pastel', color: '#a78bfa', className: 'theme-pastel', swatch: 'gradient', swatchGradient: 'linear-gradient(135deg, #a7f3d0 0%, #bfdbfe 50%, #c4b5fd 100%)' },
  { id: 'holografico', label: 'Holografico', color: '#38bdf8', className: 'theme-holografico', swatch: 'gradient', swatchGradient: 'linear-gradient(135deg, #67e8f9 0%, #a78bfa 45%, #f472b6 100%)' },
];

const useThemeStore = create(
  persist(
    (set) => ({
      currentThemeId: 'blue', // Por defecto cambiamos a Azul como pidió originalmente.
      setTheme: (themeId) => set({ currentThemeId: themeId }),
    }),
    {
      name: 'crm_theme_preference', // Key en localStorage
    }
  )
);

export default useThemeStore;
