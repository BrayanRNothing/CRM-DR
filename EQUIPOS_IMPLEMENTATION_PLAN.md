# Plan de Implementación: Sistema de Equipos (Multitenancy) v2.0

> **Basado en código real** — PostgreSQL en Railway, auto-migrator en `database.js`, Socket.io, 7 archivos de rutas.

---

## Resumen del Objetivo

Cada usuario que se registra puede optar por crear un **Equipo**. Al crear un equipo, se convierte en **Team Owner** y puede añadir más usuarios a ese equipo. Todos los datos (prospectos, actividades, tareas, reuniones) son **visibles solo dentro del mismo equipo**. El calendario solo mostrará los closers/vendedores del propio equipo.

---

## Decisiones de Diseño (ya tomadas, no requieren feedback)

| Decisión | Opción elegida | Razón |
|---|---|---|
| ¿Cómo se unen al equipo? | El Team Owner crea las cuentas de sus empleados | Más simple, sin sistema de emails/invitaciones |
| ¿Datos existentes en producción? | Cada usuario existente queda en su **propio equipo** individual (aislados entre sí desde el deploy) | Evita que datos de clientes distintos se mezclen |
| ¿Primer usuario nuevo sin equipo? | Al registrarse, **se crea automáticamente un equipo** con ese usuario como owner | Cero fricción en el onboarding |
| ¿Puede un usuario estar en varios equipos? | No, un usuario pertenece a exactamente un equipo | Keeps it simple |

---

## Fase 1 — Base de Datos (en `database.js`)

**Archivos a modificar**: `backend/config/database.js`

### 1.1 — Nueva tabla `equipos`
Se agrega dentro del bloque `CREATE TABLE IF NOT EXISTS` de `initDb()`:

```sql
CREATE TABLE IF NOT EXISTS equipos (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  owner_id INTEGER REFERENCES usuarios(id),
  "fechaCreacion" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### 1.2 — Columna `equipo_id` en tablas existentes
Se agrega en el array `colsMissingPg` del auto-migrator (**NO** como archivo `.sql` separado):

```js
['usuarios',    '"equipo_id"',  'INTEGER'],
['clientes',    '"equipo_id"',  'INTEGER'],
['actividades', '"equipo_id"',  'INTEGER'],
['tareas',      '"equipo_id"',  'INTEGER'],
```

### 1.3 — Migración de datos existentes (se ejecuta una vez en `initDb()`)
```sql
-- Para cada usuario sin equipo: crea un equipo personal
INSERT INTO equipos (nombre, owner_id)
SELECT 'Equipo de ' || nombre, id
FROM usuarios
WHERE "equipo_id" IS NULL;

-- Asigna cada usuario a su nuevo equipo personal
UPDATE usuarios u
SET "equipo_id" = (SELECT id FROM equipos WHERE owner_id = u.id)
WHERE "equipo_id" IS NULL;

-- Asigna los clientes al equipo del usuario que los creó (prospectorAsignado)
UPDATE clientes
SET "equipo_id" = (
  SELECT "equipo_id" FROM usuarios WHERE id = clientes."prospectorAsignado"
)
WHERE "equipo_id" IS NULL AND "prospectorAsignado" IS NOT NULL;

-- Fallback: clientes sin prospector asignado van al equipo del vendedor
UPDATE clientes
SET "equipo_id" = (
  SELECT "equipo_id" FROM usuarios WHERE id = clientes."vendedorAsignado"
)
WHERE "equipo_id" IS NULL;
```

> ⚠️ Toda esta lógica se ejecuta como `IF equipo_id IS NULL` para ser idempotente — puede correr múltiples veces sin daño.

---

## Fase 2 — Auth & Middleware

**Archivos a modificar**: `backend/middleware/auth.js`, `backend/routes/auth.js`

### 2.1 — `auth.js` (middleware)
El SELECT ya existente del middleware se expande para incluir `equipo_id`:

```js
// ANTES
const row = await db.prepare('SELECT id, usuario, nombre, rol, email, telefono, activo FROM usuarios WHERE id = ?').get(decoded.id);

