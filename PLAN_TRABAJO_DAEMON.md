# Plan de Trabajo: Migración a Servidor MCP Daemon

**Objetivo:** Convertir el servidor MCP de un servidor HTTP con OAuth/JWT a un servidor daemon distribuible vía npm, que corra con stdio y cero configuración.

**Filosofía del plan:** cada fase es **atómica y verificable**. Si una fase falla, el proyecto sigue compilando y funcionando con lo que ya existía. No se toca código que funciona hasta que el reemplazo está listo.

---

## FASE 1 — Limpiar archivos de infraestructura cloud y OAuth

> Estos archivos no tienen dependencias entrantes en `src/index.ts`. Se eliminan primero porque no afectan el servidor principal.

### 1.1 — Eliminar scripts de infraestructura cloud
Eliminar los siguientes archivos:
```
src/scripts/keepalive.ts
test-oauth.js
test-vscode-flow.js
```

**Comando:**
```bash
Remove-Item "src\scripts\keepalive.ts"
Remove-Item "test-oauth.js", "test-vscode-flow.js"
```

**Verificación:** `Get-ChildItem src/scripts/` muestra solo `script-java.js` y `script-vscode.js`.

### 1.2 — Eliminar archivos de tipos de autenticación
```
src/types/auth.types.ts
```
**Comando:**
```bash
Remove-Item "src\types\auth.types.ts"
Remove-Item "src\types" -Recurse  # Solo si el directorio queda vacío
```

**Verificación:** El directorio `src/types/` ya no existe.

### 1.3 — Eliminar middleware de autenticación JWT
```
src/middleware/auth.middleware.ts
src/middleware/error.middleware.ts
```
**Comando:**
```bash
Remove-Item "src\middleware\auth.middleware.ts", "src\middleware\error.middleware.ts"
Remove-Item "src\middleware" -Recurse
```

**Verificación:** El directorio `src/middleware/` ya no existe.

### 1.4 — Eliminar capa OAuth completa
```
src/oauth/config.ts
src/oauth/routes.ts
src/oauth/storage.ts
```
**Comando:**
```bash
Remove-Item "src\oauth" -Recurse
```

**Verificación:** El directorio `src/oauth/` ya no existe.

### 1.5 — Eliminar server-http.ts
```
src/server-http.ts
```
**Comando:**
```bash
Remove-Item "src\server-http.ts"
```

**Verificación:** `Get-ChildItem src/` muestra: `index.ts`, `prompts.ts`, `middleware/` eliminado, `oauth/` eliminado, `scripts/`, `templates/`, `tools/`, `types/` eliminado.

### 1.6 — Verificación de fase completa
```bash
npm run build
```
**Resultado esperado:** Errores de compilación por imports rotos en `src/index.ts` (si los tenía) pero NO errores por archivos que acabamos de eliminar. Si `src/index.ts` importa algo eliminado, esos errores se resuelven en FASE 2.

> **NOTA:** `src/index.ts` original NO importa nada de `oauth/`, `middleware/` ni `types/`. Solo importa `prompts.js`, `templates/index.js` y `tools/index.js`. Por tanto el build debe pasar limpio.

**Verificación crítica post-Fase 1:**
```bash
npm run build
# Esperado: 0 errores
node dist/index.js
# Esperado: servidor arranca con stdio, Ctrl+C para salir
```

---

## FASE 2 — Reescribir `src/index.ts` (limpieza de código legacy)

> `src/index.ts` compila y funciona, pero tiene código de desarrollo que no pertenece a un daemon distribuible: hot-reload con `require.cache`, watchers de `fs`, global de recarga forzada, y todos los `console.error` de estado.

### 2.1 — Análisis previo: entender qué conservar

