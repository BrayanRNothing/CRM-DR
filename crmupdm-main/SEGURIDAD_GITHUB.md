# 🔐 GUÍA DE SEGURIDAD - Antes de Subir a GitHub

## ✅ Verificaciones Realizadas

- ✓ Los archivos `.env` NO están en el repositorio Git
- ✓ Las bases de datos `.db` NO están en el repositorio 
- ✓ El `.gitignore` está correctamente configurado
- ✓ No hay secretos hardcodeados en el código (usan `process.env` y `import.meta.env`)

## ⚠️ PROBLEMAS DE SEGURIDAD ENCONTRADOS

### 1. Archivos `.env` Locales Contienen Datos Sensibles
- `c:/Users/Brayan/Downloads/PAGINAS WEB/CRM-03/.env` → Contiene Firebase API Key real
- `c:/Users/Brayan/Downloads/PAGINAS WEB/CRM-03/backend/.env` → Contiene Google Client Secret real

**Acción:** NO subas estos archivos a GitHub. Están en `.gitignore` (✓ protegidos)

### 2. JWT_SECRET Débil 
```javascript
// ❌ En backend/middleware/auth.js y backend/routes/auth.js
process.env.JWT_SECRET || 'secret'
```
**Acción:** Generar una clave fuerte:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Bases de Datos Locales
- `database.db`, `crm.db` contienen datos reales
- Están en `.gitignore` pero NO debes subirlos

**Acción:** Eliminarlas antes de hacer commit (opcional):
```bash
git clean -fd  # Limpia archivos ignorados
```

### 4. Google Tokens Almacenados en BD
- `googleRefreshToken` y `googleAccessToken` se guardan en tabla `usuarios`
- Considera encriptarlos o usar un servicio seguro

---

## 🛡️ CHECKLIST ANTES DE SUBIR A GITHUB

- [ ] Verificar que `.gitignore` incluya: `.env`, `*.db`, `*.sqlite3`, `node_modules/`, `dist/`
- [ ] NO hacer commit de `.env` o archivos `.db`
- [ ] Usar `.env.example` como template
- [ ] Todos los secretos deben estar en `.env` (gitignored)
- [ ] Código solo usa `process.env` o `import.meta.env`
- [ ] JWT_SECRET tiene valor fuerte en producción
- [ ] Activar dos factores en GitHub
- [ ] Hacer una auditoría del historial: `git log --all --oneline`

---

## 📋 VARIABLES DE ENTORNO REQUERIDAS

### Frontend (`.env`)
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
VITE_GOOGLE_CLIENT_ID
```

### Backend (`backend/.env`)
```
PORT
NODE_ENV
JWT_SECRET (debe ser fuerte)
MONGODB_URI
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
SQLITE_PATH (opcional)
```

---

## 🚀 EN PRODUCCIÓN

1. **Variables de Entorno:** Usar secrets en tu hosting (Vercel, Railway, etc.)
2. **Firebase:** Usar reglas de seguridad estrictas
3. **Google Credentials:** Rotar regularmente
4. **JWT Secret:** Cambiar en producción
5. **Base de Datos:** Usar servicio gestionado (MongoDB Atlas, etc.)
6. **Encripción:** Encriptar tokens sensibles antes de guardarlos

---

## ✅ ESTADO ACTUAL

**SEGURO para subir a GitHub:** SÍ ✓
- Los archivos sensibles están protegidos por `.gitignore`
- No hay hardcoding de secretos en el código fuente
- Se usan variables de entorno correctamente

**ACCIONES ANTES DE PUSH:**
1. Verificar que `.gitignore` está actualizado
2. Hacer `git status` para confirmar que `.env` no aparece
3. Hacer `git log` para verificar el historial
4. Subir con confianza ✓

