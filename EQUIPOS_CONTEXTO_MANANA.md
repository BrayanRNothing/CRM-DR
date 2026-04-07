# 🚀 Contexto para Mañana — Sistema de Equipos

**Fecha de análisis**: 2026-04-06  
**Estado**: Plan aprobado, listo para implementar

---

## 📋 Archivos de referencia ya creados

| Archivo | Contenido |
|---|---|
| `EQUIPOS_IMPLEMENTATION_PLAN.md` | El plan completo en 12 pasos, listo para seguir |
| `EQUIPOS_PLAN_ANALYSIS.md` | Análisis crítico del plan original (para referencia) |

---

## 🧠 Contexto técnico importante (no volver a investigar)

- **Base de datos**: PostgreSQL en Railway (NO SQLite — completamente eliminado)
- **Auto-migrator**: Todo cambio de BD va dentro de `database.js → initDb() → colsMissingPg`
- **JWT**: Expira en 7 días. Los tokens viejos sin `equipo_id` necesitan manejo graceful
- **Archivos de rutas**: 7 archivos relevantes (`prospector.js`, `closer.js`, `clientes.js`, `tareas.js`, `actividades.js`, `google.js`, `usuarios.js`)
- **WebSockets**: En `server.js`, `io.emit()` global → cambiar a `io.to("team_X").emit()`
- **Frontend**: El calendario en `ProspectorCalendario.jsx` se arregla SOLO cuando el backend filtre `/api/usuarios` por equipo

---

## ✅ Primer paso al abrir mañana

**Empezar por el paso 3 del plan** → `routes/usuarios.js` (5 minutos de trabajo, arreglo inmediato del calendario).

Luego continuar en orden del plan del 1 al 12.

---

## 📍 Orden de los 12 pasos

1. `database.js` → tabla equipos + columnas + migración
2. `middleware/auth.js` + `routes/auth.js` → equipo_id en JWT y registro
3. `routes/usuarios.js` → filtrar por equipo_id ⚡ **IMPACTO INMEDIATO**
4. `routes/equipos.js` → archivo nuevo (4 endpoints)
5. `server.js` → registrar ruta + WebSocket rooms
6. `routes/prospector.js` → filtrar por equipo_id
7. `routes/closer.js` → filtrar por equipo_id
8. `routes/clientes.js` → filtrar por equipo_id
9. `routes/tareas.js` → agregar equipo_id al insertar
10. `routes/google.js` → validar equipo en freebusy
11. `utils/authUtils.js` → incluir equipo_id
12. Nuevo componente `GestionEquipo.jsx` → UI para gestionar el equipo

---

## ⏱️ Tiempo estimado total: ~3.5 - 4 horas
