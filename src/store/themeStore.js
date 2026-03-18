import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Temas disponibles
export const THEMES = [
  { id: 'green', label: 'Original', color: '#8bc34a', className: 'theme-green' },
  { id: 'blue', label: 'Azul', color: '#3b82f6', className: 'theme-blue' },
  { id: 'purple', label: 'Morado', color: '#a855f7', className: 'theme-purple' },
  { id: 'orange', label: 'Naranja', color: '#f97316', className: 'theme-orange' },
  { id: 'teal', label: 'Verde Azulado', color: '#14b8a6', className: 'theme-teal' },
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
