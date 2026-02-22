# One Spec (Root Spec)

## Objetivo
Permitir que el servidor MCP detecte y cargue prompts por defecto definidos en src/prompts.ts y nuevos prompts dinámicos en archivos JSON, sin perder funcionalidad ni estabilidad.

## Alcance / No alcance
**Alcance:**
- Carga combinada de prompts por defecto (array exportado) y prompts dinámicos (archivos JSON).
- Hot reload de nuevos archivos sin detener el servidor.
- Validación de formato y seguridad de los prompts.

**No alcance:**
- Prompts que requieran lógica compilada TypeScript (solo archivos JSON/Markdown).
- Modificación de la lógica central del servidor MCP.

## Definiciones (lenguaje de dominio)
- **Prompt por defecto:** Definido en src/prompts.ts como array exportado.
- **Prompt dinámico:** Archivo JSON en src/prompts.
- **Hot reload:** Actualización en tiempo real de recursos sin reinicio del proceso.
- **Watcher:** Servicio que detecta cambios en el sistema de archivos.

## Principios / Reglas no negociables
- No interrumpir el servicio.
- Mantener modularidad y extensibilidad.
- Validar formato y seguridad de los prompts cargados.
- Priorizar prompts por defecto y sumar los dinámicos.

## Límites
- Solo archivos estáticos (no TypeScript compilado).
- Si un prompt es inválido, se ignora y se registra el error.
- El watcher puede consumir recursos si hay muchos archivos.

## Eventos y estados (visión raíz)
- **Evento:** Se agrega/modifica/elimina un archivo de prompt dinámico.
- **Estado:** El servidor actualiza el listado de prompts en memoria y los expone en la API, sumando los por defecto y los dinámicos.

## Criterios de aceptación (root)
- El servidor detecta y expone prompts por defecto y dinámicos sin reinicio ni recompilación.
- Los prompts inválidos no afectan la operación.
- La solución funciona en entornos cloud y locales.
- La seguridad y validación de entradas se mantiene.

## Trazabilidad
- Solución basada en el análisis de informe-exploracion.md.
- Responde a la necesidad de operación continua en cloud.
- Aplica principios de modularidad, extensibilidad y seguridad.

---

### Solución técnica

1. **Carga combinada de prompts:**
   - Importa el array exportado de src/prompts.ts (prompts por defecto).
   - Usa loadPrompts() para leer archivos JSON en src/prompts (prompts dinámicos).
   - Combina ambos arrays en cada request.

2. **Hot Reload:**
   - Implementa un watcher (fs.watch) sobre la carpeta de prompts.
   - Cuando se detecta un cambio, actualiza el listado en memoria.

3. **Validación:**
   - Valida el formato y contenido de cada prompt al cargarlo dinámicamente.
   - Si hay error, ignora el prompt y registra el incidente.

#### Ejemplo de implementación (TypeScript)

```typescript
import { prompts as defaultPrompts } from "./prompts.js";
import * as fs from "fs";
import * as path from "path";

function loadDynamicPrompts(): Array<{ name: string; description: string }> {
  const promptsDir = path.join(__dirname, "prompts");
  if (!fs.existsSync(promptsDir)) return [];
  const files = fs.readdirSync(promptsDir);
  return files
    .filter(f => f.endsWith(".json"))
    .map(f => {
      const content = fs.readFileSync(path.join(promptsDir, f), "utf-8");
      try {
        return JSON.parse(content);
      } catch {
        // Log error, skip invalid prompt
        return null;
      }
    })
    .filter(Boolean);
}

function getAllPrompts() {
  return [...defaultPrompts, ...loadDynamicPrompts()];
}

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: getAllPrompts().map(p => ({
      name: p.name,
      description: p.description,
    })),
  };
});

// Hot reload watcher
const promptsDirWatch = path.join(__dirname, "prompts");
if (fs.existsSync(promptsDirWatch)) {
  fs.watch(promptsDirWatch, () => {
    console.log("Prompts dinámicos actualizados.");
  });
}
```

---

### Ventajas
- No requiere reinicio ni recompilación.
- Compatible con despliegue en nube.
- Modular y extensible.
- Los prompts por defecto siempre están disponibles.
- Los prompts dinámicos se suman sin perder funcionalidad.

### Desventajas
- Solo funciona con archivos estáticos.
- El watcher puede consumir recursos si hay muchos archivos.

### Casos de uso recomendados
- Proyectos con prompts definidos en TypeScript y JSON.
- Entornos cloud donde el reinicio es costoso.
- Operación continua y extensible.