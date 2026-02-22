# Propuesta de Refactorización: Separación de Tools en MCP Prompts Server

## Objetivo
Separar la lógica de tools (handlers, validaciones y persistencia) del archivo principal `src/index.ts` en módulos independientes, mejorando mantenibilidad, escalabilidad y cumplimiento de principios SOLID, KISS y DRY.

---

## Análisis del Código Actual
- **Ubicación:** Toda la lógica de tools (`guardar-prompt`, validaciones, escritura de archivos) está embebida en `src/index.ts`.
- **Code Smells:**
  - **God File:** El archivo index.ts concentra demasiada responsabilidad.
  - **Duplicación:** Validaciones y lógica de persistencia pueden repetirse si se agregan más tools.
  - **Acoplamiento:** Cambios en tools afectan el core del servidor.
  - **Escalabilidad limitada:** Agregar nuevas tools implica modificar el archivo principal.
- **Principios afectados:**
  - **SRP (Single Responsibility):** Violado, index.ts hace de router, lógica de negocio y persistencia.
  - **OCP (Open/Closed):** No es fácil extender con nuevas tools sin modificar el core.
  - **KISS/DRY:** Lógica repetida y estructura monolítica.

---

## Propuesta de Refactor

### 1. Crear un directorio `src/tools/`
- Cada tool será un módulo independiente (ej: `guardarPromptTool.ts`).
- Un archivo `index.ts` en `src/tools/` exportará todas las tools disponibles.

### 2. Estructura sugerida
```
src/
  index.ts
  prompts.ts
  templates/
  tools/
    index.ts
    guardarPromptTool.ts
    ...otrasTools.ts
```

### 3. Ejemplo de tool modularizada
**src/tools/guardarPromptTool.ts**
```typescript
import * as fs from "fs";
import * as path from "path";
import { ToolHandler } from "./types"; // Define un tipo para handlers de tools

export const guardarPromptTool: ToolHandler = async (request, context) => {
  // ...lógica de validación y persistencia aquí...
};
```

**src/tools/index.ts**
```typescript
import { guardarPromptTool } from "./guardarPromptTool";
export const tools = [guardarPromptTool /*, ...otrasTools */];
```

### 4. Cambios en `src/index.ts`
- Importar y registrar las tools desde `src/tools`.
- El handler de `CallToolRequestSchema` solo reenvía la petición a la tool correspondiente.

---

## Plan de Pruebas
- **Unitarias:**
  - Validar cada tool de forma aislada (inputs válidos/erróneos, persistencia, duplicados).
- **Integración:**
  - Probar el flujo completo desde la API hasta la persistencia.
- **Regresión:**
  - Asegurar que los prompts por defecto y dinámicos siguen funcionando.

## Métricas comparativas
| Métrica                | Antes (Monolítico) | Después (Modular) |
|------------------------|--------------------|-------------------|
| Complejidad index.ts   | Alta               | Baja              |
| Facilidad de extensión | Baja               | Alta              |
| Testeabilidad          | Baja               | Alta              |
| Acoplamiento           | Alto               | Bajo              |
| SRP/OCP                | Violados           | Cumplidos         |

---

## Manual para la IA (Ejecución del Refactor)
1. Crea la carpeta `src/tools/`.
2. Extrae la lógica de cada tool a un archivo propio.
3. Define un tipo base para los handlers de tools.
4. Exporta todas las tools desde `src/tools/index.ts`.
5. Modifica `src/index.ts` para importar y registrar las tools dinámicamente.
6. Asegura que los tests y la funcionalidad no se rompan.

---

**Con este refactor, el servidor será más mantenible, escalable y robusto ante cambios futuros.**
