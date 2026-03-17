# Lista de Tareas de Desarrollo - CRM

**Proyecto:** Sistema de seguimiento para prospectores  
**Fecha:** 17 de Febrero 2025  
**Propósito:** Lista para reportar avance al jefe

---

## Fase 1: Backend - Modelo de datos

- [ ] **1.1** Ampliar el modelo `Actividad` para incluir nuevos tipos de interacción
  - Agregar: `mensaje`, `correo`, `whatsapp` al enum de `tipo`
  - Opcional: agregar campo `canal` (telefono, whatsapp, email)
  
- [ ] **1.2** Actualizar las rutas de actividades para aceptar los nuevos tipos
  - Validar que `POST /api/actividades` permita los nuevos valores
  - Agregar ruta específica para prospectores si se requiere

---

## Fase 2: Sección de Seguimiento (Prospector)

- [ ] **2.1** Desarrollar la página `ProspectorSeguimiento.jsx`
  - Header con contador del día (llamadas, mensajes, citas)
  - Formulario/modal para registrar actividad rápida

- [ ] **2.2** Implementar selector de prospecto
  - Búsqueda por nombre, empresa o teléfono
  - Cargar prospectos asignados al prospector logueado

- [ ] **2.3** Implementar registro de interacciones
  - Botón/acción: Llamada realizada
  - Botón/acción: Mensaje enviado (WhatsApp/email)
  - Botón/acción: Cita agendada
  - Campo de resultado (exitoso, pendiente, fallido)
  - Campo de notas

- [ ] **2.4** Implementar timeline del día
  - Lista de actividades registradas hoy
  - Mostrar: prospecto, tipo de interacción, resultado, notas, hora
  - Opción de editar o corregir si aplica

- [ ] **2.5** Integrar con API
  - Llamar `POST /api/actividades` al registrar
  - Recargar datos al guardar
  - Manejar errores y feedback al usuario

---

## Fase 3: Dashboard y Métricas

- [ ] **3.1** Actualizar métricas del prospector
  - Incluir "Mensajes hoy" si se agregan tipos mensaje/correo
  - Verificar que las tasas de conversión se calculen bien

- [ ] **3.2** Actualizar monitoreo del closer
  - Asegurar que las nuevas interacciones aparezcan en métricas
  - Mostrar "Interacciones totales" (llamadas + mensajes)
  - Opcional: metas diarias por prospector

---

## Fase 4: UI/UX y pruebas

- [ ] **4.1** Diseño consistente con el resto de la app
  - Usar mismos componentes y estilos
  - Responsive en móvil/tablet

- [ ] **4.2** Pruebas funcionales
  - Registrar llamada → debe reflejarse en dashboard
  - Registrar mensaje → debe contarse en estadísticas
  - Registrar cita → debe actualizar embudo y monitoreo
  - Verificar permisos (solo prospectores pueden registrar en su seguimiento)

- [ ] **4.3** Documentación
  - README o guía de uso para prospectores
  - Documentar endpoints usados

---

## Prioridades sugeridas

| Prioridad | Tarea | Motivo |
|-----------|-------|--------|
| Alta | 1.1, 1.2, 2.1, 2.2, 2.3, 2.5 | Base funcional para registrar actividades |
| Media | 2.4 | Timeline mejora UX |
| Media | 3.1, 3.2 | Closer necesita ver métricas actualizadas |
| Baja | 4.1, 4.2, 4.3 | Pulido final |

---

## Cómo usar esta lista

- Marca con `[x]` las tareas completadas
- Actualiza la fecha al reportar
- Usa la sección de prioridades para enfocarte primero en lo crítico

---

*Documento generado para seguimiento del desarrollo*
