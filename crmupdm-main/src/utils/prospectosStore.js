const STORAGE_KEY = 'crm_prospectos_data';

export const loadProspectos = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        return JSON.parse(stored);
    } catch (error) {
        console.error('Error loading prospectos from localStorage:', error);
        return [];
    }
};

export const saveProspectos = (prospectos) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prospectos));
    } catch (error) {
        console.error('Error saving prospectos to localStorage:', error);
    }
};
