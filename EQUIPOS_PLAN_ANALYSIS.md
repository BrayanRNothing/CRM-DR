# 🔍 Análisis Crítico del Plan: Sistema de Equipos

> Basado en una revisión profunda del código real del proyecto (PostgreSQL en producción via Railway, base de datos existente con datos).

---

## ❌ Fallas Críticas del Plan Original

### 1. El Plan Asume SQLite — Pero el Backend Usa PostgreSQL

**Esto es el error más grave.** El plan original menciona "SQL script de migración SQLite", pero el código real en `backend/config/database.js` muestra claramente:

```js
const isPostgres = true;
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no configurada. Este backend requiere PostgreSQL...');
}
```

**Impacto**: Toda la estrategia de migración debe estar escrita en **PostgreSQL DDL**, no SQLite. La forma de agregar columnas y tablas es diferente.

---

### 2. El Plan No Menciona el Auto-Migrator de `database.js`

El proyecto ya tiene un sistema muy sofisticado de auto-migración en `initDb()` dentro de `database.js`. **No se puede simplemente crear un archivo `.sql` y ejecutarlo por separado.** Las nuevas columnas de `equipo_id` deben integrarse en ese mismo sistema de migración para que funcionen en Railway (producción).

**Lo correcto es**: Agregar en `colsMissingPg` las nuevas columnas de `equipo_id`.

---

### 3. El Plan Subestima el Alcance de Rutas a Modificar

El plan dice "modificar `routes/prospector.js` y otros". En realidad, estas son las rutas que necesitan filtros de equipo:

| Archivo | Rutas afectadas | Complejidad |
|---|---|---|
| `routes/prospector.js` | 15+ rutas (dashboard, prospectos, actividades, recordatorios, etc.) | Alta |
| `routes/closer.js` | ~20+ rutas (50kb de código) | Muy Alta |
| `routes/clientes.js` | 5 rutas | Media |
| `routes/actividades.js` | 4 rutas | Media |
| `routes/usuarios.js` | 3 rutas | Baja |
| `routes/tareas.js` | 3 rutas | Baja |
| `routes/google.js` | Rutas de calendario (freebusy, eventos) | Alta |

**Olvidados en el plan**: `closer.js` (el archivo más grande, 50,782 bytes) y `google.js`.

---

### 4. El Dato Crítico: `prospectorAsignado` vs `equipo_id`

El plan propone poner `equipo_id` en `clientes`. Pero el filtrado actual ya funciona por `prospectorAsignado = id_del_usuario`. Si un usuario crea un prospecto, ese prospecto le pertenece solo a él.

**El problema real** está en:
1. `GET /api/usuarios` — devuelve **TODOS** los usuarios a cualquier autenticado, de ahí el caos en el calendario.
2. El dashboard de prospector usa `OR c.prospectorAsignado IS NULL` — lo que expone prospectos sin dueño a todos.

**El arreglo más urgente** (sin teams todavía) sería simplemente filtrar `/api/usuarios` por equipo.

---

### 5. El Plan No Define Qué Pasa con el `esSuperUser` Middleware

Actualmente `esSuperUser` permite a **cualquier** `closer`, `prospector` o `vendedor` crear y editar usuarios. Con el sistema de equipos, solo el **Team Owner** debe poder crear usuarios en su equipo.

El plan no contempla un nuevo nivel de permiso: `esTeamOwner`.

---

### 6. Sin Lógica para el Primer Usuario (Bootstrap)

Si ahora mismo un nuevo usuario se registra y no existe lógica de equipo, ¿qué pasa? El plan no define:
- ¿Se crea un equipo automáticamente al registrarse?
- ¿O el usuario queda en estado "sin equipo" y no puede usar el CRM hasta crear/unirse a uno?

Esto rompería el registro actual si no se maneja el caso donde `equipo_id = NULL`.

---

## ⚠️ Fallas de Diseño Importantes

### 7. "Invite Code" vs "Team Owner Crea Usuarios" — Dos Flujos Muy Distintos

El plan lo deja como "pregunta abierta", pero esta decisión afecta **todo el diseño**:

| Opción | Pros | Contras |
|---|---|---|
| **Owner crea usuarios** | Simple, control total | El owner necesita saber las credenciales de sus empleados |
| **Invite Code** | Más profesional, el empleado establece su propia contraseña | Más complejo (tokens de invitación, expiración, emails) |

**Recomendación**: Owner crea usuarios, los empleados pueden cambiar su contraseña después. Es lo más simple para este CRM.

---

### 8. El Plan No Considera la Migración de Datos Existentes

Ya tienes usuarios y prospectos en producción. El plan dice "se asignarán a un equipo por defecto" pero no define:
- ¿Un equipo por usuario existente? (cada quien tiene sus datos aislados)
- ¿Un equipo global para todos los existentes? (todos siguen viéndose)
- ¿Quién es el "owner" del equipo generado?

---

### 9. WebSockets (`socket.emit`) Necesitan Filtro por Equipo

En `prospector.js` hay eventos de socket:
```js
req.app.get('io').emit('prospectos_actualizados', { ... });
```

Esto hace broadcast a **TODOS** los usuarios conectados. Con equipos, el evento debería emitirse solo a la sala del equipo:
```js
io.to(`team_${equipo_id}`).emit('prospectos_actualizados', ...);
```

El plan no menciona esto.

---

## ✅ Lo Que Sí Está Bien en el Plan

- ✅ La idea de agregar `equipo_id` a `usuarios` y `clientes` es correcta.
- ✅ Filtrar en el middleware de `auth` para disponibilizar el equipo en `req.usuario` es el approach correcto.
- ✅ Crear una página de gestión de equipo en el frontend tiene sentido.

---

## 🚀 Plan Mejorado — Orden de Ejecución

```
Fase 1 — Base de Datos (todo en database.js, no un .sql separado)
  ├── Crear tabla `equipos` en initDb()
  ├── Agregar equipo_id a usuarios, clientes, actividades, tareas
  └── Script de migración para datos existentes (1 equipo por usuario actual)

Fase 2 — Auth & Middleware
  ├── Incluir equipo_id en el JWT payload
  ├── El middleware auth ya hace SELECT del usuario — solo agregar equipo_id
  └── Nuevo helper/middleware: esTeamOwner

Fase 3 — Backend Rutas (en orden de impacto)
  ├── routes/usuarios.js → filtrar por equipo_id (URGENTE — causa el caos del calendario)
  ├── routes/prospector.js → filtrar prospectos, actividades y recordatorios
  ├── routes/closer.js → filtrar reuniones y actividades
  ├── routes/clientes.js → filtrar clientes
  ├── routes/tareas.js → filtrar tareas
  └── Arreglar socket.emit para broadcast por equipo

Fase 4 — Frontend
  ├── Página de equipo: crear equipo / invitar miembro
  ├── El calendario automáticamente muestra menos closers (ya filtrado por backend)
  └── Ajustes: ver y gestionar miembros del equipo
```

---

## 📊 Estimación de Complejidad Real

| Lo que el plan decía | La realidad |
|---|---|
| "Modificar prospector.js y otros" | Son **7 archivos de rutas** completos |
| "Migración SQL simple" | Debe integrarse en el auto-migrator de Postgres existente |
| "Fácil de hacer" | 2-3 días de trabajo para hacerlo correctamente y sin romper lo existente |
| Risk de romper prod | **Alto** si no se maneja la migración de datos existentes |
