# Doctor CRM

Un sistema CRM especializado y simplificado para profesionales de la salud (Doctores). Permite la gestión centralizada de pacientes, citas médicas, interacciones, y seguimiento de tratamientos.

El sistema se compone de un frontend desarrollado en **React** (Vite) y un backend en **Node.js** con **Express**, utilizando **SQLite** para desarrollo local y preparado para **PostgreSQL** en producción.

## Características Principales

*   **Gestión de Pacientes:** Registro detallado de pacientes, historial médico básico y datos de contacto.
*   **Gestión de Citas:** Programación de consultas médicas y recordatorios.
*   **Historial de Interacciones:** Registro cronológico de todas las interacciones con el paciente (consultas, llamadas, mensajes).
*   **Interfaz de Rol Único:** Diseñado para un solo rol (Doctor), eliminando la complejidad de sistemas multi-rol.
*   **Dashboard e Indicadores:** Resumen visual de citas del día y métricas principales.

---

## 🚀 Requisitos Previos

*   [Node.js](https://nodejs.org/) (v16 o superior)
*   [npm](https://www.npmjs.com/) o [yarn](https://yarnpkg.com/)

---

## ⚙️ Configuración del Entorno de Desarrollo

El proyecto está dividido en dos partes principales: la carpeta raíz para el **Frontend** y la carpeta `backend/` para la **API**.

### 1. Clonar el repositorio

```bash
git clone https://github.com/BrayanRNothing/CRM-DR.git
cd CRM-DR
```

### 2. Configuración del Backend (API)

```bash
# Entrar a la carpeta del backend
cd backend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
```

**Variables de entorno principales (`backend/.env`):**

Asegúrate de editar el archivo `.env` recién creado. Para desarrollo local con SQLite, la configuración por defecto es suficiente:

```env
PORT=4000
NODE_ENV=development
JWT_SECRET=tu_secreto_super_seguro_jwt
# DEFAULT_EMAIL=doctor@mimedico.com (Opcional)
```
*(Nota: Si omites `DATABASE_URL`, el sistema usará SQLite automáticamente para facilitar el desarrollo local).*

**Iniciar el servidor backend:**

```bash
# Modo desarrollo con auto-recarga
npm run dev

# Modo producción
npm start
```
*El backend se ejecutará por defecto en `http://localhost:4000`.*

### 3. Configuración del Frontend

Abre una **nueva terminal** y navega a la raíz del proyecto.

```bash
# En la raíz del proyecto (CRM-DR)
npm install

# Configurar variables de entorno del frontend
cp .env.example .env
```

**Variables de entorno del frontend (`.env` en la raíz):**

Verifica que el archivo `.env` apunte a la URL correcta de tu backend local:

```env
VITE_API_URL=http://localhost:4000
```

**Iniciar el servidor frontend:**

```bash
npm run dev
```
*La aplicación estará disponible en `http://localhost:5173`.*

---

## 🗄️ Base de Datos Local

Al ejecutar el backend por primera vez en local (sin `DATABASE_URL`), se creará automáticamente un archivo `database.db` (SQLite) en la carpeta raíz del proyecto. El script de inicialización también creará un usuario administrador/doctor predeterminado.

Puedes revisar la consola del backend al arrancar para ver los datos de acceso predeterminados o generarlos usando los scripts ubicados en `backend/`.

---

## 📚 Documentación Adicional e Historial

Toda la documentación heredada, guías de despliegue en Railway/Vercel, y notas sobre fixes anteriores han sido archivadas para mantener limpio este directorio principal.

Puedes consultarlas en la carpeta: `docs/legacy/`
