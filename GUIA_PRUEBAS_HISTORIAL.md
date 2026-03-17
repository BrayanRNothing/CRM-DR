# 🧪 GUÍA DE PRUEBAS: HISTORIAL DE INTERACCIONES MEJORADO

## 📌 RESUMEN DE CAMBIOS

Se han implementado **3 nuevos endpoints** que permiten ver el historial **COMPLETO** de interacciones entre prospector y closer:

1. `GET /api/prospector/prospecto/:id/historial-completo` ← Prospector
2. `GET /api/closer/prospecto/:id/historial-completo` ← Closer  
3. `GET /api/actividades/cliente/:clienteId/historial-completo` ← Compartido

---

## 🚀 CÓMO PROBAR

### Fase 1: Preparación

#### 1. Verificar que backend está corriendo
```bash
cd backend
npm start

# Debe mostrar:
# 🚀 Servidor corriendo en puerto 4000
```

#### 2. Verificar que frontend está corriendo
```bash
# En otra terminal
npm run dev

# Debe estar en http://localhost:5173
```

---

### Fase 2: Test Básico (Frontend)

#### Test 2.1: Prospector crea un prospecto
1. Login como **PROSPECTOR**
2. Ir a **Prospectos** → **+ Agregar prospecto**
3. Llenar datos:
   - Nombre: `Carlos López`
   - Teléfono: `555-1234`
   - Empresa: `Innovación Tech`
   - Correo: `carlos@innovacion.tech`
4. Click **Crear**

✅ **Confirmar**: Prospecto aparece en la lista

#### Test 2.2: Prospector registra actividad
1. Click en el prospecto creado
2. Click **Llamar**
3. Click **✓ Sí, contestó**
4. Click **✓ No agendó**
5. Click **✓ Sí, llamar después**
6. Ingresar fecha: `3 días de hoy`
7. Notas: `Muy interesado, quiere propuesta`
8. Click **✓ Guardar seguimiento**

✅ **Confirmar**: 
- Historial actualizado a la derecha
- Ver la actividad con tu nombre
- Etapa cambió a "En contacto"

#### Test 2.3: Ver historial (por ahora, como antes)
1. Panel derecho: **Historial de interacciones**
2. Debe mostrar:
   - 📞 Llamada exitosa (hoy, tu nombre)
   - Resultado: "Contestó ✔"
   - Notas: "Muy interesado..."

✅ **Confirmar**: Historial es preciso

---

### Fase 3: Test Backend (API)

#### Test 3.1: Cargar historial como prospector
```bash
# 1. Obtén tu token (login como prospector)
# Disponible en: localStorage → x-auth-token

TOKEN="tu_token_aqui"

# 2. Obtén el ID del prospecto creado
# Disponible en URL o en la lista

PROSPECTO_ID=42

# 3. Cargar historial completo
curl -X GET "http://localhost:4000/api/prospector/prospecto/${PROSPECTO_ID}/historial-completo" \
  -H "x-auth-token: ${TOKEN}" \
  -H "Content-Type: application/json" | jq .

# Respuesta esperada:
{
  "cliente": {
    "id": 42,
    "nombres": "Carlos",
    "apellidoPaterno": "López",
    "empresa": "Innovación Tech",
    ...
  },
  "timeline": [
    {
      "tipo": "cambio_etapa",
      "etapa": "prospecto_nuevo",
      "fecha": "2026-02-24T10:00:00Z",
      ...
    },
    {
      "tipo": "actividad",
      "tipoActividad": "llamada",
      "fecha": "2026-02-24T10:15:00Z",
      "vendedorNombre": "Juan García",
      "vendedorRol": "prospector",
      "resultado": "exitoso",
      "notas": "Muy interesado, quiere propuesta"
    }
  ],
  "resumen": {
    "totalActividades": 1,
    "etapaActual": "en_contacto",
    "vendedoresInvolucrados": ["Juan García"]
  }
}
```

✅ **Confirmar**:
- timeline es un array
- Contiene cambios de etapa
- Contiene actividades con vendedorNombre
- resumen es correcto

---

### Fase 4: Test de Transferencia (Prospector → Closer)

#### Paso 1: Prospector agenda reunión (Transferencia)
1. Como **PROSPECTOR**, en el prospecto
2. Click **Agendar Reunión**
3. Seleccionar fecha: `3 días de hoy`
4. Click **Guardar cita**

✅ **Confirmar**:
- Etapa cambió a "Reunión agendada"
- Cliente transfiere automáticamente al closer

#### Paso 2: Logout prospector, login como CLOSER

1. Logout como prospector
2. Login como **CLOSER**
3. Ir a **Prospectos**

