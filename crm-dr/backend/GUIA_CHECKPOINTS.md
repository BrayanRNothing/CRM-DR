# Guía de Puntos de Restauración (Checkpoints)

Esta guía explica cómo usar las herramientas de respaldo y restauración para realizar pruebas con datos masivos sin afectar permanentemente tu base de datos real.

## 📋 Flujo de Trabajo Recomendado

### 1. Crear el Checkpoint (Estado Actual)
Antes de hacer cualquier prueba, guarda el estado actual de tu base de datos.
```bash
npm run db:backup
```
*Esto creará un archivo `database_backup.db` en la carpeta `backend`.*

---

### 2. Generar Datos de Prueba
Ahora puedes llenar el CRM con prospectos ficticios para probar el rendimiento, filtros o dashboards.
```bash
npm run db:test-data
```
*Este comando crea 40 prospectos de prueba asignados al usuario ID 1.*

---

### 3. Realizar Pruebas
Interactúa con el CRM, mueve prospectos, añade notas, etc.

---

### 4. Restaurar la Base de Datos (Limpieza)
Para volver al estado exacto antes del paso 1:

1.  **DETÉN EL BACKEND**: Ve a la terminal donde corre el servidor y presiona `Ctrl + C`.
2.  **RESTAURA**: Ejecuta el siguiente comando:
    ```bash
    npm run db:restore
    ```
3.  **REINICIA**: Vuelve a subir el servidor:
    ```bash
    npm run dev:windows
    ```

## ⚠️ Notas Importantes
- **Bloqueo de archivos**: El comando `db:restore` fallará si el backend está encendido, ya que SQLite bloquea los archivos mientras están en uso.
- **Sobrescritura**: Cada vez que corres `db:backup`, se sobrescribe el checkpoint anterior. Asegúrate de respaldar solo cuando la base de datos esté "limpia".
- **Archivos extra**: Al restaurar, el script elimina automáticamente los archivos `.db-wal` y `.db-shm` para asegurar una restauración limpia.
