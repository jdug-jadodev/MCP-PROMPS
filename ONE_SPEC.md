# One Spec: Integración OAuth 2.0 - Fase 2
## Especificación Técnica: Frontend Login Integration

---

## Objetivo

Implementar un **OAuth 2.0 Authorization Server** en el MCP Server que se integre con el sistema de autenticación frontend existente (`https://front-mcp-gules.vercel.app`), permitiendo que VS Code e IntelliJ IDEA se autentiquen mediante el flujo **Authorization Code con PKCE**, manteniendo la identidad del usuario a través de JWT tokens.

**Meta principal:** Conectar el flujo OAuth del MCP Server con el login existente del frontend, de manera que los usuarios puedan autorizar IDEs usando sus credenciales actuales sin duplicar sistemas de autenticación.

---

## Alcance / No alcance

### ✅ En Alcance (Fase 2)

1. **Endpoints OAuth en MCP Server:**
   - `GET /authorize` - Inicio del flujo de autorización
   - `POST /oauth/callback` - Recepción del JWT del frontend
   - `POST /token` - Intercambio de código por access_token
   - `GET /.well-known/oauth-authorization-server` - Metadata OAuth

2. **Sistema de almacenamiento en memoria:**
   - Auth requests (solicitudes OAuth pendientes)
   - Authorization codes (códigos temporales)
   - Refresh tokens (tokens de actualización)

3. **Integración con Frontend:**
   - Detección de flujo OAuth mediante parámetro `oauth_request`
   - Callback después del login exitoso
   - Redirección automática a VS Code/IntelliJ

4. **Validaciones de seguridad:**
   - PKCE (Proof Key for Code Exchange) con SHA256
   - Validación de redirect URIs con wildcards
   - Expiración de códigos y solicitudes
   - Uso único de authorization codes

5. **Soporte para clientes públicos:**
   - `vscode-mcp-client`
   - `intellij-mcp-client`

### ❌ Fuera de Alcance

1. **NO incluido en Fase 2:**
   - Dynamic Client Registration (RFC 7591) - puede agregarse después
   - Almacenamiento persistente en base de datos (se usa memoria)
   - Revocación de tokens endpoint
   - Introspection endpoint
   - OpenID Connect (solo OAuth 2.0)
   - Custom scopes (se usa scope implícito)

2. **NO se modifica:**
   - Backend de autenticación existente
   - Generación de JWT tokens (se reutiliza el actual)
   - Sistema de registro de usuarios
   - Endpoints MCP existentes (`/mcp`)

---

## Definiciones (lenguaje de dominio)

### Actores

- **IDE Client**: VS Code o IntelliJ IDEA con GitHub Copilot que necesita conectarse al MCP Server
- **Usuario**: Persona que posee credenciales en el sistema y desea autorizar el IDE
- **MCP Server**: Servidor que expone prompts MCP y actúa como OAuth Authorization Server
- **Frontend Login**: Aplicación web React existente para autenticación de usuarios
- **Backend Auth**: Sistema existente que genera JWT tokens al validar credenciales

### Términos OAuth 2.0

| Término | Definición |
|---------|------------|
| **Authorization Code** | Código temporal de un solo uso que el cliente intercambia por un access_token (vida: 5 min) |
| **Access Token** | JWT que permite acceder al MCP Server (vida: 1 hora) |
| **Refresh Token** | Token de larga duración para renovar access_token sin re-autenticación (vida: 7 días) |
| **PKCE** | Proof Key for Code Exchange - Mecanismo de seguridad para clientes públicos |
| **Code Verifier** | String aleatorio generado por el cliente (43-128 caracteres) |
| **Code Challenge** | SHA256(code_verifier) en base64url |
| **Client ID** | Identificador público del cliente (`vscode-mcp-client`, `intellij-mcp-client`) |
| **Redirect URI** | URL a la que se redirige después de autorización (ej: `http://127.0.0.1:XXXXX`) |
| **OAuth Request ID** | UUID temporal que vincula la solicitud OAuth con la sesión de login |

### Términos del Sistema

