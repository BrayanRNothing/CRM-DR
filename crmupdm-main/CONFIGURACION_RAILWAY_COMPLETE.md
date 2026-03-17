# ✅ CHECKLIST COMPLETO - Configuración Railway

## 1️⃣ NETWORKING - PUERTOS (CRÍTICO)
- [ ] Domain 1: `crm-updm-production-2a6e.up.railway.app`
  - [ ] Target port: `4000` (NO 8080)
  
- [ ] Domain 2: `crm-updm-production.up.railway.app`
  - [ ] Target port: `4000` (NO 8080)

## 2️⃣ VARIABLES DE ENTORNO en Railway
```
Nombre                    | Valor
========================+=============================================
PORT                      | 4000
NODE_ENV                  | production
JWT_SECRET                | [Tu valor de 64 caracteres hexadecimales]
DATABASE_URL              | [PostgreSQL - Asignado automáticamente por Railway]
GOOGLE_CLIENT_ID          | 572672543982-re58sdk48847v1vel57pdgpl4dfj7d14.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET      | [Tu secret]
```

**⚠️ Importante**: `DATABASE_URL` se asigna automáticamente cuando conectas PostgreSQL. NO la escribas manualmente.

## 3️⃣ VARIABLES EN FRONTEND (.env.production - Vercel)
✅ Estado actual correcto:
```env
VITE_API_URL=https://crm-updm-production.up.railway.app
```

## 4️⃣ VERIFICACIÓN DE CONECTIVIDAD

### Test 1: Ping al healthcheck
```bash
curl -I https://crm-updm-production.up.railway.app/health
# Debería retornar: 200 OK
```

### Test 2: Probe del login
```bash
curl -X POST https://crm-updm-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"prospector", "contraseña":"prospector"}'
# Debería retornar: {"token":"...", "usuario":{...}} O {"mensaje":"Credenciales inválidas"}
```

## 5️⃣ ESTADO DEL SERVIDOR

### logs a revisar en Railway:
- ✅ `🚀 Servidor corriendo en 0.0.0.0:4000`
- ✅ `📡 Modo: production`
- ✅ No debe haber errores de "ECONNREFUSED" o "UNABLE_TO_CONNECT"

## 6️⃣ PROBLEMAS COMUNES Y SOLUCIONES

| Problema | Causa | Solución |
|----------|-------|----------|
| `net::ERR_FAILED` | Puerto incorrecto en Railway | Cambiar Target port a 4000 |
| `CORS header missing` | Header de CORS no se envía | Reiniciar container en Railway |
| `500 Internal Server` | JWT_SECRET no configurado | Agregar JWT_SECRET en Railway |
| `Database connection refused` | DATABASE_URL no configurada | Conectar PostgreSQL en Railway |

