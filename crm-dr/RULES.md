# Reglas y Estructura del CRM

Este documento sirve como la fuente de la verdad para las reglas del sistema, modelos de datos, flujos de trabajo y directrices arquitectónicas de este CRM personalizable. **Cualquier nuevo desarrollo debe adherirse a lo descrito aquí.**

---

## 1. Roles del Sistema

El sistema maneja un flujo de trabajo dividido en roles para asegurar la segmentación de datos y la eficiencia. Actualmente existen 3 roles:

1. **`admin`**: Superusuario de la empresa/entorno(en realidad todos los roles son superusuarios).
   - Puede ver, editar y eliminar cualquier dato.
   - Capacidad de crear y gestionar usuarios del sistema.
   - Tiene acceso a la configuración de la empresa (logo, nombre, etc.).

2. **`individual`**: (Anteriormente *doctor*). Profesional independiente o autónomo.
   - Maneja su propia agenda, clientes y ciclo completo de venta/seguimiento.
   - Funciona como prospector y closer al mismo tiempo.
   - El sistema se adapta para mostrarle flujos simplificados (sin transferencias de prospectos).

3. **`closer`**: Ejecutivo de cierre de ventas.
   - Recibe clientes agendados en su calendario.
   - Se encarga de mover al cliente a etapas finales (`ganado`, `perdido`).
   - Ve únicamente los prospectos que le han sido asignados.

4. **`prospector`**: Ejecutivo de captación de leads.
   - Su trabajo es ingresar leads al sistema y agendar citas en el calendario del `closer`.
   - Se encarga de las etapas iniciales del embudo (`prospecto_nuevo`, `contactado`, `cita_agendada`).

---

## 2. Modelos de Datos Obligatorios (Base de Datos)

Todo registro insertado o actualizado mediante el backend (SQLite) debe respetar estos campos mínimos y validaciones nativas:

### Usuarios (`usuarios`)
- **`usuario`** (*TEXT UNIQUE NOT NULL*) - Username para login.
- **`contraseña`** (*TEXT NOT NULL*) - Hash bcrypt.
- **`rol`** (*TEXT NOT NULL*) - Debe ser estrictamente `individual`, `closer` o `prospector`.
- **`nombre`** (*TEXT NOT NULL*) - Nombre real.
- **`modo_crm`** (*TEXT DEFAULT 'individual'*) - Determina si la cuenta visualiza el CRM de forma individual o en modo equipo (opción futura).
- *(Opcionales: `email`, `telefono`, tokens de Google Calendar)*

### Clientes / Prospectos (`clientes`)
- **`nombres`** (*TEXT NOT NULL*)
- **`apellidoPaterno`** (*TEXT  NULLABLE*)
- **`apellidoMaterno`** (*TEXT  NULLABLE*)
- **`telefono`** (*TEXT  NULLABLE*)
- **`correo`** (*TEXT  NULLABLE*)
- **`estado`** (*TEXT*) - Estado macro del cliente en el ciclo. Valores: `proceso` (activo, por defecto), `ganado` (venta cerrada), `perdido` (oportunidad perdida).
- **`etapaEmbudo`** (*TEXT*) - Micro-etapas del pipeline. Valores principales: `prospecto_nuevo` (sin contacto efectivo, default), `en_contacto` (comunicación establecida), `reunion_agendada`, `reunion_realizada`.
- **`vendedorAsignado`** (*INTEGER NOT NULL*) - ID del usuario que registró originalmente al cliente.
- *(Llaves foráneas opcionales relacionadas a la transferencia del cliente: `prospectorAsignado`, `closerAsignado`)*

### Actividades (Historial de Interacciones) 
Al registrar una actividad en el historial, el `tipo` ahora puede ser un valor personalizado.
- **`tipo`** (*TEXT NOT NULL*) - Acción realizada. Puede ser un valor estándar (`llamada`, `mensaje`, `correo`, `whatsapp`, `cita`) o un **valor personalizado libre** creado por el usuario (ej. "vino a consultar").
- **`resultado`** (*TEXT*) - Valores: `exitoso`, `pendiente`, `fallido`.
- *Deben contar con el ID del `vendedor` (quien hizo la acción) y el ID del `cliente`.*

---

## 3. Arquitectura y Convenciones Frontend

### Carpetas Principales (`src/`)
- **`features/`**: Contiene la lógica, componentes pesados y estado de las funcionalidades principales (ej. dashboards, calendarios, monitoreo). **Aquí vive el código reutilizable.**
- **`pages/`**: Contiene únicamente *Wrappers* o contenedores basados en rutas y roles. Por ejemplo, `pages/team/closer/CloserDashboard.jsx` simplemente importa el dashboard desde `features/` y le inyecta layouts o protecciones necesarias.
- **`layouts/`**: Separación estricta de menús de navegación. Cada rol o flujo tiene su propio layout (ej. `TeamCloserLayout`, `SoloLayout`).

### React Best Practices
1. **Componentes Funcionales y Hooks**: Prohibido el uso de *Class Components*. Siempre utilizar funciones y React Hooks (`useState`, `useEffect`, custom hooks).
2. **Estilizado**: Utilizamos **TailwindCSS** en todo el proyecto. Se deben evitar hojas de estilos CSS tradicionales en favor de las clases utilitarias de Tailwind. 
   - Utilizar el helper `cn()` de `src/utils/cn.js` para la fusión condicional de clases (clsx/tailwind-merge).
3. **Lazy Loading**: En `App.jsx`, las rutas se cargan con `React.lazy()` y `Suspense` para optimizar el bundle.

---

## 4. Integracion de Extensiones (Google Calendar)
El sistema sincroniza `citas` hacia Google Calendar.
Los tokens de los usuarios (`googleRefreshToken`, `googleAccessToken`, `googleTokenExpiry`) deben mantenerse seguros y renovarse automáticamente vía la lógica en `backend/routes/google.js`. 
Si se toca la lógica del agendador, se debe verificar rigurosamente que las horas concuerden (Manejo de Tiempos ISO 8601).