| Término | Definición |
|---------|------------|
| **Auth Request** | Objeto temporal que guarda los parámetros de la solicitud OAuth inicial |
| **JWT del Usuario** | Token existente generado por el backend auth, reutilizado para vincular usuario con OAuth code |
| **Public Client** | Cliente que no puede mantener client_secret seguro (VS Code, apps nativas) |

---

## Principios / Reglas no negociables

### 1. Seguridad

1. **PKCE obligatorio**: Todos los flujos de authorization_code DEBEN validar PKCE con método S256
2. **Uso único de códigos**: Un authorization_code solo puede intercambiarse una vez por token
3. **Expiración estricta**:
   - Auth requests: 10 minutos
   - Authorization codes: 5 minutos
   - Access tokens: 1 hora
   - Refresh tokens: 7 días
4. **Validación de redirect_uri**: DEBE coincidir exactamente con el URI usado en `/authorize`
5. **JWT signature validation**: Todo JWT recibido del frontend DEBE validarse con JWT_SECRET

### 2. Integración con Sistema Existente

1. **No duplicar autenticación**: DEBE reutilizar el sistema de login y JWT existente
2. **No modificar backend auth**: El sistema actual de generación de JWT permanece intacto
3. **CORS configurado**: Frontend login DEBE estar en la whitelist de CORS

### 3. Compatibilidad

1. **Wildcards en redirect URIs**: DEBE soportar `http://127.0.0.1:*` para puertos dinámicos
2. **State parameter**: DEBE preservarse y devolverse sin modificación
3. **Public clients**: NO requerir client_secret para `vscode-mcp-client` e `intellij-mcp-client`

### 4. Idempotencia y Confiabilidad

1. **Auto-limpieza**: Códigos y solicitudes expirados DEBEN eliminarse automáticamente de memoria
2. **Estadísticas**: Sistema DEBE exponer contadores para debugging
3. **Logging detallado**: Cada paso del flujo DEBE logearse con nivel INFO

---

## Límites

### Límites Técnicos

1. **Almacenamiento en memoria**:
   - ⚠️ Los tokens se pierden al reiniciar el servidor
   - ⚠️ No apto para múltiples instancias (sin Redis/DB)
   - ✅ Suficiente para MVP y desarrollo
   - ✅ Puede migrarse a Redis/MongoDB después

2. **Concurrencia**:
   - Máximo 1000 auth requests simultáneas (límite práctico)
   - Máximo 1000 authorization codes activos
   - Sin límite en refresh tokens (pero se auto-limpian)

3. **Rate limiting**:
   - ❌ NO implementado en Fase 2
   - ⚠️ Vulnerable a brute force en `/token`
   - 📝 Debe agregarse rate limiting en producción

### Límites Funcionales

1. **Scopes**:
   - No se implementan scopes personalizados
   - Acceso es todo-o-nada al MCP Server
   - Puede agregarse después si se necesita granularidad

2. **Multi-tenancy**:
   - No hay aislamiento entre organizaciones
   - Todos los usuarios tienen mismo nivel de acceso
   - Puede agregarse `org_id` en JWT para soportarlo

3. **Revocación**:
   - No hay endpoint de revocación de tokens
   - Tokens expiran naturalmente
   - Usuario puede "desautorizar" limpiando configuración del IDE

---

## Eventos y estados (visión raíz)

### Diagrama de Estados del Flujo OAuth

