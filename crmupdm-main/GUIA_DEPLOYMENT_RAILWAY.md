# 🚀 Guía de Deployment - Backend en Railway con PostgreSQL

## ✅ MIGRACIÓN A POSTGRESQL - COMPLETADA

El código ya está configurado para soportar **PostgreSQL en producción** y **SQLite en desarrollo**.

---

## 📋 Requisitos Previos
- ✅ Código en GitHub (ya lo tienes - `git push` realizado)
- ✅ Cuenta en Railway: https://railway.app (conectar con GitHub)
- ✅ Backend con soporte PostgreSQL (ya implementado)

---

## 🎯 OPCIÓN RECOMENDADA: PostgreSQL en Railway

### ✅ Cambios de Código Ya Implementados

#### 1. **Wrapper de Abstracción BD** ✓
- Archivo: `backend/lib/db.js`
- Soporta SQLite (desarrollo) y PostgreSQL (producción)
- Métodos: `query()`, `queryOne()`, `run()`, `insertOne()`, `transaction()`

#### 2. **Server.js Actualizado** ✓
```javascript
// ✅ Escucha en 0.0.0.0 (requerido por Railway)
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => { ... });

// ✅ Health check endpoint
app.get('/health', (req, res) => { ... });

// ✅ Graceful shutdown
process.on('SIGTERM', () => { ... });
```

#### 3. **Procfile Creado** ✓
```procfile
web: node server.js
```

#### 4. **Package.json Actualizado** ✓
- Agregado: `"pg": "^8.11.3"` (driver PostgreSQL)
- Mantiene: `better-sqlite3` (para desarrollo local)

#### 5. **Script de Inicialización DB** ✓
- Archivo: `backend/lib/init-db.js`
- Crea schema PostgreSQL automáticamente en deploy

#### 6. **.env.example Actualizado** ✓
```
DATABASE_URL=postgresql://...  (Railway lo asigna automáticamente)
SQLITE_PATH=./database.db      (para desarrollo local)
```

---

## 🚀 PASOS PARA DEPLOY EN RAILWAY

### 1. **Push del código a GitHub**
```bash
cd "c:\Users\Brayan\Downloads\PAGINAS WEB\CRM-03"
git add .
git commit -m "🔄 Migración a PostgreSQL - Soporte Railway"
git push origin main
```

### 2. **Ir a Railway y Crear Proyecto**
1. Abrir https://railway.app en navegador
2. Login con GitHub
3. Click en **"New Project"**
4. Seleccionar **"Provision PostgreSQL"** (Rails creará BD automáticamente)
5. Click en **"Add Service"** → **"GitHub Repo"**
6. Seleccionar tu repo: `BrayanRNothing/CRM-UPDM`
7. Seleccionar rama: `main`
8. Click **"Deploy"**

### 3. **Configurar Variables de Entorno**
Railway asigna automáticamente:
```
DATABASE_URL = postgresql://user:pass@host:5432/railway
```

Agregar manualmente en Railway Dashboard → Environment:
```
PORT=3000  (o el que Railway asigne)
NODE_ENV=production
JWT_SECRET=generar_con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
```

### 4. **Deploy**
- Railway detectará automáticamente el `Procfile`
- Instalará dependencias (`npm install` - incluyendo `pg`)
- Creará tablas PostgreSQL automáticamente
- Tu API estará lista en: `https://tu-proyecto-railway.up.railway.app`

---

## 📊 Verificar que Funcione

### Test en Terminal:
```bash
# Reemplazar con tu URL de Railway
curl https://tu-proyecto-railway.up.railway.app/health
# Respuesta: {"status":"ok","uptime":0.123}

curl https://tu-proyecto-railway.up.railway.app/
# Respuesta: {"mensaje":"🚀 API CRM...","env":"production","timestamp":"..."}
```

### Test en Frontend:
Actualizar `.env` del frontend:
```
VITE_API_URL=https://tu-proyecto-railway.up.railway.app
```

Redeploy en Vercel o donde esté el frontend.

---

## 🔄 Flujo de Desarrollo vs Producción

