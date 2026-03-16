# Plan de Trabajo: Acceso Controlado a Archivos Externos para Copilot

**Fecha de creación:** 11 de marzo de 2026  
**Proyecto:** MCP Prompts Server  
**Objetivo:** Implementar sistema de herramientas MCP que permita a Copilot acceder de forma controlada y segura a archivos externos del sistema de archivos local

---

## Contexto del Problema

El servidor MCP actual:
- ✅ Tiene infraestructura de herramientas lista (`src/tools/types.ts`, `src/tools/index.ts`)
- ✅ Soporta el protocolo MCP con handlers para `tools/list` y `tools/call`
- ❌ No tiene herramientas implementadas (array `tools` vacío)
- ❌ No puede acceder a archivos fuera del workspace actual

**Necesidad:**
Permitir que Copilot examine archivos y repositorios externos con control de permisos explícito del usuario, para:
- Analizar code en otros repositorios
- Comparar implementaciones entre proyectos
- Buscar conexiones entre múltiples codebases
- Modificar archivos en ubicaciones autorizadas

---

## Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────┐
│           Copilot (Cliente MCP)                     │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│    Servidor MCP (src/index.ts / server-http.ts)    │
│    - ListToolsRequest                               │
│    - CallToolRequest                                │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│         Tools Registry (src/tools/index.ts)         │
│   - read-external-file                              │
│   - list-external-directory                         │
│   - search-in-external-files                        │
│   - get-file-info                                   │
│   - read-multiple-files                             │
│   - watch-external-directory                        │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│    Permission Manager (nuevo módulo)                │
│    - allowedPaths.json (whitelist)                  │
│    - validatePath(path)                             │
│    - addAllowedPath(path)                           │
│    - removeAllowedPath(path)                        │
│    - listAllowedPaths()                             │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│              Sistema de Archivos                    │
│         (fs, fs/promises, path, glob)               │
└─────────────────────────────────────────────────────┘
```

---

## Fase 1: Configuración de Sistema de Permisos

### Objetivo
Crear infraestructura para gestionar rutas autorizadas con persistencia y validación

### Tareas

#### 1.1 Crear estructura de configuración
- [ ] Crear archivo `src/config/permissions-config.ts`
  - Definir interfaz `PermissionConfig` con propiedades:
    - `allowedPaths: string[]`
    - `maxFileSize: number`
    - `allowedExtensions: string[]`
    - `blockedPatterns: string[]`
  - Exportar configuración por defecto

#### 1.2 Crear archivo de permisos persistente
- [ ] Crear archivo `allowedPaths.json` en la raíz del proyecto
  - Estructura inicial:
    ```json
    {
      "version": "1.0.0",
      "allowedPaths": [],
      "lastUpdated": "",
      "settings": {
        "maxFileSize": 10485760,
        "allowedExtensions": ["*"],
        "blockedPatterns": ["node_modules", ".git", "dist", "build"]
      }
    }
    ```
  - Añadir a `.gitignore` para proteger rutas privadas

#### 1.3 Implementar Permission Manager
- [ ] Crear archivo `src/permissions/permission-manager.ts`
- [ ] Implementar función `loadPermissions()`: Lee `allowedPaths.json`
- [ ] Implementar función `savePermissions(config)`: Guarda cambios en `allowedPaths.json`
- [ ] Implementar función `validatePath(targetPath)`: 
  - Verifica si la ruta está en la whitelist
  - Normaliza rutas (resolve absoluto)
  - Verifica que no contenga patrones bloqueados
  - Retorna `{ allowed: boolean, reason?: string }`

#### 1.4 Implementar gestión de rutas autorizadas
- [ ] En `permission-manager.ts`, crear función `addAllowedPath(path)`:
  - Verifica que la ruta existe
  - Normaliza la ruta
  - Añade a la lista si no existe
  - Guarda cambios
- [ ] Crear función `removeAllowedPath(path)`: Elimina de whitelist
- [ ] Crear función `listAllowedPaths()`: Retorna lista completa con metadata
- [ ] Crear función `clearAllowedPaths()`: Limpia toda la whitelist (con confirmación)

#### 1.5 Añadir validaciones de seguridad
- [ ] En `validatePath()`, implementar:
  - Detección de path traversal (`../`, `..\`)
  - Validación de rutas absolutas vs relativas
  - Verificación de permisos de lectura del sistema
  - Límite de tamaño de archivo (configurable)
- [ ] Crear función `isPathSafe(path)`: Valida caracteres y patrones peligrosos
- [ ] Crear lista negra de rutas sensibles del sistema (ej: `C:\Windows\System32`, `/etc`, `/sys`)

---

## Fase 2: Implementación de Herramientas Básicas

### Objetivo
Crear herramientas MCP fundamentales para lectura de archivos externos

### Tareas

#### 2.1 Crear herramienta: read-external-file
- [ ] Crear archivo `src/tools/read-external-file.tool.ts`
- [ ] Definir metadata:
  ```typescript
  {
    name: "read-external-file",
    description: "Lee el contenido de un archivo externo autorizado",
    inputSchema: {
      type: "object",
      properties: {
        filePath: { type: "string", description: "Ruta absoluta del archivo" },
        encoding: { type: "string", default: "utf-8" }
      },
      required: ["filePath"]
    }
  }
  ```
- [ ] Implementar lógica:
  - Validar ruta con `validatePath()`
  - Leer contenido con `fs.promises.readFile()`
  - Manejar errores (archivo no encontrado, permisos, tamaño excedido)
  - Retornar contenido + metadata (tamaño, última modificación)

#### 2.2 Crear herramienta: list-external-directory
- [ ] Crear archivo `src/tools/list-external-directory.tool.ts`
- [ ] Definir metadata:
  ```typescript
  {
    name: "list-external-directory",
    description: "Lista contenido de un directorio externo autorizado",
    inputSchema: {
      type: "object",
      properties: {
        dirPath: { type: "string" },
        recursive: { type: "boolean", default: false },
        filter: { type: "string", description: "Patrón glob (ej: *.ts)" }
      },
      required: ["dirPath"]
    }
  }
  ```
- [ ] Implementar lógica:
  - Validar directorio con `validatePath()`
  - Listar con `fs.promises.readdir()` o `glob` si recursive=true
  - Aplicar filtro si se proporciona
  - Retornar array de archivos con metadata (nombre, tipo, tamaño, fecha)

#### 2.3 Crear herramienta: get-file-info
- [ ] Crear archivo `src/tools/get-file-info.tool.ts`
- [ ] Definir metadata para obtener info sin leer contenido completo
- [ ] Implementar lógica:
  - Validar ruta con `validatePath()`
  - Obtener stats con `fs.promises.stat()`
  - Retornar metadata completa:
    - Tamaño en bytes y formato legible
    - Fechas (creación, modificación, acceso)
    - Tipo (archivo/directorio/symlink)
    - Extensión
    - Permisos

#### 2.4 Añadir soporte para múltiples archivos
- [ ] Crear herramienta `read-multiple-files`
- [ ] Definir inputSchema con array de rutas
- [ ] Implementar lectura en batch:
  - Validar todas las rutas primero
  - Leer archivos en paralelo con `Promise.all()`
  - Manejar errores individuales sin fallar todo el batch
  - Retornar array de resultados con `{path, content, error?}`

#### 2.5 Implementar caché de lectura
- [ ] Crear módulo `src/tools/file-cache.ts`
- [ ] Implementar LRU cache simple:
  - Máximo 50 archivos en caché
  - TTL de 5 minutos
  - Invalidación por cambio de timestamp
- [ ] Integrar caché en `read-external-file` y `read-multiple-files`
- [ ] Añadir herramienta `clear-file-cache` para limpiar manualmente

---

## Fase 3: Herramientas Avanzadas de Análisis

### Objetivo
Implementar capacidades de búsqueda y análisis profundo en código externo

### Tareas

#### 3.1 Crear herramienta: search-in-external-files
- [ ] Crear archivo `src/tools/search-in-external-files.tool.ts`
- [ ] Definir metadata:
  ```typescript
  {
    name: "search-in-external-files",
    description: "Busca texto o regex en archivos externos",
    inputSchema: {
      type: "object",
      properties: {
        searchPath: { type: "string", description: "Directorio base" },
        query: { type: "string", description: "Texto o regex a buscar" },
        isRegex: { type: "boolean", default: false },
        filePattern: { type: "string", description: "Filtro de archivos (*.ts, *.js)" },
        maxResults: { type: "number", default: 100 }
      },
      required: ["searchPath", "query"]
    }
  }
  ```
- [ ] Implementar algoritmo de búsqueda:
  - Listar archivos con glob basado en `filePattern`
  - Validar cada archivo con `validatePath()`
  - Buscar en cada archivo línea por línea
  - Retornar resultados con contexto (línea, número, archivo)

#### 3.2 Crear herramienta: analyze-external-project
- [ ] Crear archivo `src/tools/analyze-external-project.tool.ts`
- [ ] Definir metadata para análisis de estructura de proyecto
- [ ] Implementar análisis:
  - Detectar tipo de proyecto (package.json, pom.xml, etc.)
  - Generar árbol de directorios
  - Contar archivos por extensión
  - Identificar archivos principales (entry points)
  - Analizar dependencias (según tipo de proyecto)
  - Detectar frameworks y librerías usadas

#### 3.3 Crear herramienta: compare-files
- [ ] Crear archivo `src/tools/compare-files.tool.ts`
- [ ] Definir inputSchema con dos rutas de archivo
- [ ] Implementar comparación:
  - Leer ambos archivos
  - Generar diff básico (líneas añadidas/eliminadas/modificadas)
  - Calcular similitud (algoritmo básico ej: Levenshtein ratio)
  - Retornar comparación estructurada

#### 3.4 Crear herramienta: extract-symbols
- [ ] Crear archivo `src/tools/extract-symbols.tool.ts`
- [ ] Definir metadata para extraer funciones/clases/métodos
- [ ] Implementar extracción básica con regex:
  - TypeScript/JavaScript: funciones, clases, interfaces, exports
  - Java: clases, métodos, interfaces
  - Python: funciones, clases
  - Retornar lista de símbolos con líneas de código

#### 3.5 Crear herramienta: find-dependencies
- [ ] Crear archivo `src/tools/find-dependencies.tool.ts`
- [ ] Implementar análisis de imports/requires:
  - Buscar statements de import en archivos
  - Identificar dependencias internas vs externas
  - Generar grafo básico de dependencias
  - Detectar dependencias circulares

---

## Fase 4: Integración con Servidor MCP

### Objetivo
Registrar herramientas en el servidor y asegurar funcionamiento con Copilot

### Tareas

#### 4.1 Registrar herramientas en tools/index.ts
- [ ] Importar todas las herramientas creadas en `src/tools/index.ts`
- [ ] Añadir cada herramienta al array `tools`:
  ```typescript
  import { readExternalFile } from './read-external-file.tool.js';
  import { listExternalDirectory } from './list-external-directory.tool.js';
  // ... más imports
  
  export const tools: Tool[] = [
    readExternalFile,
    listExternalDirectory,
    // ... más herramientas
  ];
  ```
- [ ] Verificar que cada herramienta cumple con interfaz `Tool`

#### 4.2 Crear herramienta de gestión de permisos
- [ ] Crear `src/tools/manage-permissions.tool.ts`
- [ ] Definir operaciones:
  - `list-allowed-paths`: Lista rutas autorizadas
  - `add-allowed-path`: Añade nueva ruta
  - `remove-allowed-path`: Elimina ruta
- [ ] Implementar como herramienta compuesta con subcomandos
- [ ] Registrar en `tools/index.ts`

#### 4.3 Actualizar hot-reload para herramientas
- [ ] Modificar `reloadModules()` en `src/index.ts`:
  - Añadir detección de cambios en `src/tools/**`
  - Limpiar caché de herramientas
  - Recargar array de tools
- [ ] Añadir log de herramientas disponibles en startup
- [ ] Implementar mismo mecanismo en `src/server-http.ts`

#### 4.4 Mejorar manejo de errores en CallToolRequest
- [ ] En handler de `CallToolRequestSchema`:
  - Capturar errores de validación de permisos
  - Retornar mensajes de error descriptivos
  - Incluir código de error específico (ej: `PERMISSION_DENIED`, `FILE_NOT_FOUND`)
- [ ] Crear módulo `src/tools/tool-errors.ts` con clases de error custom
- [ ] Implementar logging de llamadas a herramientas (audit trail)

#### 4.5 Añadir validación de inputSchema
- [ ] Instalar dependencia `ajv` para validación JSON Schema:
  ```bash
  npm install ajv --save
  ```
- [ ] Crear módulo `src/tools/schema-validator.ts`
- [ ] Implementar función `validateToolInput(schema, input)`
- [ ] Integrar validación antes de ejecutar herramientas
- [ ] Retornar errores claros si input es inválido

---

## Fase 5: Testing y Documentación

### Objetivo
Asegurar calidad mediante tests y documentar uso para el usuario final

### Tareas

#### 5.1 Configurar framework de testing
- [ ] Instalar Jest o Vitest:
  ```bash
  npm install --save-dev jest @types/jest ts-jest
  ```
- [ ] Crear `jest.config.js` con configuración TypeScript
- [ ] Crear directorio `src/__tests__/` para tests
- [ ] Actualizar script en `package.json`: `"test": "jest"`

#### 5.2 Tests unitarios para Permission Manager
- [ ] Crear `src/__tests__/permission-manager.test.ts`
- [ ] Test: `validatePath()` acepta rutas autorizadas
- [ ] Test: `validatePath()` rechaza rutas no autorizadas
- [ ] Test: Detección de path traversal
- [ ] Test: `addAllowedPath()` añade correctamente
- [ ] Test: `removeAllowedPath()` elimina correctamente
- [ ] Test: Persistencia en `allowedPaths.json`
- [ ] Test: Validación de patrones bloqueados

#### 5.3 Tests de integración para herramientas
- [ ] Crear `src/__tests__/tools.test.ts`
- [ ] Setup: Crear directorio temporal con archivos de prueba
- [ ] Test: `read-external-file` lee contenido correcto
- [ ] Test: `list-external-directory` lista correctamente
- [ ] Test: `search-in-external-files` encuentra coincidencias
- [ ] Test: Herramientas respetan permisos
- [ ] Test: Manejo de errores (archivo no existe, sin permisos)
- [ ] Teardown: Limpiar archivos temporales

#### 5.4 Crear documentación de uso
- [ ] Crear archivo `ACCESO_ARCHIVOS_EXTERNOS.md` en la raíz
- [ ] Documentar:
  - Cómo autorizar rutas nuevas
  - Lista de herramientas disponibles con ejemplos de uso
  - Formato de `allowedPaths.json`
  - Consideraciones de seguridad
  - Troubleshooting común
- [ ] Añadir ejemplos de uso con Copilot
- [ ] Incluir capturas de pantalla o diagramas

#### 5.5 Actualizar README.md principal
- [ ] Añadir sección "Acceso a Archivos Externos"
- [ ] Listar nuevas herramientas en tabla de features
- [ ] Añadir ejemplo de configuración inicial
- [ ] Enlazar a documentación detallada
- [ ] Actualizar tabla de herramientas disponibles (cambiar "0 tools" a "11+ tools")

#### 5.6 Crear guía de inicio rápido
- [ ] Crear `QUICK_START_EXTERNAL_FILES.md`
- [ ] Tutorial paso a paso:
  1. Autorizar un directorio externo
  2. Listar contenido con `list-external-directory`
  3. Leer un archivo con `read-external-file`
  4. Buscar en archivos con `search-in-external-files`
  5. Analizar proyecto con `analyze-external-project`
- [ ] Incluir comandos exactos y output esperado

---

## Fase 6: Optimizaciones y Seguridad

### Objetivo
Refinar rendimiento, añadir controles de seguridad adicionales y preparar para producción

### Tareas

#### 6.1 Implementar rate limiting
- [ ] Crear módulo `src/tools/rate-limiter.ts`
- [ ] Implementar límite de llamadas por minuto (ej: 60 calls/min)
- [ ] Tracking por tipo de herramienta
- [ ] Retornar error `RATE_LIMIT_EXCEEDED` cuando se excede
- [ ] Integrar en handler de `CallToolRequest`

#### 6.2 Añadir sistema de cuotas
- [ ] Definir cuotas de uso:
  - Máximo de archivos leídos por sesión
  - Máximo de bytes leídos por sesión
  - Máximo de búsquedas por sesión
- [ ] Implementar tracking en memoria (o archivo de estado)
- [ ] Añadir herramienta `get-quota-status` para consultar uso actual
- [ ] Implementar reset de cuotas (manual o automático)

#### 6.3 Optimizar lectura de archivos grandes
- [ ] En `read-external-file`, implementar lectura en chunks
- [ ] Añadir parámetro `maxLines` para lectura parcial
- [ ] Implementar streaming para archivos >10MB
- [ ] Añadir parámetro `startLine` y `endLine` para lectura de rangos
- [ ] Retornar warning si archivo excede límite recomendado

#### 6.4 Implementar logging y auditoría
- [ ] Crear módulo `src/tools/audit-logger.ts`
- [ ] Log de todas las operaciones de acceso a archivos:
  - Timestamp
  - Herramienta usada
  - Ruta accedida
  - Resultado (éxito/error)
  - Tiempo de ejecución
- [ ] Guardar en `logs/audit.log` (crear directorio si no existe)
- [ ] Implementar rotación de logs (max 10MB por archivo)
- [ ] Añadir herramienta `view-audit-log` para consultar actividad

#### 6.5 Añadir permisos granulares
- [ ] Extender `allowedPaths.json` con permisos por ruta:
  ```json
  {
    "allowedPaths": [
      {
        "path": "C:/Projects/repo1",
        "permissions": ["read", "list"],
        "maxDepth": 5
      },
      {
        "path": "C:/Projects/repo2",
        "permissions": ["read", "list", "search"],
        "maxDepth": 10
      }
    ]
  }
  ```
- [ ] Actualizar `validatePath()` para verificar permisos específicos
- [ ] Implementar permisos: `read`, `list`, `search`, `analyze`
- [ ] Añadir límite de profundidad (`maxDepth`) para operaciones recursivas

#### 6.6 Implementar sistema de sandboxing
- [ ] Crear módulo `src/tools/sandbox.ts`
- [ ] Implementar timeout para operaciones largas (30s máximo)
- [ ] Limitar uso de CPU/memoria por operación
- [ ] Implementar circuit breaker para herramientas que fallen repetidamente
- [ ] Añadir kill switch para deshabilitar herramientas en emergencia

#### 6.7 Optimizar búsquedas
- [ ] En `search-in-external-files`, implementar:
  - Indexación opcional de archivos frecuentemente buscados
  - Skip de archivos binarios automático
  - Búsqueda paralela con workers (para directorios grandes)
  - Early termination cuando se alcanza `maxResults`
- [ ] Añadir cache de resultados de búsqueda
- [ ] Implementar búsqueda incremental

---

## Fase 7: Features Avanzados (Opcional)

### Objetivo
Añadir capacidades avanzadas para casos de uso especializados

### Tareas

#### 7.1 Implementar file watcher
- [ ] Crear herramienta `watch-external-directory`
- [ ] Implementar monitoreo de cambios con `fs.watch()`
- [ ] Notificar cambios a través de eventos MCP (si el protocolo lo soporta)
- [ ] Permitir filtros por tipo de cambio (created, modified, deleted)
- [ ] Añadir debouncing para evitar spam de notificaciones

#### 7.2 Soporte para archivos comprimidos
- [ ] Instalar dependencia `adm-zip` o `decompress`
- [ ] Crear herramienta `read-from-archive`
- [ ] Soportar formatos: .zip, .tar.gz, .7z
- [ ] Implementar lectura sin extracción completa
- [ ] Validar archivos dentro del zip con permisos

#### 7.3 Soporte para repositorios Git
- [ ] Instalar dependencia `simple-git`
- [ ] Crear herramienta `analyze-git-repository`
- [ ] Implementar:
  - Listar commits recientes
  - Ver diff entre branches
  - Listar archivos modificados
  - Obtener blame de archivo
- [ ] Validar que el directorio .git está en ruta autorizada

#### 7.4 Integración con diff avanzado
- [ ] Instalar dependencia `diff` o `diff2html`
- [ ] Mejorar herramienta `compare-files` con:
  - Diff side-by-side HTML
  - Resaltado de sintaxis
  - Estadísticas detalladas de cambios
  - Exportar diff a diferentes formatos

#### 7.5 Análisis de código con AST
- [ ] Instalar dependencia `@babel/parser` o `@typescript/parser`
- [ ] Crear herramienta `analyze-code-ast`
- [ ] Implementar análisis profundo:
  - Extraer todas las funciones con sus signatures
  - Detectar imports y exports
  - Analizar complejidad ciclomática
  - Generar call graph
- [ ] Soportar múltiples lenguajes (TS, JS, Python, Java)

---

## Criterios de Aceptación

### Funcionales
- ✅ Usuario puede autorizar rutas externas mediante archivo de configuración
- ✅ Usuario puede autorizar rutas mediante herramienta MCP
- ✅ Copilot puede leer archivos externos autorizados
- ✅ Copilot puede listar contenido de directorios autorizados
- ✅ Copilot puede buscar texto en archivos externos
- ✅ Copilot puede analizar estructura de proyectos externos
- ✅ Sistema rechaza acceso a rutas no autorizadas
- ✅ Sistema previene path traversal y ataques comunes
- ✅ Herramientas retornan errores descriptivos
- ✅ Sistema mantiene audit log de accesos

### No Funcionales
- ✅ Lectura de archivos <1MB debe tomar <500ms
- ✅ Búsqueda en directorio con 1000 archivos debe tomar <5s
- ✅ Sistema debe manejar archivos hasta 100MB
- ✅ Permisos deben persistir entre reinicios del servidor
- ✅ Sistema debe soportar al menos 10 rutas autorizadas simultáneas
- ✅ Herramientas deben ser hot-reloadable sin reiniciar servidor
- ✅ Documentación debe cubrir todos los casos de uso principales
- ✅ Tests deben cubrir al menos 80% del código nuevo

### Seguridad
- ✅ Rutas sensibles del sistema están bloqueadas por defecto
- ✅ Path traversal es imposible
- ✅ Rate limiting previene abuso
- ✅ Tamaño de archivos está limitado
- ✅ Operaciones tienen timeout
- ✅ Todas las operaciones están auditadas
- ✅ Permisos son granulares (read, list, search)

---

## Dependencias Nuevas Requeridas

### Core
```bash
npm install glob          # Para búsqueda de archivos con patterns
npm install ajv           # Para validación de JSON Schema
```

### Testing
```bash
npm install --save-dev jest @types/jest ts-jest
npm install --save-dev @types/node
```

### Opcionales (Fase 7)
```bash
npm install simple-git        # Para integración Git
npm install adm-zip           # Para archivos comprimidos
npm install @babel/parser     # Para análisis AST
npm install diff              # Para diffs avanzados
```

---

## Estimación de Esfuerzo

| Fase | Tareas | Tiempo Estimado | Prioridad |
|------|--------|-----------------|-----------|
| Fase 1 | 5 tareas (15 subtareas) | 3-4 horas | 🔴 Crítica |
| Fase 2 | 5 tareas (12 subtareas) | 4-5 horas | 🔴 Crítica |
| Fase 3 | 5 tareas (10 subtareas) | 3-4 horas | 🟡 Alta |
| Fase 4 | 5 tareas (10 subtareas) | 2-3 horas | 🔴 Crítica |
| Fase 5 | 6 tareas (15 subtareas) | 3-4 horas | 🟡 Alta |
| Fase 6 | 7 tareas (15 subtareas) | 4-5 horas | 🟡 Alta |
| Fase 7 | 5 tareas (12 subtareas) | 5-6 horas | 🟢 Baja |
| **TOTAL** | **38 tareas** | **24-31 horas** | |

### Desglose por Prioridad
- **MVP (Fases 1, 2, 4):** 9-12 horas — Sistema funcional básico
- **Production Ready (+ Fases 3, 5, 6):** 20-27 horas — Sistema completo y robusto
- **Advanced Features (+ Fase 7):** 25-33 horas — Sistema con todas las capacidades

---

## Orden de Implementación Recomendado

### Sprint 1: MVP (2-3 días)
1. Fase 1: Sistema de permisos (base fundamental)
2. Fase 2: Herramientas básicas (read, list, get-info)
3. Fase 4: Integración con servidor MCP
4. **Checkpoint:** Probar con Copilot que puede leer archivos externos

### Sprint 2: Features Core (2-3 días)
5. Fase 3: Herramientas avanzadas (search, analyze, compare)
6. Fase 5: Testing y documentación
7. **Checkpoint:** Suite de tests pasa, documentación lista

### Sprint 3: Production Ready (1-2 días)
8. Fase 6: Optimizaciones y seguridad
9. **Checkpoint:** Sistema listo para uso en producción

### Sprint 4: Advanced (Opcional)
10. Fase 7: Features avanzados según necesidades

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| **Acceso no autorizado a archivos sensibles** | Media | Crítico | Validación estricta, lista negra de rutas del sistema, auditoría |
| **Performance poor en directorios grandes** | Alta | Alto | Implementar paginación, límites, indexación opcional |
| **Path traversal bypass** | Baja | Crítico | Múltiples capas de validación, normalización de rutas |
| **Consumo excesivo de memoria** | Media | Alto | Límites de tamaño, streaming, rate limiting |
| **Problemas de compatibilidad entre SO** | Media | Medio | Tests en Windows/Linux/Mac, normalización de rutas |
| **Complejidad de permisos confusa** | Media | Medio | Documentación clara, ejemplos, mensajes de error descriptivos |
| **Hot-reload rompe herramientas** | Baja | Medio | Tests de recarga, manejo de estado limpio |

---

## Checklist de Progreso General

### Configuración Inicial
- [ ] Dependencias core instaladas (`glob`, `ajv`)
- [ ] Estructura de directorios creada (`src/permissions/`, `src/config/`)
- [ ] `allowedPaths.json` creado y añadido a `.gitignore`

### Sistema de Permisos
- [ ] Permission Manager implementado y testeado
- [ ] Validaciones de seguridad funcionando
- [ ] Persistencia de permisos confirmada

### Herramientas Básicas
- [ ] `read-external-file` funcionando
- [ ] `list-external-directory` funcionando
- [ ] `get-file-info` funcionando
- [ ] `read-multiple-files` funcionando

### Herramientas Avanzadas
- [ ] `search-in-external-files` funcionando
- [ ] `analyze-external-project` funcionando
- [ ] `compare-files` funcionando
- [ ] `extract-symbols` funcionando
- [ ] `find-dependencies` funcionando

### Integración MCP
- [ ] Herramientas registradas en `tools/index.ts`
- [ ] `manage-permissions` herramienta implementada
- [ ] Hot-reload de herramientas funcionando
- [ ] Validación de schemas implementada

### Testing
- [ ] Jest configurado
- [ ] Tests de Permission Manager pasando
- [ ] Tests de herramientas pasando
- [ ] Cobertura >80% alcanzada

### Documentación
- [ ] `ACCESO_ARCHIVOS_EXTERNOS.md` completo
- [ ] `QUICK_START_EXTERNAL_FILES.md` completo
- [ ] README.md actualizado
- [ ] Ejemplos de uso documentados

### Seguridad y Optimización
- [ ] Rate limiting implementado
- [ ] Sistema de cuotas funcionando
- [ ] Audit logging activo
- [ ] Permisos granulares implementados
- [ ] Sandboxing configurado

---

## Próximos Pasos Inmediatos

### Para Empezar (Hoy)
1. ✅ **Crear este plan de trabajo**
2. ⏭️ **Instalar dependencias básicas:**
   ```bash
   npm install glob ajv --save
   ```
3. ⏭️ **Crear estructura de directorios:**
   ```bash
   mkdir -p src/permissions
   mkdir -p src/config
   mkdir -p src/__tests__
   ```
4. ⏭️ **Crear archivo de permisos inicial:**
   - Crear `allowedPaths.json` con estructura básica
   - Añadir a `.gitignore`
5. ⏭️ **Implementar tarea 1.1:** Crear `permissions-config.ts`

---

## Notas Finales

Este plan de trabajo está diseñado para implementación incremental. Cada fase puede completarse de manera independiente y el sistema será funcional después de cada sprint.

**Recomendaciones:**
- Comenzar con MVP (Fases 1, 2, 4) para validar concepto rápidamente
- Iterar basándose en feedback real de uso con Copilot
- Priorizar seguridad sobre features en cada fase
- Mantener documentación actualizada durante implementación

**Flexibilidad:**
- Fase 7 es completamente opcional y puede implementarse según necesidades específicas
- Tareas dentro de cada fase pueden reordenarse según bloqueos o dependencias
- Estimaciones son aproximadas y deben ajustarse según experiencia real

---

*Plan generado el 11 de marzo de 2026*  
*Proyecto: MCP Prompts Server*  
*Versión: 1.0*
