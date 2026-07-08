const xss = require('xss');

const sanitizeObject = (obj) => {
    if (typeof obj === 'string') {
        return xss(obj);
    }
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }
    if (typeof obj === 'object' && obj !== null) {
        const sanitizedObj = {};
        for (const [key, value] of Object.entries(obj)) {
            // No sanitizar contraseñas ni campos que esperamos que tengan caracteres especiales válidos como tokens
            if (['contraseña', 'password', 'token', 'refreshToken', 'googleAccessToken', 'googleRefreshToken'].includes(key)) {
                sanitizedObj[key] = value;
            } else {
                sanitizedObj[key] = sanitizeObject(value);
            }
        }
        return sanitizedObj;
    }
    return obj;
};

const xssMiddleware = (req, res, next) => {
    if (req.body) req.body = sanitizeObject(req.body);
    if (req.query) req.query = sanitizeObject(req.query);
    if (req.params) req.params = sanitizeObject(req.params);
    next();
};

module.exports = xssMiddleware;
