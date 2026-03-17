# 🚀 CRM-DR - Base Template

## 📋 Descripción

Esta es una plantilla base reutilizable para sistemas CRM personalizados. El sistema ha sido limpiado de toda lógica de negocio específica, conexiones a backend y base de datos, dejando solo la estructura fundamental y componentes UI reutilizables.

## ✨ Características

### ✅ Lo que INCLUYE:
- 🎨 **Sistema de autenticación** (Login/Register)
- 👥 **4 roles predefinidos**: Admin, Técnico, Distribuidor, Cliente
- 🎯 **Layouts responsivos** con navegación por rol
- 🧩 **Componentes UI reutilizables**
- 📊 **Dashboards base** (plantillas vacías listas para personalizar)
- ⚙️ **Gestión de usuarios** (estructura base)
- 🔧 **Página de ajustes** (estructura base)
- 🎨 **Diseño moderno** con Vanta.js backgrounds
- 🔔 **Sistema de notificaciones** (react-hot-toast)

### ❌ Lo que NO incluye (eliminado):
- ❌ Backend/API
- ❌ Base de datos
- ❌ Lógica de negocio específica
- ❌ Módulos de documentos, servicios, cotizaciones, comisiones
- ❌ Configuraciones de deployment (Railway, Vercel)

## 🏗️ Estructura del Proyecto

```
src/
├── pages/
│   ├── auth/           # Login y Register
│   ├── admin/          # Dashboard Admin, Usuarios, Ajustes
│   ├── tecnico/        # Panel Técnico
│   ├── distribuidor/   # Panel Distribuidor
│   └── cliente/        # Panel Cliente
├── layouts/            # Layouts por rol con navegación
├── components/
│   └── ui/            # Componentes reutilizables
└── utils/             # Utilidades (authUtils, helpers)
```

## 🚀 Cómo Usar Esta Plantilla

### 1. Instalación
```bash
npm install
```

### 2. Desarrollo
```bash
npm run dev
```

### 3. Personalización

#### A. Conectar tu Backend
1. Crea tu archivo de configuración API en `src/config/api.js`
2. Define tu `API_URL` según tu entorno
3. Actualiza las llamadas en los componentes que necesites

#### B. Personalizar Dashboards
- **Admin**: Edita `src/pages/admin/AdminDashboard.jsx`
- **Técnico**: Edita `src/pages/tecnico/TecnicoHome.jsx`
- **Distribuidor**: Edita `src/pages/distribuidor/DistribuidorHome.jsx`
- **Cliente**: Edita `src/pages/cliente/ClienteHome.jsx`

#### C. Agregar Nuevas Páginas
1. Crea tu componente en la carpeta correspondiente
2. Agrega la ruta en `src/App.jsx`
3. Agrega el enlace de navegación en el Layout correspondiente

#### D. Modificar Roles
- Edita los layouts en `src/layouts/` para cambiar la navegación
- Actualiza las rutas en `src/App.jsx`

## 🎨 Tecnologías Incluidas

- ⚛️ **React 18** con Vite
- 🎨 **TailwindCSS** (via CDN en index.html)
- 🌊 **Vanta.js** (efectos de fondo animados)
- 🔥 **React Hot Toast** (notificaciones)
- 🛣️ **React Router** (navegación)
- 🎭 **Three.js** (para Vanta backgrounds)

## 📝 Notas Importantes

- ⚠️ **Autenticación**: Actualmente usa `sessionStorage` local. Implementa tu propio sistema de autenticación con tu backend.
- 🔒 **Seguridad**: Implementa validaciones y protección de rutas según tus necesidades.
- 📱 **Responsive**: Todos los layouts están optimizados para móvil y desktop.

## 🎯 Próximos Pasos Recomendados

1. **Configurar Backend**: Conecta tu API/Backend
2. **Definir Modelos**: Crea tus modelos de datos
3. **Implementar Lógica**: Agrega la lógica de negocio específica
4. **Personalizar UI**: Adapta colores, logos y branding
5. **Agregar Funcionalidades**: Implementa los módulos que necesites

## 📄 Licencia

Plantilla libre para uso personal y comercial.

---

**¡Listo para construir tu CRM personalizado! 🚀**
