# Índice del Proyecto

Este documento actúa como guía rápida para localizar las partes importantes del proyecto "mcp-prompts-server" y entender qué hace cada componente.

**Resumen rápido**
- **Servidor MCP (HTTP / STDIO):** implementaciones en [src/server-http.ts](src/server-http.ts#L1) y [src/index.ts](src/index.ts#L1).
- **Prompts:** definiciones en [src/prompts.ts](src/prompts.ts#L1).
- **Templates (plantillas de prompts):** en [src/templates](src/templates#L1).
- **Scripts auxiliares:** en [src/scripts](src/scripts#L1) (ej. `script-vscode.js`, `script-java.js`).
- **Herramientas (tools):** adaptadores y tipos en [src/tools/index.ts](src/tools/index.ts#L1) y [src/tools/types.ts](src/tools/types.ts#L1).
- **Configuración y metadata:** [package.json](package.json#L1), [tsconfig.json](tsconfig.json#L1), [README.md](README.md#L1).

**Cómo usar este índice**
Busca la sección que necesites (Servidor, Prompts, Templates, Scripts, Tools) y sigue el enlace al archivo correspondiente para ver el código o editarlo.

**1. Estructura general**
- `src/`
  - [src/index.ts](src/index.ts#L1): Servidor MCP por STDIO; recarga en caliente de `prompts` y `templates` en desarrollo.
  - [src/server-http.ts](src/server-http.ts#L1): Adaptación HTTP que expone `/mcp` (JSON-RPC) y `/health`.
  - [src/prompts.ts](src/prompts.ts#L1): Lista de prompts disponibles (nombre + descripción). Punto central para conocer qué prompts ofrece el servicio.
  - [src/templates/](src/templates#L1): Mapeo de nombres de prompts a plantillas. Cada plantilla vive en un archivo independiente (ej.: `explicador-codigo.template.ts`, `actualizador-readme.template.ts`, etc.). El archivo [src/templates/index.ts](src/templates/index.ts#L1) exporta el objeto `templates` que usa el servidor.
  - [src/tools/](src/tools#L1): Contiene `index.ts` (registro de herramientas) y `types.ts` (definición de la interfaz `Tool`). Actualmente `tools` está vacío, pero la infraestructura para registrar y exponer herramientas via MCP ya está preparada.

**2. Prompts disponibles (lista y propósito)**
Las definiciones se encuentran en `src/prompts.ts`. Entre los prompts incluidos están:
- `explicador-codigo-mcp`: análisis didáctico del proyecto.
- `actualizador-readme-principal`: actualiza el README automáticamente.
- `revisor-de-codigo-autonomo-mcp`: revisión de código y estándares.
- `detector-de-brechas-de-seguridad-mcp`: análisis de seguridad.
- `analizador-de-mensajes-sonar-mcp`: interpreta reportes de SonarQube.
- `generador-plan-trabajo`, `generador-test-unitarios`, `generador-commit-automatico`, `generador-indice-proyecto`, entre otros.

Véase la lista completa en: [src/prompts.ts](src/prompts.ts#L1).

**3. Plantillas (templates)**
- Ubicación: [src/templates](src/templates#L1).
- Módulo principal: [src/templates/index.ts](src/templates/index.ts#L1) que exporta `templates`.
- Cada plantilla es una cadena o función que se sustituye con `fillTemplate` (ver `src/index.ts` y `src/server-http.ts`) para generar el prompt final.

**4. Modos de ejecución**
- Modo STDIO (local): `src/index.ts` usa `@modelcontextprotocol/sdk` y `StdioServerTransport`.
- Modo HTTP: `src/server-http.ts` expone un endpoint JSON-RPC en `POST /mcp` y un healthcheck en `GET /health`.
- Scripts de inicio y build: definidos en [package.json](package.json#L1) (`npm run build`, `npm start`).

**5. Scripts auxiliares**
- `src/scripts/script-vscode.js`: utilidades para integrar con VS Code (ver archivo).
- `src/scripts/script-java.js`: utilidades relacionadas con proyectos Java.
- `cambios-registro.md` es generado por los scripts de monitoreo (en `src/scripts`) y existen variantes de estos scripts dentro de `src/scripts/`.

**6. Registro de cambios y ONE_SPEC**
- `cambios-registro.md`: archivo que registran los scripts de monitoreo de cambios.
- `ONE_SPEC.md`: especificación única usada por algunos prompts/plantillas (ver raíz del proyecto).

**7. Tipos y extensibilidad**
- `src/tools/types.ts` define la interfaz `Tool` para implementar herramientas que puedan exponerse vía MCP.
- Para añadir una `tool`:
  1. Implementar la función con la firma definida en `types.ts`.
  2. Registrar la herramienta en `src/tools/index.ts` (añadir al array `tools`).

**8. Desarrollo y recarga en caliente**
- Ambos servidores (`src/index.ts` y `src/server-http.ts`) implementan una función `reloadModules` que borra cache de `require` y recarga `prompts` y `templates` automáticamente cuando detectan cambios en desarrollo.

**9. Archivos principales de configuración**
- `package.json` — dependencias y scripts de build/start ([package.json](package.json#L1)).
- `tsconfig.json` — configuración TypeScript ([tsconfig.json](tsconfig.json#L1)).
- `README.md` — documentación del proyecto ([README.md](README.md#L1)).

**10. Próximos pasos sugeridos**
- Añadir descripciones en cada plantilla para que aparezcan como documentación rápida.
- Implementar o registrar herramientas en `src/tools/index.ts` si se requieren acciones automatizadas.
- Añadir tests mínimos para validar que `prompts/get` devuelve las plantillas correctamente.

---
Generado automáticamente: Índice básico para facilitar navegación y contribución. Si quieres, puedo:
- Añadir enlaces directos a cada plantilla con su descripción.
- Generar una versión más extensa con ejemplos de requests MCP.
