# One Spec (Root Spec)

## Objetivo

Proveer una especificación ejecutable y clara para implementar la Fase 6: "Autenticación y protección del endpoint `/mcp`" del MCP Prompts Server. Esta especificación debe permitir a un desarrollador implementar, probar y documentar la protección JWT sin requerir información adicional.

## Alcance / No alcance

- Alcance: Añadir validación de JWT en el servidor, configurar CORS, agregar middlewares de error y  tipos TS asociados, proteger `POST /mcp`, mantener `GET /health` público, y documentar pasos de integración y pruebas.
- No alcance: Crear un servicio de emisión de JWT (backend auth existente), diseño de UI, ni gestión de usuarios.

## Definiciones (lenguaje de dominio)

- JWT: JSON Web Token usado para autenticar requests.
- JWT_SECRET: Clave compartida entre el backend de autenticación y este servidor para verificar firmas JWT.
- `AuthenticatedRequest`: Tipo extendido de `express.Request` que incluye `user` con payload verificado.

## Principios / Reglas no negociables

- El servidor solo **valida** tokens; no los emite.
- `JWT_SECRET` debe concordar exactamente con el usado por el backend de autenticación.
- `GET /health` debe permanecer público.
- `POST /mcp` debe devolver 401 con códigos de error estandarizados cuando la autenticación falle.

## Límites

- No se almacena información de sesión en el servidor.
- No se integra con base de datos para usuarios.

## Eventos y estados (visión raíz)

- Evento: Request entrante a `POST /mcp` con o sin `Authorization` header.
- Estados:
	- Sin header → 401 `NO_TOKEN`.
	- Header con formato inválido → 401 `INVALID_TOKEN_FORMAT`.
	- Token inválido o firma incorrecta → 401 `INVALID_TOKEN`.
	- Token expirado → 401 `TOKEN_EXPIRED`.
	- Token válido → 200 y ejecución normal del handler MCP.

## Criterios de aceptación (root)

- `POST /mcp` rechaza requests sin token o con token inválido, con códigos de error y mensajes claros.
- `POST /mcp` acepta requests con token válido y `req.user` contiene el payload JWT.
- `GET /health` responde 200 sin autenticación.
- Los desarrolladores pueden reproducir la instalación y pruebas usando los comandos proporcionados.

## Trazabilidad

- Requisitos -> Implementación: `src/middleware/auth.middleware.ts`, `src/middleware/error.middleware.ts`, `src/types/auth.types.ts`, modificación en `src/server-http.ts`.
- Documentación -> `README.md`, `INTEGRACION_FRONTEND.md`, `.env.example`.

---

## Fase 6 — Solución detallada: Autenticación y protección de `/mcp`

### Resumen

Proteger `POST /mcp` mediante un middleware que valide JWT firmado con `JWT_SECRET`. Mantener `GET /health` público. Proveer tipos TypeScript, manejo de errores, configuración CORS y guías de pruebas y despliegue.

### Requisitos previos

- Acceso al `JWT_SECRET` usado por el backend de autenticación.
- Node.js y npm instalados.

### Dependencias a instalar

Ejecutar localmente (no ejecutar en este paso, solo instrucciones):

```bash
npm install jsonwebtoken dotenv cors
npm install -D @types/jsonwebtoken @types/cors
```

### Variables de entorno

Crear `.env` o establecer en el entorno:

- `NODE_ENV` (opcional, p.ej. `development`)
- `PORT` (por defecto `3000`)
- `JWT_SECRET` (OBLIGATORIO — el mismo que usa el backend auth)
- `CORS_ORIGIN` (p.ej. `http://localhost:5173`)

Agregar `.env` a `.gitignore`.

### Tipos TypeScript

Crear `src/types/auth.types.ts` con:

- `JWTPayload` — define campos del token (ej: `userId`, `email`, `role`, `iat`, `exp`).
- `AuthenticatedRequest` — extiende `express.Request` añadiendo `user?: JWTPayload`.

Esto asegura tipado fuerte en handlers y middlewares.

### Middleware de autenticación

Archivo: `src/middleware/auth.middleware.ts` — responsabilidades:

- Extraer `Authorization` header.
- Validar formato `Bearer <token>`.
- Verificar token con `jsonwebtoken.verify(token, JWT_SECRET)`.
- En caso de éxito: asignar `req.user = payload` y `next()`.
- En fallos: responder con 401 y un body JSON con `status`, `code` y `message`.

Errores y códigos esperados:

- `NO_TOKEN` — header ausente.
- `INVALID_TOKEN_FORMAT` — formato no `Bearer`.
- `TOKEN_EXPIRED` — token expirado.
- `INVALID_TOKEN` — firma inválida o token corrupto.
- `SERVER_CONFIG_ERROR` — `JWT_SECRET` no configurado (500).