// DESPUÉS
const row = await db.prepare('SELECT id, usuario, nombre, rol, email, telefono, activo, "equipo_id" FROM usuarios WHERE id = ?').get(decoded.id);
```

`req.usuario` tendrá `equipo_id` disponible en **todas las rutas** automáticamente.

### 2.2 — `routes/auth.js` (login + registro)
**Login**: Incluir `equipo_id` en el payload del JWT y la respuesta.

**Registro (nuevo flujo)**: Al crear un nuevo usuario via `POST /api/auth/register`:
1. Se crea el usuario en `usuarios`.
2. Se crea automáticamente un `equipo` con ese usuario como `owner_id`.
3. Se actualiza `equipo_id` del usuario recién creado.

### 2.3 — Nuevo middleware `esTeamOwner`
```js
// En middleware/auth.js
const esTeamOwner = async (req, res, next) => {
  const equipo = await db.prepare('SELECT id FROM equipos WHERE owner_id = ?').get(req.usuario.id);
  if (!equipo) return res.status(403).json({ mensaje: 'Solo el propietario del equipo puede realizar esta acción' });
  req.equipoId = equipo.id;
  next();
};
```

### 2.4 — Nueva ruta `routes/equipos.js`
```
GET  /api/equipos/mi-equipo      → Info del equipo + lista de miembros
POST /api/equipos/agregar-miembro → Team Owner crea un nuevo usuario asignado al equipo (reemplaza el registro público para sub-usuarios)
PUT  /api/equipos/mi-equipo      → Renombrar el equipo
DELETE /api/equipos/miembro/:id  → Desactivar un miembro del equipo
```

---

## Fase 3 — Rutas Backend (el cambio más grande)

El principio es siempre el mismo: **agregar `WHERE equipo_id = $N`** en cada query que exponga datos. `req.usuario.equipo_id` ya está disponible gracias al middleware.

### 3.1 — `routes/usuarios.js` ⚡ (URGENTE — causa el caos del calendario)

```js
// ANTES (devuelve TODOS los usuarios activos)
const rows = await db.prepare('SELECT ... FROM usuarios WHERE activo = 1 ORDER BY nombre ASC').all();

// DESPUÉS (solo los del mismo equipo)
const rows = await db.prepare('SELECT ... FROM usuarios WHERE activo = 1 AND "equipo_id" = ? ORDER BY nombre ASC').all(req.usuario.equipo_id);
```

### 3.2 — `routes/prospector.js` (15+ rutas)

**Patrón a aplicar en `GET /prospectos`**:
```js
// ANTES
WHERE c."prospectorAsignado" = ?

// DESPUÉS (ve todos los prospectos del equipo, no solo los suyos)
WHERE c."equipo_id" = ?
```

> **Nota de diseño importante**: Con equipos, un prospector ya puede ver todos los prospectos de su equipo (no solo los que él creó). Esto permite que el equipo trabaje colaborativamente.

**Dashboard**: Las métricas individuales (`prospectorId`) permanecen, pero el conteo del embudo se filtra por `equipo_id`.

**`crear-prospecto`**: Al insertar, agregar `equipo_id = req.usuario.equipo_id`.

**Rutas de historial/actividades por `:id`**: Validar que el cliente pertenezca al mismo equipo antes de devolver datos.

### 3.3 — `routes/closer.js` (20+ rutas)

Mismo patrón. Los clientes asignados a un closer ya están filtrados por `closerAsignado = closerId`, pero al crearse un prospecto desde el closer, debe incluir `equipo_id`.

`crear-prospecto` del closer → agregar `equipo_id = req.usuario.equipo_id`.

### 3.4 — `routes/clientes.js` (5 rutas)

```js
// Todas las queries de GET agregan:
AND c."equipo_id" = ?
```

### 3.5 — `routes/tareas.js` (3 rutas)

Las tareas son por vendedor (`WHERE vendedor = ?`), que ya implica un usuario específico. Sin embargo, al crear una tarea, agregar `equipo_id`.

### 3.6 — `routes/actividades.js`

Similar a tareas — las actividades privadas por `vendedor`, pero el `equipo_id` se agrega al insertar.

### 3.7 — `routes/google.js` (freebusy, eventos)

`GET /api/google/freebusy/:closerId` — Verificar que el `closerId` pertenezca al mismo equipo del solicitante:
```js
const closer = await db.prepare('SELECT "equipo_id" FROM usuarios WHERE id = ?').get(closerId);
if (closer.equipo_id !== req.usuario.equipo_id) return res.status(403).json({ msg: 'No autorizado' });
```

### 3.8 — `server.js` (WebSockets)

Al conectarse un socket, el usuario se une a la room de su equipo:

```js
// En server.js — io.on('connection')
socket.on('join_team', (equipoId) => {
  socket.join(`team_${equipoId}`);
});