```
[IDE Inicia]
     │
     ▼
[GET /authorize] ──────────────┐
     │                         │
     ▼                         │
[Auth Request Creado]          │ (Redirect)
     │                         │
     │                         ▼
     │              [Frontend Login Page]
     │                         │
     │              [Usuario ingresa credenciales]
     │                         │
     │              [Backend valida y genera JWT]
     │                         │
     │              [POST /oauth/callback]
     │                         │
     ▼                         ▼
[Validar Auth Request] ◄───────┘
     │
     ├── Auth Request inválido/expirado ──► [Error 400]
     │
     ├── JWT inválido ──────────────────────► [Error 401]
     │
     ▼
[Validar JWT Signature]
     │
     ▼
[Generar Authorization Code]
     │
     ├── Asociar: code ↔ userId
     │
     ▼
[Eliminar Auth Request]
     │
     ▼
[Retornar redirect_uri con code]
     │
     ▼
[Frontend redirige a IDE] ──────┐
     │                           │
     ▼                           │
[IDE recibe code + state] ◄──────┘
     │
     ▼
[POST /token]
     │
     ├── Code inválido/expirado ──► [Error 400]
     │
     ├── PKCE inválido ────────────► [Error 400]
     │
     ├── Client ID no coincide ────► [Error 400]
     │
     ▼
[Validar PKCE: SHA256(verifier) == challenge]
     │
     ▼
[Eliminar Authorization Code]
     │
     ▼
[Generar Access Token (JWT)]
     │
     ▼
[Generar Refresh Token]
     │
     ▼
[Retornar tokens al IDE]
     │
     ▼
[IDE guarda access_token]
     │
     ▼
[IDE usa token en POST /mcp]
     │
     ▼
[✅ Autenticado]
```

### Tabla de Estados de Objetos

| Objeto | Estado Inicial | Estados Intermedios | Estado Final | TTL |
|--------|---------------|---------------------|--------------|-----|
| **Auth Request** | Creado en `/authorize` | Pendiente de login | Consumido o Expirado | 10 min |
| **Authorization Code** | Generado en `/oauth/callback` | Pendiente de intercambio | Canjeado o Expirado | 5 min |
| **Access Token** | Generado en `/token` | Activo | Expirado | 1 hora |
| **Refresh Token** | Generado en `/token` | Activo | Usado o Expirado | 7 días |

### Eventos del Sistema

| Evento | Trigger | Acción |
|--------|---------|--------|
| `oauth.auth_request.created` | `GET /authorize` | Guardar en memoria, iniciar timer de expiración |
| `oauth.auth_request.expired` | Timeout 10 min | Auto-eliminar de memoria |
| `oauth.code.generated` | `POST /oauth/callback` exitoso | Asociar code ↔ userId, iniciar timer |
| `oauth.code.redeemed` | `POST /token` exitoso | Eliminar code, generar tokens |
| `oauth.code.expired` | Timeout 5 min | Auto-eliminar de memoria |
| `oauth.token.issued` | `POST /token` exitoso | Loguear emisión, retornar al cliente |
| `oauth.token.expired` | JWT expiration | Token ya no válido (validación automática de JWT) |

---

## Criterios de aceptación (root)

### CA-1: Endpoint de Metadata OAuth

**GIVEN** el MCP Server está corriendo  
**WHEN** se hace `GET /.well-known/oauth-authorization-server`  
**THEN**:
- ✅ Responde HTTP 200
- ✅ Content-Type: `application/json`
- ✅ JSON contiene:
  - `issuer`: URL base del servidor
  - `authorization_endpoint`: `/authorize`
  - `token_endpoint`: `/token`
  - `response_types_supported`: `["code"]`
  - `grant_types_supported`: `["authorization_code", "refresh_token"]`
  - `code_challenge_methods_supported`: `["S256", "plain"]`

### CA-2: Inicio del Flujo de Autorización

**GIVEN** un cliente OAuth válido (vscode-mcp-client)  
**WHEN** se hace `GET /authorize?client_id=vscode-mcp-client&redirect_uri=http://127.0.0.1:12345&response_type=code&state=xyz&code_challenge=abc&code_challenge_method=S256`  
**THEN**:
- ✅ Responde HTTP 302 (redirect)
- ✅ Location header apunta a: `https://front-mcp-gules.vercel.app/login?oauth_request={UUID}`
- ✅ Auth request guardado en memoria con:
  - `clientId`, `redirectUri`, `state`, `codeChallenge`, `codeChallengeMethod`
  - `expiresAt` = now + 10 min
- ✅ Timer de auto-limpieza iniciado

**WHEN** client_id es inválido  
**THEN**:
- ✅ Responde HTTP 400
- ✅ JSON: `{ "error": "invalid_client" }`

**WHEN** redirect_uri no coincide con patrón permitido  
**THEN**:
- ✅ Responde HTTP 400
- ✅ JSON: `{ "error": "invalid_redirect_uri" }`