✅ **Confirmar**:
- El prospecto "Carlos López" aparece en la lista del closer
- Muestra: "Prospector asignado: Juan García" (el prospector original)

#### Paso 3: Closer carga historial COMPLETO
```bash
# Como CLOSER

TOKEN="token_del_closer"
PROSPECTO_ID=42

curl -X GET "http://localhost:4000/api/closer/prospecto/${PROSPECTO_ID}/historial-completo" \
  -H "x-auth-token: ${TOKEN}" \
  -H "Content-Type: application/json" | jq .

# Respuesta esperada - ¡El closer VE todo lo que hizo Juan!
{
  "timeline": [
    {
      "tipo": "cambio_etapa",
      "etapa": "prospecto_nuevo",
      "descripcion": "Prospecto creado"
    },
    {
      "tipo": "actividad",
      "tipoActividad": "llamada",
      "vendedorNombre": "Juan García",
      "vendedorRol": "prospector",
      "resultado": "exitoso",
      "notas": "Muy interesado, quiere propuesta"
    },
    {
      "tipo": "cambio_etapa",
      "etapa": "en_contacto",
      "vendedorNombre": "Juan García"
    },
    {
      "tipo": "cambio_etapa",
      "etapa": "reunion_agendada",
      "descripcion": "Reunión agendada para 3 días"
    }
  ]
}
```

✅ **ÉXITO**: El closer VE la historia COMPLETA de Juan

#### Paso 4: Closer registra su propia actividad
```bash
# Como CLOSER, registrar que hizo reunión

curl -X POST "http://localhost:4000/api/closer/registrar-actividad" \
  -H "x-auth-token: ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "clienteId": 42,
    "tipo": "cita",
    "resultado": "exitoso",
    "notas": "Reunión exitosa. Cliente interesado en propuesta. Enviaré PO la próxima semana."
  }'

# Respuesta: 
{
  "msg": "Actividad registrada",
  "actividad": {
    "id": 123,
    "tipo": "cita",
    "vendedor": 2,
    "cliente": 42,
    "fecha": "2026-02-24T14:30:00Z",
    "resultado": "exitoso",
    "notas": "Reunión exitosa..."
  }
}
```

✅ **Confirmar**: Actividad registrada correctamente

#### Paso 5: Cargar historial actualizado
```bash
# Como CLOSER, cargar historial ACTUALIZADO

curl -X GET "http://localhost:4000/api/closer/prospecto/${PROSPECTO_ID}/historial-completo" \
  -H "x-auth-token: ${TOKEN}" \
  -H "Content-Type: application/json" | jq .

# Verá:
{
  "timeline": [
    // ... actividades de Juan
    {
      "tipo": "cambio_etapa",
      "etapa": "reunion_agendada"
    },
    {
      "tipo": "actividad",
      "tipoActividad": "cita",
      "vendedorNombre": "María López",  // ← EL CLOSER
      "vendedorRol": "closer",
      "resultado": "exitoso",
      "notas": "Reunión exitosa..."
    }
  ],
  "resumen": {
    "totalActividades": 2,
    "vendedoresInvolucrados": ["Juan García", "María López"]
  }
}
```

✅ **CONFIRMADO**: Timeline combina actividades de ambos

---

### Fase 5: Test Inverso (Closer visto por Prospector)

#### Paso 1: Logout closer, login como prospector
1. Logout como closer
2. Login como **PROSPECTOR** (mismo de antes)
3. Ir a **Prospectos** → Click en "Carlos López"

#### Paso 2: Ver el historial actualizado fronted
```
Historial de interacciones (lado derecho):
  ✓ 1. 📞 Llamada exitosa (tu actividad)
  ✓ 2. 📅 Reunión realizada (actividad de María López - closer)
  ✓ 3. Cambios de etapa

Resumen:
  Del Prospector: 1
  Del Closer: 1 ← ¡NUEVO! YA LO VES
  Cambios de Etapa: 3
```

✅ **ÉXITO**: El prospector AHORAvé lo que hizo el closer

#### Paso 3: Verificar con API
```bash
# Como PROSPECTOR, cargar historial

TOKEN="token_del_prospector"
PROSPECTO_ID=42

curl -X GET "http://localhost:4000/api/prospector/prospecto/${PROSPECTO_ID}/historial-completo" \
  -H "x-auth-token: ${TOKEN}" \
  -H "Content-Type: application/json" | jq .

# Verá lo que registró María ✅
```

---

## 📊 MATRIZ DE PRUEBAS