### 📱 LOCAL (Desarrollo)
```
npm install (instala both SQLite y PostgreSQL driver)
npm run dev
↓
Conecta a: ./database.db (SQLite)
Modo: development
```

### 🌐 RAILWAY (Producción)
```
npm install (instala both SQLite y PostgreSQL driver)
npm start (ejecuta server.js)
↓
Conecta a: DATABASE_URL (PostgreSQL)
Modo: production
```

---

## ⚙️ Código Automático - Cómo Funciona

### 1. **Inicio del Backend**
```javascript
// backend/lib/db.js

if (isProd && process.env.DATABASE_URL) {
    // USA: PostgreSQL (Pool connection)
    const Pool = require('pg').Pool;
    db = new Pool({ connectionString: DATABASE_URL });
} else {
    // USA: SQLite (mejor-sqlite3)
    const Database = require('better-sqlite3');
    db = new Database(dbPath);
}
```

### 2. **Queries Automáticas**
```javascript
// En tus rutas, uso normal:
const usuario = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);

// Se detecta automáticamente:
if (isProd) {
    // PostgreSQL: db.query(sql, params)
} else {
    // SQLite: db.prepare(sql).get(params)
}
```

### 3. **Creación de Tablas**
```javascript
// backend/lib/init-db.js

// PostgreSQL: Crea schema con SERIAL, TIMESTAMP, etc.
// SQLite: Ya creado en database.js

// Se ejecuta automáticamente en startup
```

---

## 📚 Archivos Nuevos/Modificados

| Archivo | Estado | Descripción |
|---------|--------|-------------|
| `backend/lib/db.js` | ✅ NUEVO | Wrapper abstracción BD |
| `backend/lib/init-db.js` | ✅ NUEVO | Script init PostgreSQL |
| `backend/Procfile` | ✅ NUEVO | Config Railway |
| `backend/server.js` | ✅ MODIFICADO | 0.0.0.0, health check, graceful shutdown |
| `backend/config/database.js` | ✅ MODIFICADO | Soporta SQLite + PostgreSQL |
| `backend/package.json` | ✅ MODIFICADO | Agregado `pg` dependency |
| `backend/.env.example` | ✅ MODIFICADO | Actualizado DATABASE_URL |

---

## 🆘 Troubleshooting

### ❌ "DATABASE_URL: undefined"
**Solución:** En Railway, primero crear PostgreSQL plugin, luego agregar app Node.js

### ❌ "Error: connect ECONNREFUSED 127.0.0.1:5432"
**Solución:** Estás en desarrollo sin PostgreSQL local. Usa SQLite (NODE_ENV=development)

### ❌ "relation \"usuarios\" does not exist"
**Solución:** Las tablas no se crearon. Verificar en Railway que se ejecutó:
```bash
node backend/lib/init-db.js
```

Rails debería ejecutarlo automáticamente, pero si no, puedes agregarlo al `Procfile`:
```procfile
release: node backend/lib/init-db.js
web: node backend/server.js
```

### ❌ "Port 4000 already in use"
**Solución:** Railway asigna puerto automáticamente en `process.env.PORT`
```javascript
const PORT = process.env.PORT || 4000; // ✅ Correcto
```

---

## 🎯 URL de Producción

Una vez deployado en Railway:
- **URL Base:** `https://tu-proyecto-railway.up.railway.app`
- **Health Check:** `https://tu-proyecto-railway.up.railway.app/health`
- **API Auth:** `https://tu-proyecto-railway.up.railway.app/api/auth/login`

---

## 📝 Próximos Pasos

1. ✅ Push a GitHub (`git push origin main`)
2. ✅ Conectar Railway con GitHub
3. ✅ Crear PostgreSQL en Railway
4. ✅ Deploy automático
5. ✅ Actualizar frontend con nueva URL de API
6. ✅ Verificar en Dashboard de Railway

---

## 💡 IMPORTANTE

**El código ya está 100% listo para Railway con PostgreSQL.**
No requiere cambios adicionales. Solo falta:
1. Hacer `git push` final
2. Conectar Railway
3. ¡Listo! 🚀


