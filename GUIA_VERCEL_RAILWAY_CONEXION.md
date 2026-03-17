# 🔗 Guía de Conexión Vercel ↔ Railway

## ❌ Problema Actual
Vercel (frontend) no encuentra Railway (backend)

## ✅ Solución

### 1️⃣ **Obtén tu URL de Railway**

Ve a: https://railway.app/dashboard

1. Abre tu **proyecto Node.js**
2. Ve a **"Settings"** en el servicio
3. Busca **"Public URL"** - será algo como:
```
https://crm-backend-production.up.railway.app
```

**Copia esta URL** (sin barra al final)

---

### 2️⃣ **Configura Variable en Vercel**

Ve a: https://vercel.com/dashboard

1. Abre tu **proyecto frontend**
2. Ve a: **Settings** → **Environment Variables**
3. Crea variable:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://crm-backend-production.up.railway.app` (tu URL de Railway)
   - **Select Environments:** Production, Preview, Development

4. Click **Save**

---

### 3️⃣ **Redeploy en Vercel**

1. Ve a **"Deployments"** pestaña
2. Busca el último deploy
3. Click en **"..."** → **"Redeploy"**
4. Espera a que termine

---

### 4️⃣ **Verifica que Funcione**

Abre tu web en Vercel y prueba:
1. Ve a cualquier página
2. Abre **Developer Tools** → **Console** (F12)
3. Debería conectarse sin errores de red

Si ves error de CORS, verifica punto 5.

---

### 5️⃣ **Verifica CORS en Railway (si hay error)**

En Railway, en tu backend service:

1. Ve a **Environment Variables**
2. Verifica que esté:
```
NODE_ENV=production
DATABASE_URL=postgresql://...  (auto)
JWT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

El CORS ya está configurado en `backend/server.js`:
```javascript
app.use(cors()); // ✅ Permite todos los orígenes
```

---

## 🧪 Prueba Rápida

En tu navegador console (F12):
```javascript
fetch('https://crm-backend-production.up.railway.app/health')
  .then(r => r.json())
  .then(d => console.log(d))
  .catch(e => console.error(e))
```

Si ves: `{status: "ok", uptime: ...}` → ✅ Backend funciona

---

## 📊 Arquitectura Final

```
Usuario → Vercel Frontend (React + Vite)
        ↓ (VITE_API_URL)
      Railway Backend (Node.js + PostgreSQL)
        ↓ (DATABASE_URL)
      Railway PostgreSQL
```

---

## 🚨 Errores Comunes

### ❌ "Cannot POST /api/auth/login"
**Causa:** URL incorrecta del backend
**Solución:** Verifica que `VITE_API_URL` esté en Vercel settings

### ❌ "CORS error - blocked by browser"
**Causa:** Backend sin CORS habilitado
**Solución:** Ya está habilitado en código, pero verifica que `NODE_ENV=production`

### ❌ "ERR_NAME_NOT_RESOLVED"
**Causa:** URL de Railway no existe o está desactivada
**Solución:** Verifica que Railway app esté corriendo (green status)

### ❌ "Connection refused"
**Causa:** Backend en Railway no está deployado
**Solución:** Espera a que termine el deploy en Railway

---

## 📝 Checklist Final

- [ ] Obtengo URL pública de Railway
- [ ] Agrego `VITE_API_URL` en Vercel settings
- [ ] Redeploy en Vercel
- [ ] Pruebo conexión en navegador (F12)
- [ ] Login funciona ✅

---

## 🆘 Si aún no funciona

Verifica en **Vercel → Deployments → Logs**:
```
Build successful ✅
Environment variables loaded ✅
```

Y en **Railway → Logs**:
```
✅ Server running on 0.0.0.0:PORT
📊 PostgreSQL conectado
```

Si ambos están ✅ pero aún hay error, es problema de CORS o URL incorrecta.