### CA-3: Callback del Frontend con JWT

**GIVEN** un auth request válido con ID `REQ123`  
**AND** el usuario completó login y obtuvo JWT  
**WHEN** se hace `POST /oauth/callback` con:
```json
{
  "oauth_request": "REQ123",
  "token": "eyJhbGc..."
}
```
**THEN**:
- ✅ JWT es validado con JWT_SECRET
- ✅ Se extrae `userId` y `email` del JWT
- ✅ Se genera `authorization_code` (UUID)
- ✅ Code se asocia con: userId, clientId, redirectUri, codeChallenge
- ✅ Auth request se elimina de memoria
- ✅ Responde HTTP 200 con:
```json
{
  "success": true,
  "redirect_uri": "http://127.0.0.1:12345?code=AUTH_CODE&state=xyz"
}
```

**WHEN** oauth_request no existe o expiró  
**THEN**:
- ✅ Responde HTTP 400
- ✅ JSON: `{ "error": "invalid_request" }`

**WHEN** JWT es inválido o expirado  
**THEN**:
- ✅ Responde HTTP 401
- ✅ JSON: `{ "error": "invalid_token" }`

### CA-4: Intercambio de Código por Token

**GIVEN** un authorization code válido `AUTH_CODE`  
**WHEN** se hace `POST /token` con:
```
grant_type=authorization_code
code=AUTH_CODE
client_id=vscode-mcp-client
redirect_uri=http://127.0.0.1:12345
code_verifier=VERIFIER_ORIGINAL
```
**THEN**:
- ✅ Se valida que el code existe y no ha expirado
- ✅ Se valida que `SHA256(code_verifier)` == `code_challenge`
- ✅ Se valida que `client_id` y `redirect_uri` coinciden
- ✅ Code se elimina de memoria (uso único)
- ✅ Se genera `access_token` (JWT) con payload:
```json
{
  "userId": "...",
  "email": "...",
  "clientId": "vscode-mcp-client",
  "type": "access_token",
  "exp": now + 1h
}
```
- ✅ Se genera `refresh_token` (JWT) con `exp`: now + 7d
- ✅ Responde HTTP 200 con:
```json
{
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "..."
}
```

**WHEN** code es inválido o ya fue usado  
**THEN**:
- ✅ Responde HTTP 400
- ✅ JSON: `{ "error": "invalid_grant" }`

**WHEN** PKCE validation falla  
**THEN**:
- ✅ Responde HTTP 400
- ✅ JSON: `{ "error": "invalid_grant", "message": "PKCE validation failed" }`

### CA-5: Uso de Refresh Token

**GIVEN** un refresh token válido  
**WHEN** se hace `POST /token` con:
```
grant_type=refresh_token
refresh_token=REFRESH_TOKEN
client_id=vscode-mcp-client
```
**THEN**:
- ✅ Se valida el JWT del refresh_token
- ✅ Se verifica que `type` == "refresh_token"
- ✅ Se genera nuevo `access_token` (sin generar nuevo refresh_token)
- ✅ Responde HTTP 200 con nuevo access_token

### CA-6: Integración con Frontend

**GIVEN** el frontend recibe `?oauth_request=REQ123` en la URL  
**WHEN** el usuario completa login exitosamente  
**THEN**:
- ✅ Frontend detecta que es flujo OAuth (sessionStorage tiene `oauth_request`)
- ✅ Frontend llama a `POST /oauth/callback` con JWT del usuario
- ✅ Frontend recibe `redirect_uri` en respuesta
- ✅ Frontend ejecuta `window.location.href = redirect_uri`
- ✅ Usuario es redirigido de vuelta al IDE
- ✅ sessionStorage limpia `oauth_request`

### CA-7: Validación de Seguridad

**GIVEN** cualquier endpoint OAuth  
**THEN**:
- ✅ Todos los códigos expiran según TTL definido
- ✅ Códigos expirados se auto-eliminan de memoria
- ✅ No hay memory leaks (timers se limpian correctamente)
- ✅ Logs registran cada paso del flujo
- ✅ Errores no exponen información sensible

