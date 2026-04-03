// Convierte filas SQLite para compatibilidad con formato MongoDB (_id)
const toMongoFormat = (row) => {
    if (!row) return null;
    const { id, ...rest } = row;
    return { ...rest, _id: id, id };
};

const toMongoFormatMany = (rows) => (rows || []).map(toMongoFormat);

// Helper para parsear la fecha de expiración de Google a milisegundos (para OAuth2Client)
const parseGoogleExpiryToMillis = (value) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.getTime();

    if (typeof value === 'string') {
        const trimmed = value.trim();
        // Si es un string de números ("123456789")
        if (/^\d+$/.test(trimmed)) {
            const numeric = Number(trimmed);
            if (Number.isFinite(numeric)) return numeric;
        }
        // Si es una fecha ISO ("2026-04-03...")
        const parsed = Date.parse(trimmed);
        if (!Number.isNaN(parsed)) return parsed;
    }

    return undefined;
};

module.exports = { toMongoFormat, toMongoFormatMany, parseGoogleExpiryToMillis };
