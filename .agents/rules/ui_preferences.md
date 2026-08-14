---
name: "Preferencias de Diseño UI - Dashboard"
description: "Estilos visuales que no se deben usar en la interfaz de usuario."
---

# Reglas de Diseño de UI

1. **Efectos de Hover en Tarjetas / Cuadros**:
   - **NUNCA** utilices el estilo de "línea en el borde" o "borde de color" (ej. un `div` absoluto que simula una línea de color en la parte superior o lateral) al hacer hover sobre tarjetas o botones grandes. El usuario detesta este estilo y lo considera "feo".
   - Prefiere efectos más sutiles como:
     - Escalar ligeramente el ícono (`group-hover:scale-110`).
     - Sombras muy suaves y desenfocadas.
     - Cambios sutiles en el color del ícono y del texto, manteniendo el fondo de la tarjeta limpio y minimalista.
     - Pequeñas elevaciones (`-translate-y-1`).
   - Evita llenar todo el fondo con colores muy fuertes o sólidos. Si usas un fondo en hover, que sea extremadamente sutil (ej. `/5` o `/10` de opacidad de Tailwind).