### CA-8: Compatibilidad con IDEs

**WHEN** VS Code intenta autorizar con puerto dinámico `http://127.0.0.1:54321`  
**THEN**:
- ✅ Redirect URI es aceptado (coincide con patrón `http://127.0.0.1:*`)
- ✅ Flujo completa exitosamente

**WHEN** IntelliJ usa `client_id=intellij-mcp-client`  
**THEN**:
- ✅ Cliente es reconocido
- ✅ Flujo completa exitosamente

---

## Trazabilidad

### Referencia al Plan Original

Este ONE_SPEC documenta la implementación de:
- **Documento fuente**: [PLAN_INTEGRACION_OAUTH_MCP_VSCODE.md](./PLAN_INTEGRACION_OAUTH_MCP_VSCODE.md)
- **Sección**: Fase 2: Integración con Frontend de Login
- **Páginas**: Sección "🔗 Fase 2" (completa)

### Archivos a Crear/Modificar

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `src/oauth/config.ts` | Crear | Configuración de clientes OAuth, TTLs, redirect URIs |
| `src/oauth/storage.ts` | Crear | Sistema de almacenamiento en memoria para auth requests, codes, tokens |
| `src/oauth/routes.ts` | Crear | Endpoints OAuth (`/authorize`, `/oauth/callback`, `/token`, `/.well-known/*`) |
| `src/server-http.ts` | Modificar | Integrar rutas OAuth antes del middleware de autenticación |
| `package.json` | Modificar | Agregar dependencia: `uuid` y `@types/uuid` |
| `frontend/Login.tsx` | Modificar | Detectar oauth_request, completar callback después de login |

### Variables de Entorno Requeridas

```env
# Existentes (ya configuradas)
JWT_SECRET=<tu-secret-actual>
CORS_ORIGIN=https://front-mcp-gules.vercel.app
PORT=3000

# Nuevas para OAuth Fase 2
OAUTH_ISSUER=https://mcp-promps.onrender.com
FRONTEND_LOGIN_URL=https://front-mcp-gules.vercel.app/login
```

### Dependencias de Fases

- **Depende de**: Sistema de autenticación existente (JWT), Frontend de login operativo
- **Bloqueante para**: Fase 3 (Configuración VS Code), Fase 4 (Configuración IntelliJ)
- **Puede ejecutarse en paralelo con**: Ninguna (base para fases siguientes)

### Métricas de Éxito

| Métrica | Target | Medición |
|---------|--------|----------|
| Tiempo de autorización | < 5 segundos | Desde `/authorize` hasta recepción de `access_token` |
| Tasa de éxito de login | > 95% | Flujos completados / flujos iniciados |
| Errores de PKCE | 0% | En flujos legítimos |
| Tokens expirados prematuramente | 0% | Validar con logs |
| Memory leaks | 0 | Monitorear proceso Node.js durante 24h |

---

## Notas de Implementación

### Prioridades

1. **Alta prioridad** (MVP):
   - Endpoints `/authorize`, `/oauth/callback`, `/token`
   - Validación PKCE con S256
   - Integración con JWT existente
   - Storage en memoria con auto-limpieza

2. **Media prioridad** (post-MVP):
   - Estadísticas y monitoring
   - Rate limiting en `/token`
   - Logging estructurado

3. **Baja prioridad** (futuro):
   - Migración a almacenamiento persistente (Redis/MongoDB)
   - Dynamic Client Registration
   - Revocación de tokens
   - Introspection endpoint

### Riesgos Identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Storage en memoria no escala | Media | Alto | Documentar migración a Redis, aceptable para MVP |
| CORS issues entre dominios | Baja | Alto | Configurar CORS correctamente desde el inicio |
| Memory leaks en timers | Media | Medio | Testing exhaustivo de auto-limpieza, usar WeakMap si es necesario |
| Frontend redirect issues | Media | Alto | Testing con múltiples navegadores, manejar edge cases |

---

**Versión**: 1.0  
**Fecha**: 16 de marzo de 2026  
**Estado**: Especificación completa para implementación