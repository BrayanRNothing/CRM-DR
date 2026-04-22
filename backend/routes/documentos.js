const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth } = require('../middleware/auth');

// Directorio donde se guardan los documentos
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'contratos');

// Crear carpeta si no existe
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configurar multer: guardar en disco, solo PDFs, máx 15 MB
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        const base = path.basename(file.originalname, ext)
            .replace(/[^a-zA-Z0-9_\-]/g, '_')
            .slice(0, 60);
        const unique = `${Date.now()}_${base}${ext}`;
        cb(null, unique);
    }
});

const fileFilter = (_req, file, cb) => {
    const allowed = ['.pdf', '.PDF'];
    const ext = path.extname(file.originalname);
    if (allowed.includes(ext) || file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten archivos PDF'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 15 * 1024 * 1024 } // 15 MB
});

// POST /api/documentos/upload  — sube un PDF y devuelve la URL pública
router.post('/upload', auth, upload.single('archivo'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se recibió ningún archivo' });
    }
    // URL pública: /archivos/contratos/<nombre>
    const url = `/archivos/contratos/${req.file.filename}`;
    res.json({
        url,
        nombreArchivo: req.file.originalname,
        tamano: req.file.size,
        filename: req.file.filename
    });
});

// DELETE /api/documentos/:filename  — elimina el archivo del disco
router.delete('/:filename', auth, (req, res) => {
    const filename = path.basename(req.params.filename); // evitar path traversal
    const filePath = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    try {
        fs.unlinkSync(filePath);
        res.json({ ok: true, mensaje: 'Archivo eliminado' });
    } catch (e) {
        console.error('Error al eliminar archivo:', e.message);
        res.status(500).json({ error: 'No se pudo eliminar el archivo' });
    }
});

module.exports = router;