Lo que se **conserva** de `src/index.ts`:
- Instanciación del `Server` del SDK MCP
- `StdioServerTransport` y `server.connect(transport)`
- Handlers: `ListPromptsRequestSchema`, `GetPromptRequestSchema`, `ListToolsRequestSchema`, `CallToolRequestSchema`
- La función `fillTemplate()` — lógica de negocio pura
- Las capacidades declaradas: `prompts: {}`, `tools: {}`

Lo que se **elimina**:
- `reloadModules()` — función entera (require.cache incompatible con ESM NodeNext)
- `promptsCache` y `templatesCache` como variables mutables — reemplazar por imports estáticos
- `global.__forcePromptReload` — interfaz de desarrollo
- El bloque `if (process.env.NODE_ENV === 'development')` con `fs.watch`
- Las importaciones de `path`, `fs` (ya no necesarias)
- Todos los `console.error` de estado interno

### 2.2 — Crear nuevo `src/index.ts`

Reemplazar el contenido completo del archivo con:

```typescript
#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { tools } from "./tools/index.js";
import { prompts } from "./prompts.js";
import { templates } from "./templates/index.js";

const server = new Server(
  {
    name: "mcp-prompts-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      prompts: {},
      tools: {},
    },
  }
);

const fillTemplate = (template: string, args: Record<string, string>): string => {
  return template.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => {
    return args[key] !== undefined && args[key] !== ""
      ? args[key]
      : `[${key} no proporcionado - valor opcional]`;
  });
};

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: prompts.map((p) => ({
      name: p.name,
      description: p.description,
    })),
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const promptName = request.params.name;
  const args = (request.params.arguments || {}) as Record<string, string>;

  const promptDefinition = prompts.find((p) => p.name === promptName);
  if (!promptDefinition) {
    throw new Error(`Prompt no encontrado: ${promptName}`);
  }

  const template = templates[promptName as keyof typeof templates];
  if (!template) {
    throw new Error(`Template no encontrado para: ${promptName}`);
  }

  const promptText = fillTemplate(template, args);

  return {
    description: promptDefinition.description,
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: promptText,
        },
      },
    ],
  };
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools.map((tool) => tool.metadata),
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = tools.find((t) => t.metadata?.name === request.params.name);
  if (!tool) {
    throw new Error(`Herramienta no encontrada: ${request.params.name}`);
  }
  return tool(request, {});
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  process.stderr.write(`Error fatal: ${error.message}\n`);
  process.exit(1);
});
```

**Diferencias clave respecto al original:**
- `import { prompts }` y `import { templates }` en lugar de `require()` dinámico — compatible con ESM NodeNext
- Sin `promptsCache`/`templatesCache` mutables: los módulos ESM ya cachean por defecto
- Sin `fs.watch`, sin `global.__forcePromptReload`
- `process.stderr.write` en lugar de `console.error` para el error fatal — stdout queda limpio para el protocolo MCP
- Shebang `#!/usr/bin/env node` para uso como comando CLI

### 2.3 — Verificación post-reescritura
```bash
npm run build
# Esperado: 0 errores TypeScript
```

Si hay errores de tipos por el cast de `templates[promptName]`, ajustar el tipo en `src/templates/index.ts` agregando un índice de tipo (ver FASE 3.2).

---

## FASE 3 — Ajustar módulos de soporte (`templates`, `tools`, `prompts`)

> Estos archivos están bien, pero hay pequeños ajustes de tipado necesarios para que el nuevo `index.ts` compile sin `any`.

### 3.1 — Verificar que `src/prompts.ts` exporta correctamente

El archivo debe exportar el array `prompts` con tipo inferido. No requiere cambios si ya tiene `export const prompts = [...]`.

**Verificación:** `npm run build` sin errores.

### 3.2 — Agregar tipo de índice a `src/templates/index.ts`

Agregar al final del archivo, o modificar la declaración del objeto para que TypeScript acepte indexación por string:

Cambiar:
```typescript
export const templates = {
  'explicador-codigo-mcp': explicadorCodigoTemplate,
  // ...
};
```

