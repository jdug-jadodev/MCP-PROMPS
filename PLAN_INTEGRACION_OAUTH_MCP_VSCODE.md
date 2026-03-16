# 🔐 Plan de Integración OAuth 2.0 para MCP Server con VS Code e IntelliJ

**Objetivo:** Permitir que GitHub Copilot (VS Code/IntelliJ) se autentique contra tu MCP Server usando OAuth 2.0, integrándose con tu sistema de autenticación existente.

**Fecha:** 16 de marzo de 2026  
**Estado:** Pendiente

---

## 🌐 URLs de tu Sistema

| Componente | URL |
|------------|-----|
| **MCP Server** | `https://mcp-promps.onrender.com` |
| **Frontend Login** | `https://front-mcp-gules.vercel.app/login` |
| **Backend Auth** | *(tu backend de autenticación)* |

---

## 📋 Tabla de Contenidos

1. [Problema Actual](#problema-actual)
2. [Solución Propuesta](#solución-propuesta)
3. [Arquitectura OAuth 2.0](#arquitectura-oauth-20)
4. [Fase 1: Configuración OAuth Server](#fase-1-configuración-oauth-server)
5. [Fase 2: Integración con Frontend de Login](#fase-2-integración-con-tu-frontend-de-login)
6. [Fase 3: Configuración VS Code](#fase-3-configuración-vs-code)
7. [Fase 4: Configuración IntelliJ](#fase-4-configuración-intellij)
8. [Fase 5: Testing y Validación](#fase-5-testing-y-validación)
9. [Checklist de Implementación](#checklist-de-implementación)

---

## 🎯 Problema Actual

### Lo que tienes
```
┌─────────────┐     JWT Token      ┌─────────────────┐
│  Frontend   │───────────────────▶│   MCP Server    │
│  (React)    │  Authorization:    │  (tu servidor)  │
│             │  Bearer <token>    │                 │
└─────────────┘                    └─────────────────┘
       │
       │ Login/Register
       ▼
┌─────────────────┐
│  Backend Auth   │
│  (genera JWT)   │
└─────────────────┘
```

### El problema con VS Code/IntelliJ
```
┌─────────────────┐                 ┌─────────────────┐
│   VS Code       │───── ??? ──────▶│   MCP Server    │
│   (Copilot)     │                 │  (tu servidor)  │
└─────────────────┘                 └─────────────────┘

❌ VS Code NO tiene tu token JWT
❌ VS Code NO puede hacer login en tu frontend
❌ VS Code espera OAuth 2.0 Authorization Server
```

### El mensaje que ves
VS Code detectó que tu servidor tiene autenticación pero NO soporta:
- **Dynamic Client Registration** (RFC 7591)
- **OAuth 2.0 Authorization Server** completo

Por eso te pregunta si quieres proceder **manualmente** con un Client ID.

---

## ✅ Solución Propuesta

Implementar **OAuth 2.0 Authorization Server** en tu MCP Server que:
1. Se integre con tu backend de autenticación existente
2. Soporte el flujo OAuth 2.0 Authorization Code
3. Permita a VS Code e IntelliJ autenticarse

### Arquitectura Final
```
┌─────────────────┐                          ┌─────────────────────────────────────┐
│   VS Code       │                          │         MCP Server                  │
│   (Copilot)     │                          │    https://mcp-promps.onrender.com  │
└────────┬────────┘                          │                                     │
         │                                   │  ┌───────────────────────────────┐  │
         │ 1. Descubre OAuth                 │  │  OAuth 2.0 Authorization      │  │
         │    GET /.well-known/              │  │  Server                        │  │
         │    oauth-authorization-server     │  │                               │  │
         │◄──────────────────────────────────│  │  - /authorize                 │  │
         │                                   │  │  - /token                     │  │
         │ 2. Redirige al navegador          │  │  - /oauth/register (opcional) │  │
         │    GET /authorize?                │  │  - /.well-known/oauth-*       │  │
         │    client_id=vscode&              │  └───────────┬───────────────────┘  │
         │    redirect_uri=...               │              │                      │
         │                                   │              │                      │
         ▼                                   │              ▼                      │
┌─────────────────┐                          │  ┌───────────────────────────────┐  │
│   Navegador     │                          │  │  Integración con tu           │  │
│   del Usuario   │◄─────────────────────────│  │  Backend Auth Existente       │  │
│                 │                          │  │                               │  │
│  Ve tu página   │   3. Usuario hace        │  │  - Redirige a tu frontend     │  │
│  de login       │      login normal        │  │  - Valida sesión existente    │  │
│                 │                          │  │  - O usa embedded login       │  │
└────────┬────────┘                          │  └───────────────────────────────┘  │
         │                                   │                                     │
         │ 4. Callback con código            │                                     │
         │    /callback?code=ABC123          │                                     │
         │────────────────────────────────▶  │                                     │
         │                                   │                                     │
         │ 5. VS Code intercambia código     │                                     │
         │    POST /token                    │                                     │
         │◄──────────────────────────────────│                                     │
         │    access_token: ...              │                                     │
         │                                   │                                     │
         │ 6. Usa MCP con token              │                                     │
         │    POST /mcp                      │                                     │
         │    Authorization: Bearer ...      │                                     │
         │────────────────────────────────▶  │                                     │
         │                                   └─────────────────────────────────────┘
```

---

## 🏗️ Arquitectura OAuth 2.0

### Endpoints Requeridos por MCP Auth

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/.well-known/oauth-authorization-server` | GET | Metadata del servidor OAuth |
| `/authorize` | GET | Inicio del flujo de autorización |
| `/token` | POST | Intercambio de código por token |
| `/oauth/register` | POST | (Opcional) Registro dinámico de clientes |

### Flujo OAuth 2.0 Authorization Code con PKCE

```
1. VS Code genera code_verifier y code_challenge (PKCE)
2. VS Code abre navegador → GET /authorize?
     client_id=vscode-mcp
     redirect_uri=http://127.0.0.1:XXXXX
     response_type=code
     code_challenge=...
     code_challenge_method=S256
     state=...

3. Usuario ve página de login (tu frontend o página embedded)
4. Usuario hace login con sus credenciales
5. Servidor genera authorization_code
6. Redirige a redirect_uri?code=ABC123&state=...

7. VS Code recibe el código
8. VS Code → POST /token
     grant_type=authorization_code
     code=ABC123
     client_id=vscode-mcp
     redirect_uri=...
     code_verifier=...

9. Servidor valida y retorna:
     {
       "access_token": "...",
       "token_type": "Bearer",
       "expires_in": 3600,
       "refresh_token": "..." (opcional)
     }

10. VS Code usa access_token en todas las llamadas a /mcp
```

---

## 📦 Fase 1: Configuración OAuth Server

**Duración estimada:** 2-3 horas

### 1.1 Instalar dependencias

```bash
npm install oauth2-server simple-oauth2 uuid
npm install -D @types/uuid
```

### 1.2 Crear estructura de archivos

```
src/
├── oauth/
│   ├── config.ts           # Configuración OAuth
│   ├── model.ts            # Modelo de datos (clientes, tokens, códigos)
│   ├── routes.ts           # Endpoints OAuth
│   ├── storage.ts          # Almacenamiento (memoria/Redis/DB)
│   └── views/
│       └── login.html      # Página de login embedded (opcional)
```

### 1.3 Crear archivo de configuración OAuth

**Archivo:** `src/oauth/config.ts`
```typescript
export const oauthConfig = {
  // URIs de redirección permitidas para VS Code e IntelliJ
  allowedRedirectUris: [
    'http://127.0.0.1:*',           // VS Code local (puerto dinámico)
    'https://vscode.dev/redirect',   // VS Code web
    'https://insiders.vscode.dev/redirect',
    'http://localhost:*',            // IntelliJ local
    // Agregar más según necesites
  ],
  
  // Clientes pre-registrados
  clients: {
    'vscode-mcp': {
      clientId: 'vscode-mcp',
      clientSecret: null,  // Clientes públicos no tienen secret
      name: 'VS Code Copilot',
      grants: ['authorization_code', 'refresh_token'],
    },
    'intellij-mcp': {
      clientId: 'intellij-mcp', 
      clientSecret: null,
      name: 'IntelliJ IDEA',
      grants: ['authorization_code', 'refresh_token'],
    }
  },
  
  // Tokens
  accessTokenLifetime: 3600,      // 1 hora
  refreshTokenLifetime: 86400 * 7, // 7 días
  authorizationCodeLifetime: 300,  // 5 minutos
};
```

### 1.4 Crear endpoint de metadata OAuth

**Archivo:** `src/oauth/routes.ts` (parcial)
```typescript
import { Router } from 'express';

const router = Router();

// Metadata del servidor OAuth (requerido por MCP)
router.get('/.well-known/oauth-authorization-server', (req, res) => {
  const baseUrl = process.env.OAUTH_ISSUER || `https://${req.headers.host}`;
  
  res.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/authorize`,
    token_endpoint: `${baseUrl}/token`,
    // registration_endpoint: `${baseUrl}/oauth/register`, // Si soportas DCR
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256', 'plain'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
  });
});

export default router;
```

---

## 🔗 Fase 2: Integración con tu Frontend de Login

**Duración estimada:** 3-4 horas

### Flujo Completo Detallado

```
┌──────────────┐         ┌─────────────────────────────────┐         ┌────────────────────────────┐
│   VS Code    │         │          MCP SERVER             │         │         FRONTEND           │
│   Copilot    │         │  mcp-promps.onrender.com        │         │ front-mcp-gules.vercel.app │
└──────┬───────┘         └───────────────┬─────────────────┘         └─────────────┬──────────────┘
       │                                 │                                         │
       │ 1. GET /authorize?              │                                         │
       │    client_id=vscode-mcp         │                                         │
       │    redirect_uri=127.0.0.1:XXXX  │                                         │
       │    code_challenge=abc123        │                                         │
       │    state=xyz789                 │                                         │
       │────────────────────────────────▶│                                         │
       │                                 │                                         │
       │                                 │ 2. Guarda oauth_request en memoria      │
       │                                 │    { clientId, redirectUri, state,      │
       │                                 │      codeChallenge, ... }               │
       │                                 │                                         │
       │                                 │ 3. Redirect 302                         │
       │                                 │────────────────────────────────────────▶│
       │                                 │  https://front-mcp-gules.vercel.app     │
       │                                 │  /login?oauth_request=REQ123            │
       │                                 │                                         │
       │                                 │                    4. Usuario ve login  │
       │                                 │                       Ingresa email/pwd │
       │                                 │                                         │
       │                                 │                    5. Login exitoso     │
       │                                 │                       Frontend tiene    │
       │                                 │                       JWT del usuario   │
       │                                 │                                         │
       │                                 │ 6. POST /oauth/callback                 │
       │                                 │◀───────────────────────────────────────│
       │                                 │    { oauth_request: REQ123,             │
       │                                 │      token: JWT_DEL_USUARIO }           │
       │                                 │                                         │
       │                                 │ 7. MCP valida JWT, extrae userId        │
       │                                 │    Genera authorization_code            │
       │                                 │    Asocia código con userId             │
       │                                 │                                         │
       │                                 │ 8. Responde con redirect_uri            │
       │                                 │────────────────────────────────────────▶│
       │                                 │    { redirect: "127.0.0.1:XXXX          │
       │                                 │      ?code=AUTH_CODE&state=xyz789" }    │
       │                                 │                                         │
       │                                 │                    9. Frontend redirige │
       │◀────────────────────────────────────────────────────────────────────────│
       │  http://127.0.0.1:XXXX?code=AUTH_CODE&state=xyz789                        │
       │                                 │                                         │
       │ 10. POST /token                 │                                         │
       │     code=AUTH_CODE              │                                         │
       │     code_verifier=...           │                                         │
       │────────────────────────────────▶│                                         │
       │                                 │                                         │
       │ 11. Recibe access_token         │                                         │
       │◀────────────────────────────────│                                         │
       │     { access_token, expires_in }│                                         │
       │                                 │                                         │
       │ 12. POST /mcp                   │                                         │
       │     Authorization: Bearer ...   │                                         │
       │────────────────────────────────▶│                                         │
       │                                 │                                         │
       │     ✅ Conexión MCP autenticada │                                         │
```

### 2.1 Endpoint `/authorize` en MCP Server

```typescript
// src/oauth/routes.ts
import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { oauthStorage } from './storage';
import { registeredClients } from './config';

const router = Router();

// GET /authorize - Inicia flujo OAuth
router.get('/authorize', (req, res) => {
  const { 
    client_id, 
    redirect_uri, 
    state, 
    code_challenge, 
    code_challenge_method,
    response_type 
  } = req.query;

  // 1. Validar client_id
  const client = registeredClients[client_id as string];
  if (!client) {
    return res.status(400).json({ error: 'invalid_client', message: 'Cliente no registrado' });
  }

  // 2. Validar redirect_uri (debe coincidir con patrón registrado)
  const isValidRedirectUri = validateRedirectUri(redirect_uri as string, client.redirectUris);
  if (!isValidRedirectUri) {
    return res.status(400).json({ error: 'invalid_redirect_uri' });
  }

  // 3. Validar response_type
  if (response_type !== 'code') {
    return res.status(400).json({ error: 'unsupported_response_type' });
  }

  // 4. Guardar solicitud OAuth en memoria (expira en 10 min)
  const oauthRequestId = uuid();
  oauthStorage.saveAuthRequest(oauthRequestId, {
    clientId: client_id as string,
    redirectUri: redirect_uri as string,
    state: state as string,
    codeChallenge: code_challenge as string,
    codeChallengeMethod: (code_challenge_method as string) || 'S256',
    createdAt: Date.now(),
    expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutos
  });

  // 5. Redirigir a tu frontend de login
  const frontendLoginUrl = 'https://front-mcp-gules.vercel.app/login';
  const loginRedirectUrl = `${frontendLoginUrl}?oauth_request=${oauthRequestId}`;
  
  console.log(`🔐 OAuth: Redirigiendo a login con request ${oauthRequestId}`);
  res.redirect(loginRedirectUrl);
});

// Función helper para validar redirect_uri con wildcards
function validateRedirectUri(uri: string, allowedPatterns: string[]): boolean {
  return allowedPatterns.some(pattern => {
    // Convertir patrón con wildcard a regex
    // "http://127.0.0.1:*" → /^http:\/\/127\.0\.0\.1:\d+/
    const regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escapar caracteres especiales
      .replace(/\*/g, '.*'); // Convertir * a .*
    const regex = new RegExp(`^${regexPattern}`);
    return regex.test(uri);
  });
}

export default router;
```

### 2.2 Endpoint `/oauth/callback` - Recibe el token del Frontend

```typescript
// src/oauth/routes.ts (continúa)
import jwt from 'jsonwebtoken';

// POST /oauth/callback - Frontend envía el JWT después del login
router.post('/oauth/callback', async (req, res) => {
  const { oauth_request, token } = req.body;

  // 1. Validar que existe la solicitud OAuth
  const authRequest = oauthStorage.getAuthRequest(oauth_request);
  if (!authRequest) {
    return res.status(400).json({ 
      error: 'invalid_request', 
      message: 'Solicitud OAuth expirada o inválida' 
    });
  }

  // 2. Validar que no ha expirado
  if (Date.now() > authRequest.expiresAt) {
    oauthStorage.deleteAuthRequest(oauth_request);
    return res.status(400).json({ 
      error: 'expired_request', 
      message: 'La solicitud OAuth ha expirado' 
    });
  }

  // 3. Validar el JWT del usuario (usando tu JWT_SECRET existente)
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; email: string };
    
    // 4. Generar authorization_code
    const authorizationCode = uuid();
    
    // 5. Guardar el código asociado al usuario y la solicitud
    oauthStorage.saveAuthorizationCode(authorizationCode, {
      code: authorizationCode,
      userId: decoded.userId,
      email: decoded.email,
      clientId: authRequest.clientId,
      redirectUri: authRequest.redirectUri,
      codeChallenge: authRequest.codeChallenge,
      codeChallengeMethod: authRequest.codeChallengeMethod,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutos
      createdAt: Date.now()
    });

    // 6. Limpiar la solicitud OAuth (ya no se necesita)
    oauthStorage.deleteAuthRequest(oauth_request);

    // 7. Construir URL de redirección para VS Code
    const redirectUrl = new URL(authRequest.redirectUri);
    redirectUrl.searchParams.set('code', authorizationCode);
    if (authRequest.state) {
      redirectUrl.searchParams.set('state', authRequest.state);
    }

    console.log(`✅ OAuth: Código generado para usuario ${decoded.email}`);

    // 8. Responder al frontend con la URL de redirección
    res.json({ 
      success: true,
      redirect_uri: redirectUrl.toString()
    });

  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    return res.status(401).json({ 
      error: 'invalid_token', 
      message: 'Token JWT inválido o expirado' 
    });
  }
});
```

### 2.3 Cambios en tu Frontend (front-mcp-gules.vercel.app)

Tu frontend necesita detectar cuando viene de un flujo OAuth y completarlo:

```typescript
// En tu página de login (React)
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isOAuthFlow, setIsOAuthFlow] = useState(false);
  const oauthRequest = searchParams.get('oauth_request');

  useEffect(() => {
    // Detectar si es flujo OAuth
    if (oauthRequest) {
      setIsOAuthFlow(true);
      // Guardar en sessionStorage para usarlo después del login
      sessionStorage.setItem('oauth_request', oauthRequest);
    }
  }, [oauthRequest]);

  const handleLoginSuccess = async (jwtToken: string) => {
    const savedOAuthRequest = sessionStorage.getItem('oauth_request');
    
    if (savedOAuthRequest) {
      // Es flujo OAuth - completar el flujo
      try {
        const response = await fetch('https://mcp-promps.onrender.com/oauth/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            oauth_request: savedOAuthRequest,
            token: jwtToken
          })
        });

        const data = await response.json();
        
        if (data.success && data.redirect_uri) {
          // Limpiar y redirigir a VS Code
          sessionStorage.removeItem('oauth_request');
          window.location.href = data.redirect_uri;
        } else {
          console.error('Error en OAuth callback:', data);
          // Mostrar error al usuario
        }
      } catch (error) {
        console.error('Error completando OAuth:', error);
      }
    } else {
      // Login normal - comportamiento existente
      navigate('/dashboard');
    }
  };

  return (
    <div>
      {isOAuthFlow && (
        <div className="oauth-notice">
          🔐 Estás iniciando sesión para conectar con VS Code/IntelliJ
        </div>
      )}
      
      {/* Tu formulario de login existente */}
      <LoginForm onSuccess={handleLoginSuccess} />
    </div>
  );
}
```

### 2.4 Endpoint `/token` - Intercambio de código por access_token

Este es el endpoint que VS Code llama después de recibir el authorization_code:

```typescript
// src/oauth/routes.ts (continúa)
import crypto from 'crypto';

// POST /token - Intercambia código por access_token
router.post('/token', express.urlencoded({ extended: true }), async (req, res) => {
  const { 
    grant_type, 
    code, 
    client_id, 
    redirect_uri, 
    code_verifier,
    refresh_token 
  } = req.body;

  // Soporte para refresh_token
  if (grant_type === 'refresh_token') {
    return handleRefreshToken(req, res, refresh_token, client_id);
  }

  // Validar grant_type
  if (grant_type !== 'authorization_code') {
    return res.status(400).json({ error: 'unsupported_grant_type' });
  }

  // 1. Buscar el authorization_code
  const authCode = oauthStorage.getAuthorizationCode(code);
  if (!authCode) {
    return res.status(400).json({ error: 'invalid_grant', message: 'Código inválido o expirado' });
  }

  // 2. Validar que no ha expirado
  if (Date.now() > authCode.expiresAt) {
    oauthStorage.deleteAuthorizationCode(code);
    return res.status(400).json({ error: 'invalid_grant', message: 'Código expirado' });
  }

  // 3. Validar client_id
  if (authCode.clientId !== client_id) {
    return res.status(400).json({ error: 'invalid_grant', message: 'Client ID no coincide' });
  }

  // 4. Validar redirect_uri
  if (authCode.redirectUri !== redirect_uri) {
    return res.status(400).json({ error: 'invalid_grant', message: 'Redirect URI no coincide' });
  }

  // 5. Validar PKCE (code_verifier)
  if (authCode.codeChallenge) {
    const isValidPKCE = validatePKCE(
      code_verifier, 
      authCode.codeChallenge, 
      authCode.codeChallengeMethod
    );
    if (!isValidPKCE) {
      return res.status(400).json({ error: 'invalid_grant', message: 'PKCE validation failed' });
    }
  }

  // 6. Eliminar código (solo se puede usar una vez)
  oauthStorage.deleteAuthorizationCode(code);

  // 7. Generar access_token (JWT con datos del usuario)
  const accessToken = jwt.sign(
    { 
      userId: authCode.userId, 
      email: authCode.email,
      clientId: client_id,
      type: 'access_token'
    },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );

  // 8. Generar refresh_token
  const newRefreshToken = jwt.sign(
    { 
      userId: authCode.userId,
      email: authCode.email,
      clientId: client_id,
      type: 'refresh_token'
    },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );

  // Guardar refresh_token
  oauthStorage.saveRefreshToken(newRefreshToken, {
    userId: authCode.userId,
    email: authCode.email,
    clientId: client_id,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
  });

  console.log(`✅ Token generado para usuario ${authCode.email} (cliente: ${client_id})`);

  // 9. Responder con tokens
  res.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: newRefreshToken
  });
});

// Validar PKCE
function validatePKCE(verifier: string, challenge: string, method: string): boolean {
  if (!verifier) return false;
  
  if (method === 'plain') {
    return verifier === challenge;
  }
  
  // S256: BASE64URL(SHA256(code_verifier)) === code_challenge
  const hash = crypto.createHash('sha256').update(verifier).digest();
  const computed = hash.toString('base64url');
  return computed === challenge;
}

// Manejar refresh_token
async function handleRefreshToken(req: any, res: any, refreshToken: string, clientId: string) {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as any;
    
    if (decoded.type !== 'refresh_token') {
      return res.status(400).json({ error: 'invalid_grant' });
    }

    // Generar nuevo access_token
    const newAccessToken = jwt.sign(
      { 
        userId: decoded.userId, 
        email: decoded.email,
        clientId: clientId,
        type: 'access_token'
      },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    res.json({
      access_token: newAccessToken,
      token_type: 'Bearer',
      expires_in: 3600
    });
  } catch (error) {
    return res.status(400).json({ error: 'invalid_grant', message: 'Refresh token inválido' });
  }
}
```

### 2.5 Storage en Memoria (`src/oauth/storage.ts`)

```typescript
// src/oauth/storage.ts

interface AuthRequest {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  createdAt: number;
  expiresAt: number;
}

interface AuthorizationCode {
  code: string;
  userId: string;
  email: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  expiresAt: number;
  createdAt: number;
}

interface RefreshTokenData {
  userId: string;
  email: string;
  clientId: string;
  expiresAt: number;
}

class OAuthStorage {
  private authRequests: Map<string, AuthRequest> = new Map();
  private authorizationCodes: Map<string, AuthorizationCode> = new Map();
  private refreshTokens: Map<string, RefreshTokenData> = new Map();

  // Auth Requests
  saveAuthRequest(id: string, data: AuthRequest): void {
    this.authRequests.set(id, data);
    // Auto-limpiar después de expiración
    setTimeout(() => this.authRequests.delete(id), 10 * 60 * 1000);
  }

  getAuthRequest(id: string): AuthRequest | undefined {
    return this.authRequests.get(id);
  }

  deleteAuthRequest(id: string): void {
    this.authRequests.delete(id);
  }

  // Authorization Codes
  saveAuthorizationCode(code: string, data: AuthorizationCode): void {
    this.authorizationCodes.set(code, data);
    // Auto-limpiar después de 5 minutos
    setTimeout(() => this.authorizationCodes.delete(code), 5 * 60 * 1000);
  }

  getAuthorizationCode(code: string): AuthorizationCode | undefined {
    return this.authorizationCodes.get(code);
  }

  deleteAuthorizationCode(code: string): void {
    this.authorizationCodes.delete(code);
  }

  // Refresh Tokens
  saveRefreshToken(token: string, data: RefreshTokenData): void {
    this.refreshTokens.set(token, data);
  }

  getRefreshToken(token: string): RefreshTokenData | undefined {
    return this.refreshTokens.get(token);
  }

  deleteRefreshToken(token: string): void {
    this.refreshTokens.delete(token);
  }

  // Estadísticas (útil para debugging)
  getStats() {
    return {
      authRequests: this.authRequests.size,
      authorizationCodes: this.authorizationCodes.size,
      refreshTokens: this.refreshTokens.size
    };
  }
}

// Singleton
export const oauthStorage = new OAuthStorage();
```

### 2.6 Configuración de Clientes (`src/oauth/config.ts`)

```typescript
// src/oauth/config.ts

export interface OAuthClient {
  clientId: string;
  name: string;
  redirectUris: string[];
  grants: string[];
  isPublic: boolean;
}

export const registeredClients: Record<string, OAuthClient> = {
  'vscode-mcp-client': {
    clientId: 'vscode-mcp-client',
    name: 'VS Code MCP Client',
    redirectUris: [
      'http://127.0.0.1:*',        // VS Code puerto dinámico
      'http://localhost:*',         // Alternativo
      'https://vscode.dev/redirect',
      'https://insiders.vscode.dev/redirect'
    ],
    grants: ['authorization_code', 'refresh_token'],
    isPublic: true
  },
  'intellij-mcp-client': {
    clientId: 'intellij-mcp-client',
    name: 'IntelliJ IDEA MCP Client',
    redirectUris: [
      'http://127.0.0.1:*',
      'http://localhost:*'
    ],
    grants: ['authorization_code', 'refresh_token'],
    isPublic: true
  }
};

export const oauthConfig = {
  accessTokenLifetime: 3600,        // 1 hora
  refreshTokenLifetime: 604800,     // 7 días
  authorizationCodeLifetime: 300,   // 5 minutos
  authRequestLifetime: 600,         // 10 minutos
};
```

### 2.7 Integrar rutas OAuth en server-http.ts

```typescript
// src/server-http.ts (agregar estas líneas)

import oauthRoutes from './oauth/routes';

// ... después de app.use(express.json())

// Rutas OAuth (deben ir ANTES del middleware de autenticación)
app.use(oauthRoutes);

// El endpoint /mcp sigue protegido con authenticateToken
app.post('/mcp', authenticateToken, async (req, res) => {
  // ... tu código existente
});
```

---

## �️ Fase 3: Configuración VS Code

**Duración estimada:** 30 minutos

### 4.1 Configuración en settings.json o mcp.json

```json
{
  "mcp": {
    "servers": {
      "mis-prompts-personalizados": {
        "url": "https://mcp-promps.onrender.com/mcp",
        "auth": {
          "type": "oauth",
          "clientId": "vscode-mcp-client",
          "scopes": ["mcp:read", "mcp:write"]
        }
      }
    }
  }
}
```

### 4.2 Si usas configuración manual (sin DCR)

Cuando VS Code muestre el diálogo "Dynamic Client Registration not supported":
1. Click en "Copy URIs & Proceed"
2. Ingresa el Client ID: `vscode-mcp-client`
3. VS Code usará las URIs de redirección que ya están soportadas

### 4.3 Flujo de usuario en VS Code

1. Usuario agrega el MCP server a su configuración
2. VS Code detecta que requiere autenticación
3. VS Code abre el navegador → `/authorize?client_id=vscode-mcp-client&...`
4. Usuario ve tu página de login
5. Usuario ingresa credenciales
6. Callback automático a VS Code
7. ✅ MCP Server conectado y autenticado

---

## 🧠 Fase 4: Configuración IntelliJ

**Duración estimada:** 30 minutos

### 5.1 Configuración del MCP Server en IntelliJ

IntelliJ con GitHub Copilot usa una configuración similar. En el archivo de configuración MCP:

```json
{
  "servers": {
    "mis-prompts": {
      "url": "https://mcp-promps.onrender.com/mcp",
      "authentication": {
        "type": "oauth2",
        "clientId": "intellij-mcp-client",
        "authorizationUrl": "https://mcp-promps.onrender.com/authorize",
        "tokenUrl": "https://mcp-promps.onrender.com/token"
      }
    }
  }
}
```

### 5.2 Flujo idéntico a VS Code

El flujo OAuth es el mismo, solo cambia el `client_id` y los redirect URIs permitidos.

---

## 🧪 Fase 5: Testing y Validación

**Duración estimada:** 2 horas

### 6.1 Test manual del flujo OAuth

```bash
# 1. Verificar metadata
curl https://mcp-promps.onrender.com/.well-known/oauth-authorization-server

# Debe retornar JSON con authorization_endpoint, token_endpoint, etc.

# 2. Iniciar flujo de autorización (en navegador)
# https://mcp-promps.onrender.com/authorize?
#   client_id=vscode-mcp-client&
#   redirect_uri=http://127.0.0.1:12345&
#   response_type=code&
#   state=test123&
#   code_challenge=abc&
#   code_challenge_method=S256

# 3. Intercambiar código por token
curl -X POST https://mcp-promps.onrender.com/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=EL_CODIGO_RECIBIDO" \
  -d "client_id=vscode-mcp-client" \
  -d "redirect_uri=http://127.0.0.1:12345" \
  -d "code_verifier=abc"

# 4. Usar token en MCP
curl -X POST https://mcp-promps.onrender.com/mcp \
  -H "Authorization: Bearer EL_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","id":1}'
```

### 6.2 Test en VS Code

1. Agregar servidor MCP a configuración
2. Verificar que VS Code inicia flujo OAuth
3. Completar login
4. Verificar que los prompts aparecen en Copilot

### 6.3 Test en IntelliJ

1. Agregar servidor MCP a configuración
2. Verificar flujo OAuth
3. Completar login
4. Verificar funcionalidad

---

## ✅ Checklist de Implementación

### Fase 1: MCP Server - Crear estructura OAuth
- [ ] Crear carpeta `src/oauth/`
- [ ] Crear `src/oauth/config.ts` (clientes vscode-mcp-client, intellij-mcp-client)
- [ ] Crear `src/oauth/storage.ts` (almacenamiento en memoria)
- [ ] Instalar uuid: `npm install uuid && npm install -D @types/uuid`

### Fase 2: MCP Server - Implementar endpoints OAuth
- [ ] Crear `src/oauth/routes.ts` con:
  - [ ] `GET /.well-known/oauth-authorization-server` (metadata)
  - [ ] `GET /authorize` (redirige a frontend login)
  - [ ] `POST /oauth/callback` (recibe JWT del frontend)
  - [ ] `POST /token` (intercambia code por access_token)
- [ ] Agregar validación PKCE (S256)
- [ ] Integrar rutas en `server-http.ts`

### Fase 2 (Frontend): Modificar página de login
- [ ] Detectar parámetro `oauth_request` en URL
- [ ] Guardar en sessionStorage durante login
- [ ] Después del login, llamar a `/oauth/callback` con el JWT
- [ ] Redirigir a la URL que devuelve el MCP server (de vuelta a VS Code)

### Fase 3-4: Configuración en IDEs
- [ ] Probar configuración en VS Code con client_id: `vscode-mcp-client`
- [ ] Probar configuración en IntelliJ con client_id: `intellij-mcp-client`

### Fase 5: Testing y Deploy
- [ ] Probar `GET /.well-known/oauth-authorization-server`
- [ ] Probar flujo completo manualmente
- [ ] Deploy MCP Server a Render
- [ ] Deploy Frontend a Vercel (si hay cambios)
- [ ] Probar desde VS Code real
- [ ] Probar desde IntelliJ

---

## 📁 Archivos a Crear/Modificar

### Nuevos archivos (en MCP Server)
```
src/oauth/
├── config.ts           # Configuración de clientes OAuth
├── storage.ts          # Almacenamiento en memoria (auth requests, codes, tokens)
└── routes.ts           # Endpoints OAuth (/authorize, /token, /oauth/callback)
```

### Archivos a modificar
```
# MCP Server
src/server-http.ts      # Agregar rutas OAuth
package.json            # Agregar dependencia: uuid
.env                    # Agregar FRONTEND_LOGIN_URL

# Frontend (front-mcp-gules.vercel.app)
src/pages/Login.tsx     # Detectar oauth_request y completar flujo
```

---

## 🔧 Variables de Entorno

### MCP Server (.env en Render)
```env
# Existentes (ya los tienes)
JWT_SECRET=tu-secret-actual
CORS_ORIGIN=https://front-mcp-gules.vercel.app
PORT=3000

# Nuevas para OAuth
OAUTH_ISSUER=https://mcp-promps.onrender.com
FRONTEND_LOGIN_URL=https://front-mcp-gules.vercel.app/login
```

### CORS Actualizado
Asegúrate de permitir tu frontend en CORS:
```typescript
app.use(cors({ 
  origin: ['https://front-mcp-gules.vercel.app', 'http://localhost:5173'],
  credentials: true 
}));
```

---

## 🎯 Resultado Final

Después de implementar este plan:

1. **VS Code**: Usuario configura MCP → VS Code abre navegador → Login → ✅ Conectado
2. **IntelliJ**: Usuario configura MCP → IntelliJ abre navegador → Login → ✅ Conectado
3. **Tu sistema sabe quién es el usuario** porque el token OAuth está vinculado a su cuenta
4. **Todo integrado** con tu backend de autenticación existente

---

## 📚 Referencias

- [MCP Authentication Specification](https://modelcontextprotocol.io/specification/2025-03-26/basic/authentication)
- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)
- [PKCE RFC 7636](https://tools.ietf.org/html/rfc7636)
- [Dynamic Client Registration RFC 7591](https://tools.ietf.org/html/rfc7591)