### Middleware de errores

Archivo: `src/middleware/error.middleware.ts` — responsabilidades:

- `notFoundHandler` → responder 404 con JSON estandarizado.
- `errorHandler` → capturar errores no gestionados, loguearlos y responder 500 (mostrar stack sólo en `development`).

Estos deben añadirse al final del pipeline de middlewares.

### Cambios en el servidor

Archivo: `src/server-http.ts` — pasos concretos:

1. Importar `dotenv` y llamar `dotenv.config()` al inicio.
2. Importar `cors` y configurar `app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }))`.
3. Mantener `app.use(express.json())` y `urlencoded`.
4. Proteger la ruta:

	 - Antes: `app.post('/mcp', async (req: Request, res: Response) => { ... })`
	 - Después: `app.post('/mcp', authenticateToken, async (req: AuthenticatedRequest, res: Response) => { ... })`

5. (Opcional) Añadir logs: `console.log(
	 `🔒 Request MCP de usuario: ${req.user?.email || req.user?.userId}`)
` dentro del handler.
6. Al final, registrar `app.use(notFoundHandler); app.use(errorHandler);` antes de `app.listen()`.

### Pruebas y verificación

Comandos rápidos (ejecución local):

```bash
# Compilar (si aplica)
npm run build

# Ejecutar en desarrollo
npm run dev

# Ejecutar producción
npm start
```

Pruebas sugeridas (curl / Postman):

- Health (sin token):

	```bash
	curl http://localhost:3000/health
	```

	Esperado: 200 con JSON que incluye `authentication: 'enabled'`.

- POST /mcp sin token:

	```bash
	curl -X POST http://localhost:3000/mcp -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}'
	```

	Esperado: 401 con `{ status: 'error', code: 'NO_TOKEN', message: 'No se proporcionó token de autenticación' }`.

- POST /mcp con token inválido/expirado/formato incorrecto: verificar códigos `INVALID_TOKEN`, `TOKEN_EXPIRED`, `INVALID_TOKEN_FORMAT`.

- POST /mcp con token válido: respuesta 200 y flujo normal.

### Documentación para integradores

Actualizar `README.md` y crear `INTEGRACION_FRONTEND.md` con:

- Cómo obtener y enviar el token en header `Authorization: Bearer <token>`.
- Ejemplos con `fetch`, `axios` y React hook.
- Comportamiento esperado ante 401 (redirigir al login, limpiar token, etc.).

### Checklist de implementación (lista ejecutable)

- [ ] Instalar dependencias (`jsonwebtoken`, `dotenv`, `cors`).
- [ ] Añadir `JWT_SECRET` en `.env` y `.env.example`.
- [ ] Crear `src/types/auth.types.ts`.
- [ ] Implementar `src/middleware/auth.middleware.ts` con códigos de error definidos.
- [ ] Implementar `src/middleware/error.middleware.ts`.
- [ ] Modificar `src/server-http.ts` para usar `authenticateToken` en `POST /mcp`, configurar CORS y dotenv.
- [ ] Probar los casos enumerados en "Pruebas y verificación".
- [ ] Actualizar `README.md` e `INTEGRACION_FRONTEND.md`.

### Consideraciones de seguridad y buenas prácticas

- Nunca comitear `.env` ni exponer `JWT_SECRET` en repositorios públicos.
- Registrar intentos fallidos con cuidado (no loguear tokens ni datos sensibles).
- Mantener dependencias actualizadas (auditoría `npm audit`).

### Artefactos a modificar/crear (ruta relativa)

- `src/types/auth.types.ts`
- `src/middleware/auth.middleware.ts`
- `src/middleware/error.middleware.ts`
- `src/server-http.ts` (modificaciones)
- `.env` (local)
- `.env.example`
- `README.md` (sección Autenticación)
- `INTEGRACION_FRONTEND.md`

### Cronograma sugerido (estimado)

- Implementación y tipos: 30-45 minutos
- Middlewares y server changes: 45-60 minutos
- Pruebas y documentación: 30-45 minutos

---

## Criterios de aceptación específicos de la Fase 6

- Automáticamente reproducible con las instrucciones de dependencias y comandos.
- `POST /mcp` devuelve los códigos de error y mensajes exactos descritos en este documento.
- Tests manuales (curl/Postman) pasan para casos: sin token, token formateado mal, token inválido, token expirado y token válido.

---

## Trazabilidad de implementación

- Requisito: Proteger `/mcp` → Artefactos: `src/middleware/auth.middleware.ts`, `src/server-http.ts`.
- Requisito: Manejo de errores → Artefacto: `src/middleware/error.middleware.ts`.
- Requisito: Tipado → Artefacto: `src/types/auth.types.ts`.

Fin de especificación Phase 6.