Por:
```typescript
export const templates: Record<string, string> = {
  'explicador-codigo-mcp': explicadorCodigoTemplate,
  // ...
};
```

Esto permite que `templates[promptName]` en `index.ts` compile sin error de tipo.

### 3.3 — Verificar `src/tools/index.ts` y `src/tools/types.ts`

Estos archivos están limpios. Verificar que `Tool` tiene `metadata` no opcional:

```typescript
// src/tools/types.ts — sin cambios necesarios si ya tiene:
export type Tool = ((request: CallToolRequest, context: any) => Promise<any>) & {
  metadata: {
    name: string;
    description: string;
    inputSchema: any;
  };
};
```

**Verificación de fase completa:**
```bash
npm run build
# Esperado: 0 errores
node dist/index.js
# El proceso debe arrancar y esperar input por stdin (comportamiento daemon correcto)
# Ctrl+C para terminar
```

---

## FASE 4 — Reescribir `package.json`

> Esta es la fase que convierte el proyecto en un paquete npm publicable e instalable globalmente.

### 4.1 — Nuevo `package.json`

Reemplazar el contenido completo con:

```json
{
  "name": "mcp-prompts-server",
  "version": "1.0.0",
  "description": "MCP server with curated developer prompts. Install globally and use with Claude Desktop, VS Code Copilot, or any MCP-compatible client.",
  "keywords": ["mcp", "model-context-protocol", "prompts", "ai", "copilot", "claude"],
  "author": "",
  "license": "ISC",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "mcp-prompts-server": "dist/index.js"
  },
  "files": [
    "dist/",
    "README.md"
  ],
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "prepare": "npm run build"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.26.0"
  },
  "devDependencies": {
    "@types/node": "^25.3.0",
    "typescript": "^5.9.3"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

**Cambios respecto al original:**
| Campo | Antes | Después | Motivo |
|---|---|---|---|
| `"type"` | ausente (CJS implícito) | `"module"` | Alinear con `NodeNext` en tsconfig |
| `"bin"` | ausente | `{"mcp-prompts-server": "dist/index.js"}` | Permite `npx` e instalación global |
| `"files"` | ausente | `["dist/", "README.md"]` | Solo publica lo necesario en npm |
| `"prepare"` | ausente | `"npm run build"` | Compila automáticamente al instalar |
| `"main"` | `"index.js"` | `"dist/index.js"` | Apunta al compilado correcto |
| `dependencies` | 7 paquetes | 1 paquete | Elimina todo lo de auth/http |

**Dependencias eliminadas:**
- `express`, `cors` — servidor HTTP
- `dotenv` — variables de entorno de OAuth
- `jsonwebtoken` — verificación JWT
- `uuid` — generación de IDs OAuth
- `@types/express`, `@types/cors`, `@types/jsonwebtoken`, `@types/uuid` — tipos dev

### 4.2 — Actualizar `node_modules` y lock file
```bash
npm install
```
**Verificación:** `node_modules/` ya no contiene `express/`, `jsonwebtoken/`, `uuid/`. El tamaño de `node_modules` debe reducirse significativamente.

### 4.3 — Verificar build con nuevo package.json
```bash
npm run build
```
**Verificación:** Sin errores. El archivo `dist/index.js` tiene el shebang `#!/usr/bin/env node` como primera línea.

### 4.4 — Verificar que el archivo compilado tiene permisos de ejecución (solo relevante en Linux/Mac para publicación)

En Windows no aplica, pero al publicar en npm el shebang es suficiente.

---

## FASE 5 — Ajustar `tsconfig.json`

### 5.1 — Agregar configuraciones de publicación

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Cambios:**
- `"declaration": true` — genera `.d.ts` para consumidores del paquete
- `"declarationMap": true` — mapas de tipos para IDEs
- `"sourceMap": true` — facilita debugging al usar el paquete instalado
- `"exclude"` agrega `"dist"` — evita que TypeScript compile su propia salida

