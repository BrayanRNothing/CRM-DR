# 🚀 CRM Prospector & Closer System

Sistema de seguimiento de clientes y ventas basado en dos roles principales con permisos de superusuario.

## 📋 Descripción del Sistema

Este CRM ha sido reestructurado para operar con **2 roles únicos**:

- **🔍 Prospector (Opener)**: Encargado de la prospección, calificación de leads y agendamiento de citas.
- **🎯 Closer (Vendedor)**: Encargado del cierre de ventas, gestión de propuestas y negociaciones.

**Ambos roles tienen permisos completos** para gestionar usuarios, prospectos y clientes, diferenciándose principalmente en sus dashboards y flujos de trabajo diarios.

---

## 🔐 Roles y Permisos

| Funcionalidad | Prospector | Closer |
|--------------|------------|---------|
| ✅ Ver/Crear/Editar Usuarios | ✅ | ✅ |
| ✅ Gestión de Prospectos | ✅ | ✅ |
| ✅ Gestión de Clientes | ✅ | ✅ |
| ✅ Actividades y Tareas | ✅ | ✅ |
| ✅ Dashboard Específico | ✅ | ✅ |
| ✅ Gestión de Ajustes | ✅ | ✅ |

---

## 🚀 Estructura de Rutas

### Prospector Routes
```
/prospector
  ├─ / (Dashboard de Métricas de Prospección)
  ├─ /seguimiento
  ├─ /calendario
  ├─ /prospectos
  ├─ /clientes
  ├─ /usuarios/prospectors
  ├─ /usuarios/closers
  └─ /ajustes
```

### Closer Routes
```
/closer
  ├─ / (Dashboard de Ventas y Embudo)
  ├─ /calendario
  ├─ /prospectos
  ├─ /clientes
  ├─ /usuarios/prospectors
  ├─ /usuarios/closers
  ├─ /monitoreo-prospectors
  └─ /ajustes
```

---

## 🛠️ Gestión de Usuarios

El sistema incluye una interfaz unificada para la gestión de usuarios:
- **Ubicación**: Accesible desde el sidebar bajo "Usuarios".
- **Filtrado**: Separado en "Prospectors" y "Closers".
- **Creación**: Permite crear nuevos usuarios asignando uno de los dos roles.
- **Badges**: 
  - 🔍 Prospector (Teal)
  - 🎯 Closer (Azul)

---

## ⚙️ Backend y Seguridad

- **Autenticación**: Basada en Tokens (JWT).
- **Middleware**: `esSuperUser` protege todas las rutas críticas, permitiendo acceso a ambos roles.
- **Base de Datos**: Modelos unificados para Clientes y Actividades, accesibles por ambos roles sin restricciones de "propiedad" exclusivas (modelo colaborativo).

---

## 📝 Notas de Versión (Feb 2026)

- **Sistema 2.0**: Se eliminaron los roles antiguos `admin`, `tecnico`, `distribuidor` y `vendedor`.
- **Limpieza**: Se eliminaron archivos y rutas obsoletas.
- **Migración**: Los usuarios antiguos fueron migrados a `closer` o `prospector`.

---

**© 2026 CRM System**
