import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Temas disponibles
export const THEMES = [
  // CLÁSICOS
  { id: 'blue', label: 'Azul', color: '#3b82f6', className: 'theme-blue', category: 'clasicos' },
  { id: 'yellow', label: 'Amarillo', color: '#eab308', className: 'theme-yellow', category: 'clasicos' },
  { id: 'solomycrm', label: 'SoloMyCRM', color: '#eab308', className: 'theme-solomycrm', category: 'clasicos' },
  { id: 'rose', label: 'Rosa', color: '#f43f5e', className: 'theme-rose', category: 'clasicos' },
  { id: 'green', label: 'Verde', color: '#22c55e', className: 'theme-green', category: 'clasicos' },
  { id: 'slate', label: 'Grafito', color: '#64748b', className: 'theme-slate', category: 'clasicos' },

  // DESVANECIDOS
  { id: 'midnight', label: 'Midnight', color: '#334155', className: 'theme-midnight', category: 'desvanecidos', swatch: 'gradient', swatchGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' },
  { id: 'sunset', label: 'Sunset', color: '#fb7185', className: 'theme-sunset', category: 'desvanecidos', swatch: 'gradient', swatchGradient: 'linear-gradient(135deg, #fb7185 0%, #fb923c 55%, #facc15 100%)' },
  { id: 'ocean', label: 'Océano', color: '#0ea5e9', className: 'theme-ocean', category: 'desvanecidos', swatch: 'gradient', swatchGradient: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 50%, #0284c7 100%)' },
  { id: 'lavender', label: 'Lavanda', color: '#a855f7', className: 'theme-lavender', category: 'desvanecidos', swatch: 'gradient', swatchGradient: 'linear-gradient(135deg, #c084fc 0%, #a855f7 50%, #7e22ce 100%)' },
  { id: 'mint', label: 'Menta', color: '#14b8a6', className: 'theme-mint', category: 'desvanecidos', swatch: 'gradient', swatchGradient: 'linear-gradient(135deg, #5eead4 0%, #14b8a6 50%, #0f766e 100%)' },

  // ESPECIALES
  { id: 'cyberpunk', label: 'Cyberpunk', color: '#d946ef', className: 'theme-cyberpunk', category: 'especiales', swatch: 'gradient', swatchGradient: 'linear-gradient(135deg, #06b6d4 0%, #d946ef 50%, #4a044e 100%)' },
  { id: 'gold', label: 'Oro Brillante', color: '#d99006', className: 'theme-gold', category: 'especiales', swatch: 'gradient', swatchGradient: 'linear-gradient(135deg, #fde48a 0%, #d99006 50%, #522700 100%)' },
  { id: 'mystic', label: 'Bosque Místico', color: '#10b981', className: 'theme-mystic', category: 'especiales', swatch: 'gradient', swatchGradient: 'linear-gradient(135deg, #059669 0%, #064e3b 100%)' },
  { id: 'volcano', label: 'Volcán', color: '#ef4444', className: 'theme-volcano', category: 'especiales', swatch: 'gradient', swatchGradient: 'linear-gradient(135deg, #f97316 0%, #dc2626 50%, #450a0a 100%)' },
  { id: 'galaxy', label: 'Galaxia', color: '#7b4dff', className: 'theme-galaxy', category: 'especiales', swatch: 'gradient', swatchGradient: 'linear-gradient(135deg, #2e1065 0%, #4510bc 50%, #db2777 100%)' },
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