### 5.2 — Verificación
```bash
npm run build
# Verificar que dist/ contiene .js, .d.ts y .js.map para cada archivo
Get-ChildItem dist/ -Recurse | Where-Object { $_.Extension -in '.js','.d.ts','.map' }
```

---

## FASE 6 — Test de integración local completo

> Antes de publicar, validar que el daemon funciona exactamente como lo espera un cliente MCP.

### 6.1 — Test de inicio del proceso
```bash
node dist/index.js
# Debe iniciar sin output a stdout (el protocolo MCP usa stdout para mensajes JSON-RPC)
# Solo debe haber salida si hay un error fatal (va a stderr)
# Ctrl+C para salir
```

### 6.2 — Test del protocolo MCP con mensajes JSON-RPC manuales
```bash
# Enviar un mensaje initialize y verificar respuesta:
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | node dist/index.js
```
**Verificación:** Respuesta JSON-RPC válida con `protocolVersion` y `serverInfo`.

### 6.3 — Test de listado de prompts
```bash
# Primero initialize, luego prompts/list (como haría un cliente real):
$messages = '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' + "`n" + '{"jsonrpc":"2.0","id":2,"method":"prompts/list","params":{}}'
$messages | node dist/index.js
```
**Verificación:** La respuesta del segundo mensaje contiene los 17 prompts definidos en `src/prompts.ts`.

### 6.4 — Test de `npx` local (simular instalación de usuario)
```bash
# Desde el directorio del proyecto:
npm pack
# Genera mcp-prompts-server-1.0.0.tgz

# Instalar el tarball en un directorio temporal:
$env:TEMP_DIR = "$env:TEMP\test-mcp-daemon"
New-Item -ItemType Directory -Path $env:TEMP_DIR -Force
npm install --prefix $env:TEMP_DIR "$PWD\mcp-prompts-server-1.0.0.tgz"

# Ejecutar como si fuera un usuario:
node "$env:TEMP_DIR\node_modules\.bin\mcp-prompts-server"
# o:
node "$env:TEMP_DIR\node_modules\mcp-prompts-server\dist\index.js"
```
**Verificación:** El servidor arranca correctamente desde una instalación externa.

### 6.5 — Limpiar artefacto de test
```bash
Remove-Item "mcp-prompts-server-1.0.0.tgz"
Remove-Item $env:TEMP_DIR -Recurse
```

---

## FASE 7 — Actualizar `README.md`

### 7.1 — Reemplazar la sección de instalación y configuración

El README debe documentar los **tres escenarios de uso** que un usuario final encontrará:

**Escenario A — Con `npx` (sin instalación, recomendado):**
```json
{
  "mcpServers": {
    "mis-prompts": {
      "command": "npx",
      "args": ["-y", "mcp-prompts-server"]
    }
  }
}
```

**Escenario B — Con instalación global:**
```bash
npm install -g mcp-prompts-server
```
```json
{
  "mcpServers": {
    "mis-prompts": {
      "command": "mcp-prompts-server"
    }
  }
}
```

**Escenario C — Clonando el repositorio (desarrollo):**
```bash
git clone <repo>
cd mcp-prompts-server
npm install
npm run build
```
```json
{
  "mcpServers": {
    "mis-prompts": {
      "command": "node",
      "args": ["/ruta/absoluta/al/repo/dist/index.js"]
    }
  }
}
```

**Archivos de configuración por cliente:**
| Cliente | Ruta de configuración |
|---|---|
| Claude Desktop (Windows) | `%APPDATA%\Claude\claude_desktop_config.json` |
| Claude Desktop (macOS) | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| VS Code GitHub Copilot | `.vscode/mcp.json` en el workspace |

### 7.2 — Eliminar secciones del README que referencien:
- Configuración de OAuth
- Variables de entorno (`.env`)
- URL de Render.com / URL del frontend
- Autenticación / login
- Endpoints HTTP (`/mcp`, `/health`, `/.well-known/...`)

---

## FASE 8 — Commit final y tag de versión

### 8.1 — Verificación final completa
```bash
npm run build
# 0 errores

