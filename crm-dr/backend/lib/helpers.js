// Convierte filas SQLite para compatibilidad con formato MongoDB (_id)
const toMongoFormat = (row) => {
    if (!row) return null;
    const { id, ...rest } = row;
    return { ...rest, _id: id, id };
};

const toMongoFormatMany = (rows) => (rows || []).map(toMongoFormat);

module.exports = { toMongoFormat, toMongoFormatMany };