| # | Acción | Usuario | Resultado Esperado | ✅ |
|---|--------|---------|-------------------|---|
| 1 | Crear prospecto | Prospector | ✅ Prospecto creado |  |
| 2 | Registrar actividad | Prospector | ✅ Actividad guardada |  |
| 3 | Agendar reunión | Prospector | ✅ Cliente transferido a closer |  |
| 4 | GET historial | Closer | ✅ Ve historia de prospector |  |
| 5 | Registrar reunión | Closer | ✅ Actividad grabada |  |
| 6 | GET historial | Prospector | ✅ Ve actividad de closer |  |

---

## 🐛 TROUBLESHOOTING

### Problema: "Error 404 - Endpoint no encontrado"
```
✓ Verificar que backend esté actualizado
✓ Verificar que URL es correcta: /prospecto/:id/historial-completo
✓ Revisar error en consola backend
```

### Problema: "Error 403 - No tienes permiso"
```
✓ Confirmar que eres el prospector asignado
✓ Confirmar que eres el closer asignado
✓ Revisar que cliente existe (GET /api/clientes/:id)
```

### Problema: "Timeline vacío"
```
✓ Confirmar que existen actividades registradas
✓ Revisar en BD: SELECT * FROM actividades WHERE cliente = ?
✓ Verificar notas y descripciones
```

### Problema: No ve actividades del otro rol
```
✓ Confirmar que ambos están asignados (prospectorAsignado, closerAsignado)
✓ Revisar permisos en backend (líneas ~230)
✓ Hacer GET /api/clientes/:id para verificar asignaciones
```

---

## 🎯 CHECKLIST FINAL

- [ ] Backend corriendo en puerto 4000
- [ ] Frontend corriendo en puerto 5173
- [ ] Login funciona (prospector y closer)
- [ ] Crear prospecto funciona
- [ ] Registrar actividad funciona
- [ ] Agendar reunión funciona
- [ ] Transferencia automática funciona
- [ ] GET historial completo retorna timeline
- [ ] Timeline incluye actividades de prospector ✅
- [ ] Timeline incluye actividades de closer ✅
- [ ] Timeline incluye cambios de etapa ✅
- [ ] Ambos usuarios ven el mismo historial
- [ ] Sin errores 403 de permisos
- [ ] Componente HistorialInteracciones muestra filtros
- [ ] Resumen muestra conteos correctos

---

## 📹 FLUJO COMPLETO (Visual)

```
┌─────────────────────────────────────────────────┐
│ 1. PROSPECTOR CREA PROSPECTO                    │
│    Carlos López - Innovación Tech               │
│    ✅ Etapa: prospecto_nuevo                    │
└───────────────┬─────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────┐
│ 2. PROSPECTOR REGISTRA LLAMADA                  │
│    📞 Llamada exitosa                           │
│    Notas: "Muy interesado, quiere propuesta"    │
│    ✅ Etapa: en_contacto                        │
└───────────────┬─────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────┐
│ 3. PROSPECTOR AGENDA REUNIÓN                    │
│    📅 Reunión agendada (3 días)                 │
│    ✅ Etapa: reunion_agendada                   │
│    ✅ TRANSFERENCIA → CLOSER: María López       │
└───────────────┬─────────────────────────────────┘
                │
        ════════╩════════
        ║
┌───────▼──────────────────────────────────────┐
│ 4. CLOSER VE HISTORIAL COMPLETO              │
│    - Llamada de Juan (Prospector) ✅          │
│    - Cambio a "En contacto" ✅               │
│    - Cambio a "Reunión agendada" ✅          │
│    - Historial COMPLETO desde inicio ✅       │
└───────┬──────────────────────────────────────┘
        │
┌───────▼──────────────────────────────────────┐
│ 5. CLOSER REALIZA REUNIÓN                    │
│    📅 Reunión exitosa                         │
│    Notas: "Cliente interesado..."            │
│    ✅ Etapa: en_negociacion                   │
└───────┬──────────────────────────────────────┘
        │
        ════════╦════════
        ║
┌───────▼──────────────────────────────────────┐
│ 6. PROSPECTOR VE ACTIVIDAD DEL CLOSER        │
│    - VE la reunión de María ✅                │
│    - VE el cambio a negociación ✅            │
│    - TIMELINE COMPLETO UNIFICADO ✅           │
│                                               │
│    🎉 ¡HISTORIAL PRECISO Y COMPLETO!         │
└───────────────────────────────────────────────┘
```

---

## ✅ RESULTADO ESPERADO

**Ante**: Historial fragmentado, data missing  
**Después**: ✨ Historial UNIFICADO, PRECISO, COMPLETO

```
Timeline Unificado = Prospector activities + Closer activities + Etapa changes
                   = Mejor seguimiento
                   = Más contexto
                   = Mejor CRM
```

---

**Versión**: 1.0  
**Creado**: 2026-02-24  
**Estado**: ✅ LISTO PARA PROBAR
