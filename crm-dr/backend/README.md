# Backend CRM Infiniguard SYS

API REST para el sistema CRM con autenticación JWT y control de roles.

## 🚀 Instalación

```bash
cd backend
npm install
```

## ⚙️ Configuración

Crear archivo `.env` (opcional) con:

```env
PORT=4000
JWT_SECRET=tu_clave_secreta_super_segura
NODE_ENV=development
```

La base de datos es **SQLite** y se crea automáticamente en `backend/database.db`. No necesitas instalar MongoDB.

## 📦 Iniciar Servidor

```bash
# 1. Instalar dependencias
npm install

# 2. (Opcional) Cargar datos de prueba
npm run seed

# 3. Iniciar
npm run dev   # desarrollo
npm start     # producción
```

**Credenciales de prueba** (después de `npm run seed`):
- Prospector: `prospector` / `prospector123`
- Closer: `closer` / `closer123`
- Admin: `admin` / `admin123`

## 📡 Endpoints

### Autenticación
- `POST /api/auth/login` - Login de usuario
- `GET /api/auth/me` - Obtener usuario actual (requiere token)

### Usuarios (Admin)
- `GET /api/usuarios` - Listar vendedores
- `POST /api/usuarios` - Crear vendedor
- `PUT /api/usuarios/:id` - Actualizar vendedor
- `DELETE /api/usuarios/:id` - Desactivar vendedor

### Clientes
- `GET /api/clientes` - Listar clientes
- `GET /api/clientes/:id` - Obtener cliente
- `POST /api/clientes` - Crear cliente
- `PUT /api/clientes/:id` - Actualizar cliente
- `DELETE /api/clientes/:id` - Eliminar cliente (Admin)

### Actividades
- `GET /api/actividades` - Listar actividades
- `POST /api/actividades` - Registrar actividad
- `PUT /api/actividades/:id` - Actualizar actividad

### Ventas
- `GET /api/ventas` - Listar ventas
- `POST /api/ventas` - Registrar venta

### Tareas
- `GET /api/tareas` - Listar tareas
- `POST /api/tareas` - Crear tarea
- `PUT /api/tareas/:id` - Actualizar tarea
- `DELETE /api/tareas/:id` - Eliminar tarea

### Métricas
- `GET /api/metricas/vendedor` - Métricas del vendedor actual
- `GET /api/metricas/admin` - Métricas globales (Admin)
- `GET /api/metricas/vendedores` - Métricas por vendedor (Admin)

## 🔐 Autenticación

Todas las rutas (excepto login) requieren token JWT en el header:

```
Authorization: Bearer <token>
```

## 👥 Roles

- **admin**: Acceso completo al sistema
- **vendedor**: Acceso a sus propios clientes y actividades
