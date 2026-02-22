# 📊 Informe de Cobertura de Tests Unitarios

**Proyecto:** `mcp-prompts-server`  
**Fecha:** 2026-02-22  
**Analista:** GitHub Copilot  

---

## 🔴 Resumen Ejecutivo

| Métrica | Valor |
|---|---|
| **Cobertura total** | **0 %** |
| Archivos con tests | 0 / 5 |
| Líneas testeables | ~180 |
| Líneas cubiertas | 0 |
| Framework de testing | ❌ No instalado |
| Script `test` en package.json | ⚠️ Solo imprime error |

> El proyecto **no tiene ningún test unitario**. No existen archivos `.test.ts`, `.spec.ts`, ni directorio `__tests__/` o `test/`.

---

## 📁 Inventario de Archivos Fuente

| Archivo | Líneas totales | Líneas testeables | Cobertura |
|---|---|---|---|
| `src/index.ts` | 259 | ~160 | 0 % |
| `src/prompts.ts` | 30 | ~5 | 0 % |
| `src/templates/index.ts` | 17 | ~5 | 0 % |
| `src/templates/*.template.ts` (×7) | ~14 | 0 (solo datos) | N/A |
| **Total** | **~320** | **~170** | **0 %** |

---

## 🔍 Análisis por Módulo

### `src/index.ts` — Crítico (prioridad alta)

Este archivo concentra **toda la lógica de negocio** del servidor. Contiene 5 bloques testeables:

#### 1. `fillTemplate(template, args)` — Sustitución de variables
```typescript
const fillTemplate = (template: any, args: any) => { ... }
```
| Escenario | ¿Cubierto? |
|---|---|
| Sustituye `{{clave}}` con valor proporcionado | ❌ |
| Clave ausente → inserta placeholder | ❌ |
| Valor vacío `""` → inserta placeholder | ❌ |
| Múltiples claves en un template | ❌ |
| Template sin variables | ❌ |

#### 2. Handler `ListPromptsRequestSchema`
| Escenario | ¿Cubierto? |
|---|---|
| Retorna todos los prompts del array | ❌ |
| Solo expone `name` y `description` (no otros campos) | ❌ |

#### 3. Handler `GetPromptRequestSchema`
| Escenario | ¿Cubierto? |
|---|---|
| Prompt válido → devuelve contenido con template | ❌ |
| Nombre no existe → lanza error | ❌ |
| Template no existe → lanza error | ❌ |
| Args son sustituidos correctamente en el template | ❌ |

#### 4. Handler `ListToolsRequestSchema`
| Escenario | ¿Cubierto? |
|---|---|
| Retorna herramienta `guardar-prompt` | ❌ |
| Schema de inputs es correcto | ❌ |

#### 5. Handler `CallToolRequestSchema` → `guardar-prompt` — **Crítico**
| Escenario | ¿Cubierto? |
|---|---|
| Nombre con formato inválido (mayúsculas, espacios) → error | ❌ |
| Nombre ya existente → error de duplicado | ❌ |
| Herramienta desconocida → lanza error | ❌ |
| Guardado exitoso → crea archivo `.template.ts` | ❌ |
| Guardado exitoso → actualiza `prompts.ts` | ❌ |
| Guardado exitoso → actualiza `templates/index.ts` | ❌ |
| Fallo al escribir `prompts.ts` → rollback del template | ❌ |
| Fallo al escribir `templates/index.ts` → rollback completo | ❌ |
| Tras guardar, el prompt aparece en memoria (`prompts.push`) | ❌ |
| Tras guardar, el template es accesible en `templates[name]` | ❌ |
| Conversión camelCase: `mi-prompt` → `miPromptTemplate` | ❌ |

---

### `src/prompts.ts` — Datos (prioridad baja)

| Escenario | ¿Cubierto? |
|---|---|
| Todos los prompts tienen `name` y `description` | ❌ |
| No hay nombres duplicados en el array | ❌ |

---

### `src/templates/index.ts` — Datos (prioridad baja)

| Escenario | ¿Cubierto? |
|---|---|
| Cada key del objeto `templates` corresponde a un prompt en `prompts.ts` | ❌ |
| Todos los templates exportan una cadena de texto | ❌ |

---

## 🛣️ Hoja de Ruta para Aumentar Cobertura

### Paso 1 — Instalar framework de testing

Se recomienda **Vitest** por su compatibilidad nativa con TypeScript y CJS/ESM:

```bash
npm install --save-dev vitest @vitest/coverage-v8
```

Agregar en `package.json`:
```json
"scripts": {
  "test": "vitest run",
  "test:coverage": "vitest run --coverage"
}
```

### Paso 2 — Estructura de archivos de tests propuesta

```
src/
  __tests__/
    fillTemplate.test.ts          → tests de la función auxiliar
    listPrompts.test.ts           → handler ListPromptsRequestSchema
    getPrompt.test.ts             → handler GetPromptRequestSchema
    guardarPrompt.test.ts         → handler CallToolRequestSchema (más complejo)
    prompts.integrity.test.ts     → integridad del array de prompts
    templates.integrity.test.ts   → integridad del objeto templates
```

### Paso 3 — Priorización por riesgo

| Prioridad | Módulo / Función | Motivo |
|---|---|---|
| 🔴 Alta | `guardar-prompt` (CallToolRequest) | Lógica compleja, I/O, rollback, mutación de estado |
| 🔴 Alta | `fillTemplate` | Función pura, fácil de testear, usada en todos los prompts |
| 🟡 Media | `GetPromptRequestSchema` | Camino crítico de uso del servidor |
| 🟡 Media | `ListPromptsRequestSchema` | Verificar que no se exponga información extra |
| 🟢 Baja | `prompts.ts` / `templates/index.ts` | Datos estáticos, menor riesgo |

### Paso 4 — Objetivo de cobertura recomendado

| Fase | Meta de cobertura | Archivos incluidos |
|---|---|---|
| Sprint 1 | ≥ 60 % | `fillTemplate` + `guardar-prompt` |
| Sprint 2 | ≥ 80 % | + `GetPrompt` + `ListPrompts` |
| Sprint 3 | ≥ 90 % | + integridad de datos |

---

## 📌 Ejemplo de test de alta prioridad

```typescript
// src/__tests__/guardarPrompt.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';

vi.mock('fs');

describe('guardar-prompt: validación', () => {
  it('rechaza nombres con mayúsculas', async () => {
    // ...
  });

  it('rechaza nombres duplicados', async () => {
    // ...
  });

  it('hace rollback si falla la escritura de prompts.ts', async () => {
    vi.spyOn(fs, 'writeFileSync')
      .mockImplementationOnce(() => {}) // template OK
      .mockImplementationOnce(() => { throw new Error('disk full'); }); // prompts.ts falla
    // verificar que el template fue eliminado
  });
});
```

---

## ✅ Conclusión

El proyecto está **funcionalmente completo** pero con **riesgo técnico alto** al no tener tests. La lógica más crítica — la operación atómica de escritura en disco de `guardar-prompt` — no tiene ninguna salvaguarda automatizada. Una regresión en la lógica de rollback o en los patrones regex de inyección de código podría corromper silenciosamente los archivos fuente del servidor.

**Acción inmediata recomendada:** instalar Vitest y cubrir primero `fillTemplate` y los escenarios de error/rollback de `guardar-prompt`.