// En todas las rutas que emiten (prospector.js, etc.):
// ANTES
io.emit('prospectos_actualizados', { ... });

// DESPUÉS
io.to(`team_${equipo_id}`).emit('prospectos_actualizados', { ... });
```

---

## Fase 4 — Frontend

### 4.1 — `utils/authUtils.js`
Asegurarse de que `getUser()` incluya `equipo_id` en el objeto guardado en localStorage tras el login.

### 4.2 — `pages/common/GestionEquipo.jsx` (página nueva)
Una página en Ajustes o navegación accesible desde el perfil del Team Owner:

- **Ver el equipo**: Nombre del equipo, lista de miembros con rol y estado.
- **Agregar miembro**: Formulario (nombre, usuario, contraseña temporal, rol). Llama a `POST /api/equipos/agregar-miembro`.
- **Desactivar miembro**: Botón de estado activo/inactivo. Solo el Team Owner puede hacerlo.

### 4.3 — `ProspectorCalendario.jsx`
**No requiere cambios**. El backend ya devolverá solo los usuarios del equipo en `GET /api/usuarios`. El calendario automáticamente mostrará menos closers.

### 4.4 — Registro (`Register.jsx`)
El flujo de registro público crea automáticamente un equipo. No es necesario añadir campos extra. Después de registrarse, el usuario ya es dueño de su equipo y puede invitar miembros desde Ajustes.

---

## Orden de Ejecución (para no romper producción)

```
1. database.js → Crear tabla equipos + columnas equipo_id + migración de datos (idempotente)
2. middleware/auth.js → Incluir equipo_id en req.usuario
3. routes/auth.js → Actualizar login/register
4. routes/usuarios.js → Filtrar por equipo_id (IMPACTO INMEDIATO en el calendario)
5. routes/equipos.js → Crear archivo nuevo completo
6. server.js → Registrar nueva ruta + Fix WebSocket rooms
7. routes/prospector.js → Filtrar datos por equipo_id
8. routes/closer.js → Filtrar datos por equipo_id
9. routes/clientes.js → Filtrar datos por equipo_id
10. routes/tareas.js → Agregar equipo_id al insertar
11. routes/google.js → Validar equipo en freebusy
12. Frontend → GestionEquipo.jsx + authUtils.js
```

---

## Estimación de Impacto

| Fase | Archivos | Riesgo | Prioridad |
|---|---|---|---|
| BD | `database.js` | Medio (migración de datos) | 🔴 Alta |
| Auth | `auth.js`, `middleware/auth.js` | Bajo | 🔴 Alta |
| Usuarios | `routes/usuarios.js` | Bajo | 🔴 Alta — Arregla el calendario YA |
| Prospector | `routes/prospector.js` | Medio | 🟠 Media |
| Closer | `routes/closer.js` | Medio | 🟠 Media |
| Clientes | `routes/clientes.js` | Bajo | 🟡 Normal |
| Tareas | `routes/tareas.js` | Bajo | 🟡 Normal |
| Google | `routes/google.js` | Bajo | 🟡 Normal |
| Sockets | `server.js` | Bajo | 🟡 Normal |
| Frontend | Nuevo componente + utils | Bajo | 🟢 Final |

**Tiempo estimado real**: 1-2 días de trabajo focalizado.