node dist/index.js
# Arranca correctamente

Get-ChildItem src/ -Recurse | Where-Object { $_.Name -match "oauth|auth|jwt|middleware|keepalive" }
# 0 resultados — confirma que no quedan rastros de auth
```

### 8.2 — Commit limpio
```bash
git add -A
git commit -m "feat: migrate to npm daemon (stdio only, no auth/oauth/http)

BREAKING CHANGE: Remove OAuth, JWT, Express HTTP server.
Server now runs as stdio daemon via MCP SDK.
Install with: npm install -g mcp-prompts-server
Use with: npx mcp-prompts-server"
```

### 8.3 — Tag de versión
```bash
git tag v1.0.0-daemon
git push origin feat/daemon-mode --tags
```

### 8.4 — Merge a main (si aplica)
```bash
git checkout main
git merge feat/daemon-mode --no-ff -m "chore: merge daemon migration"
git push origin main
```

---

## FASE 9 — Publicación en npm (opcional)

> Solo ejecutar si se quiere publicar públicamente. Si es uso personal, con el Escenario C del README es suficiente.

### 9.1 — Verificar cuenta npm
```bash
npm whoami
# Si no está logueado:
npm login
```

### 9.2 — Dry run de publicación
```bash
npm publish --dry-run
# Verificar que solo incluye: dist/, README.md, package.json
# NO debe incluir: src/, test-*.js, *.md de planes de trabajo
```

### 9.3 — Publicar
```bash
npm publish --access public
```

**Verificación:** `npm info mcp-prompts-server` muestra la versión publicada.

---

## Resumen de riesgos y mitigaciones

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Error de tipos en templates por indexación con string | Alta | FASE 3.2 — agregar `Record<string, string>` |
| El shebang `#!/usr/bin/env node` no sobrevive la compilación TS | Media | TypeScript preserva comentarios de shebang; verificar en FASE 4.3 |
| `"type": "module"` rompe los scripts `.js` en `src/scripts/` | Media | Esos scripts usan `require()` (CJS) — moverlos fuera de `src/` o cambiarlos a `.cjs` |
| `npm install` falla por conflictos de peer deps | Baja | Usar `npm install --legacy-peer-deps` si hay conflicto |
| El SDK MCP no acepta el protocolo correcto | Muy baja | FASE 6.2 verifica el handshake antes de publicar |

---

## Árbol de dependencias final (post-migración)

```
mcp-prompts-server
└── @modelcontextprotocol/sdk ^1.26.0
    ├── (dependencias internas del SDK)
    └── Sin Express, sin JWT, sin UUID, sin dotenv
```

**Tamaño estimado de `node_modules`:** ~5-10 MB (vs ~50-80 MB actual con Express stack)

---

## Checklist de ejecución

- [ ] FASE 0 — Rama de respaldo creada, snapshot commiteado, build actual pasa
- [ ] FASE 1 — Archivos eliminados, build pasa sin errores
- [ ] FASE 2 — `src/index.ts` reescrito con ESM estático, build pasa
- [ ] FASE 3 — `src/templates/index.ts` tipado con `Record<string, string>`, build pasa
- [ ] FASE 4 — `package.json` reescrito, `npm install` ejecutado, build pasa
- [ ] FASE 5 — `tsconfig.json` actualizado con declaration/sourceMap
- [ ] FASE 6 — Tests de integración manuales pasados (stdio, JSON-RPC, npx local)
- [ ] FASE 7 — README actualizado con instrucciones de usuario final
- [ ] FASE 8 — Commit final con mensaje semántico, tag creado
- [ ] FASE 9 — (Opcional) Publicado en npm, verificado con `npm info`
