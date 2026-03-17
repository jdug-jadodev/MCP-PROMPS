# 🔐 Plan de Trabajo: MCP Server - Implementación de Revocación de Tokens

**Fecha:** 17 de marzo de 2026  
**Equipo:** Backend MCP Server  
**Repositorio:** MCP-PROMPS  
**URL Producción:** https://mcp-promps.onrender.com

---

## 📋 Resumen Ejecutivo

### Tu Rol en el Sistema

El **MCP Server** es el servidor que:
- Provee prompts y herramientas a VSCode/GitHub Copilot
- Emite access_tokens OAuth para que VSCode se autentique
- **Actualmente NO tiene sistema de revocación de tokens** ❌

### Objetivo

Implementar un sistema completo de revocación de tokens que permita:
- Revocar access_tokens cuando el frontend notifique logout
- Invalidar inmediatamente el acceso de VSCode al MCP
- Mantener compliance con RFC 7009 (OAuth Token Revocation)

### Dependencias

| Dependencia | Estado | Notas |
|-------------|--------|-------|
| Frontend | 🔶 Espera tu implementación | Llamará a `/oauth/revoke` |
| Backend Login | ✅ No hay dependencia directa | Sistema independiente |

---

## ⏱️ Cronograma

| Fase | Duración | Prioridad |
|------|----------|-----------|
| FASE 1: Storage + Blacklist | 1.5 horas | 🔴 CRÍTICA |
| FASE 2: Endpoint /oauth/revoke | 1.5 horas | 🔴 CRÍTICA |
| FASE 3: Middleware + Cleanup | 1 hora | 🔴 CRÍTICA |
| FASE 4: Testing | 1 hora | 🟠 ALTA |
| **TOTAL** | **5 horas** | |

---

## FASE 1: Extender OAuth Storage con Blacklist

**Duración:** 1.5 horas  
**Archivo:** `src/oauth/storage.ts`

### 1.1. Añadir Interface RevokedToken

**Ubicación:** Al inicio del archivo, después de las interfaces existentes

```typescript
/**
 * Token revocado (blacklist)
 * 
 * NOTA: Los access_tokens de MCP no tienen jti como el backend de login,
 * por lo que almacenamos el hash SHA-256 del token completo.
 */
export interface RevokedToken {
  tokenHash: string;           // SHA-256 del token completo
  userId: string;
  email: string;
  clientId: string;
  tokenType: 'access_token' | 'refresh_token';
  revokedAt: number;           // Timestamp de revocación
  expiresAt: number;           // Cuando limpiar de blacklist
  reason?: string;             // Motivo: "user_logout", "admin_revocation"
}
```

### 1.2. Añadir Map de Tokens Revocados

**Ubicación:** Dentro de la clase `OAuthStorage`, junto a los otros Maps

```typescript
class OAuthStorage {
  private authRequests: Map<string, AuthRequest> = new Map();
  private authorizationCodes: Map<string, AuthorizationCode> = new Map();
  private refreshTokens: Map<string, RefreshTokenData> = new Map();
  private dynamicClients: Map<string, any> = new Map();
  
  // ===== NUEVO: Blacklist de tokens revocados =====
  private revokedTokens: Map<string, RevokedToken> = new Map();
```

### 1.3. Implementar Métodos de Revocación

**Ubicación:** Al final de la clase `OAuthStorage`, antes del cierre `}`

```typescript
// ===== REVOKED TOKENS =====

/**
 * Hashear token con SHA-256
 * No almacenamos el token completo por seguridad
 */
private hashToken(token: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Revocar un token (añadirlo a la blacklist)
 */
revokeToken(
  token: string, 
  userId: string, 
  email: string, 
  clientId: string, 
  tokenType: 'access_token' | 'refresh_token', 
  expiresAt: number, 
  reason?: string
): void {
  const tokenHash = this.hashToken(token);
  
  const revokedData: RevokedToken = {
    tokenHash,
    userId,
    email,
    clientId,
    tokenType,
    revokedAt: Date.now(),
    expiresAt,
    reason: reason || 'user_revocation'
  };
  
  this.revokedTokens.set(tokenHash, revokedData);
  
  console.log(`🚫 OAuth: Token revocado (${tokenType})`);
  console.log(`  👤 Usuario: ${email} (${userId})`);
  console.log(`  🖥️  Cliente: ${clientId}`);
  console.log(`  📋 Motivo: ${revokedData.reason}`);
  console.log(`  ⏰ Expira: ${new Date(expiresAt).toISOString()}`);
  
  // Si es refresh_token, también eliminarlo del storage activo
  if (tokenType === 'refresh_token') {
    this.deleteRefreshToken(token);
  }
}

/**
 * Verificar si un token está revocado
 */
isTokenRevoked(token: string): boolean {
  const tokenHash = this.hashToken(token);
  const revoked = this.revokedTokens.get(tokenHash);
  
  if (!revoked) {
    return false;
  }
  
  // Si el token ya expiró naturalmente, limpiarlo de la blacklist
  if (Date.now() > revoked.expiresAt) {
    this.revokedTokens.delete(tokenHash);
    console.log(`🧹 OAuth: Token revocado limpiado (expiró naturalmente)`);
    return false;
  }
  
  return true;
}

/**
 * Revocar todos los tokens de un usuario
 */
revokeAllUserTokens(userId: string, reason?: string): number {
  let count = 0;
  
  this.refreshTokens.forEach((data, token) => {
    if (data.userId === userId) {
      this.revokeToken(
        token, 
        data.userId, 
        data.email, 
        data.clientId, 
        'refresh_token', 
        data.expiresAt, 
        reason || 'revoke_all_sessions'
      );
      count++;
    }
  });
  
  console.log(`🚫 OAuth: Revocados ${count} tokens para usuario ${userId}`);
  return count;
}

/**
 * Limpiar tokens revocados que ya expiraron
 */
cleanExpiredRevokedTokens(): number {
  const now = Date.now();
  let count = 0;
  
  this.revokedTokens.forEach((data, hash) => {
    if (now > data.expiresAt) {
      this.revokedTokens.delete(hash);
      count++;
    }
  });
  
  if (count > 0) {
    console.log(`🧹 OAuth: Limpiados ${count} tokens expirados de blacklist`);
  }
  
  return count;
}

/**
 * Iniciar limpieza periódica de tokens expirados
 */
startCleanupTask(): void {
  setInterval(() => {
    console.log('🧹 OAuth: Ejecutando limpieza automática...');
    this.cleanExpiredRevokedTokens();
  }, 60 * 60 * 1000); // Cada 1 hora
  
  console.log('✅ OAuth: Tarea de limpieza programada (cada 1 hora)');
}
```

### ✅ Checklist FASE 1

- [ ] Interfaz `RevokedToken` añadida
- [ ] Map `revokedTokens` añadido a la clase
- [ ] Método `hashToken()` implementado
- [ ] Método `revokeToken()` implementado
- [ ] Método `isTokenRevoked()` implementado
- [ ] Método `revokeAllUserTokens()` implementado
- [ ] Método `cleanExpiredRevokedTokens()` implementado
- [ ] Método `startCleanupTask()` implementado
- [ ] Compilación sin errores (`npm run build`)

---

## FASE 2: Crear Endpoint POST /oauth/revoke

**Duración:** 1.5 horas  
**Archivo:** `src/oauth/routes.ts`

### 2.1. Añadir Endpoint de Revocación

**Ubicación:** Al final del archivo, ANTES de `export default router`

```typescript
/**
 * POST /oauth/revoke
 * 
 * Endpoint de revocación de tokens según RFC 7009
 * 
 * IMPORTANTE: Este endpoint DEBE responder siempre 200 OK según RFC 7009,
 * incluso si el token no existe o ya estaba revocado.
 * 
 * Request:
 *   Content-Type: application/x-www-form-urlencoded
 *   Authorization: Bearer <access_token_del_usuario>
 *   
 *   Body:
 *     token=<token_a_revocar>
 *     token_type_hint=access_token|refresh_token (opcional)
 * 
 * Response:
 *   200 OK { "status": "ok", "message": "Token revoked successfully" }
 */
router.post('/oauth/revoke', 
  express.urlencoded({ extended: true }), 
  express.json(), 
  async (req: Request, res: Response) => {
    const { token, token_type_hint } = req.body;
    const authHeader = req.headers.authorization;
    
    console.log(`🔐 OAuth /revoke: ===== SOLICITUD DE REVOCACIÓN =====`);
    console.log(`  📋 token_type_hint: ${token_type_hint || 'no especificado'}`);
    console.log(`  📋 IP: ${req.ip}`);
    
    // 1. Validar que existe token a revocar
    if (!token || token.trim().length === 0) {
      console.log(`⚠️ OAuth /revoke: Token vacío, respondiendo OK`);
      return res.status(200).json({ status: 'ok', message: 'Token processed' });
    }
    
    // 2. Validar autenticación
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error(`❌ OAuth /revoke: No autenticado`);
      return res.status(401).json({ 
        error: 'invalid_client', 
        message: 'Se requiere autenticación para revocar tokens'
      });
    }
    
    const userAccessToken = authHeader.split(' ')[1];
    
    try {
      // 3. Verificar el access_token del usuario
      const decoded = jwt.verify(userAccessToken, process.env.JWT_SECRET!) as any;
      const userId = decoded.userId;
      const email = decoded.email;
      
      console.log(`✅ OAuth /revoke: Usuario autenticado: ${email}`);
      
      // 4. Decodificar el token a revocar (sin verificar firma)
      let tokenData: any;
      try {
        tokenData = jwt.decode(token) as any;
      } catch (e) {
        console.warn(`⚠️ OAuth /revoke: Token no decodificable`);
        return res.status(200).json({ status: 'ok', message: 'Token processed' });
      }
      
      if (!tokenData || !tokenData.userId) {
        console.warn(`⚠️ OAuth /revoke: Token sin userId`);
        return res.status(200).json({ status: 'ok', message: 'Token processed' });
      }
      
      // 5. Verificar ownership del token
      if (tokenData.userId !== userId) {
        console.error(`❌ OAuth /revoke: ${userId} intentó revocar token de ${tokenData.userId}`);
        // RFC 7009: responder OK para no revelar información
        return res.status(200).json({ status: 'ok', message: 'Token processed' });
      }
      
      // 6. Determinar tipo y expiración
      const tokenType = token_type_hint || tokenData.type || 'access_token';
      const clientId = tokenData.clientId || 'unknown';
      const expiresAt = tokenData.exp 
        ? tokenData.exp * 1000 
        : Date.now() + 7 * 24 * 60 * 60 * 1000;
      
      // 7. 🔑 REVOCAR EL TOKEN
      oauthStorage.revokeToken(
        token,
        userId,
        email,
        clientId,
        tokenType === 'refresh_token' ? 'refresh_token' : 'access_token',
        expiresAt,
        'user_revocation'
      );
      
      console.log(`✅ OAuth /revoke: Token revocado exitosamente`);
      
      // 8. RFC 7009: SIEMPRE responder 200 OK
      res.status(200).json({ 
        status: 'ok',
        message: 'Token revoked successfully'
      });
      
    } catch (error: any) {
      console.error(`❌ OAuth /revoke: Error:`, error.message);
      
      if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          error: 'invalid_client',
          message: 'Token de autenticación inválido o expirado'
        });
      }
      
      return res.status(500).json({ 
        error: 'server_error',
        message: 'Error interno del servidor'
      });
    }
});

console.log('✅ OAuth: Ruta /oauth/revoke (RFC 7009) registrada');
```

### ✅ Checklist FASE 2

- [ ] Endpoint POST `/oauth/revoke` creado
- [ ] Validación de autenticación (Authorization header)
- [ ] Verificación de ownership del token
- [ ] Llamada a `oauthStorage.revokeToken()`
- [ ] Respuesta 200 OK siempre (RFC 7009)
- [ ] Logging de auditoría
- [ ] Compilación sin errores (`npm run build`)

---

## FASE 3: Actualizar Middleware y Cleanup

**Duración:** 1 hora

### 3.1. Actualizar Middleware de Autenticación

**Archivo:** `src/middleware/auth.middleware.ts`

#### Paso 3.1.1: Añadir Import

**Ubicación:** Al inicio del archivo

```typescript
import { oauthStorage } from '../oauth/storage';
```

#### Paso 3.1.2: Añadir Validación de Blacklist

**Ubicación:** Dentro de la función `authenticateToken`, DESPUÉS de obtener el token y ANTES de `jwt.verify`

Buscar esta línea:
```typescript
const token = parts[1];
```

Y DESPUÉS de esa línea, AÑADIR:

```typescript
// ===== Verificar si el token está revocado =====
if (oauthStorage.isTokenRevoked(token)) {
  console.log(`⚠️  Auth Middleware: Token revocado detectado`);
  const baseUrl = process.env.OAUTH_ISSUER || 'https://mcp-promps.onrender.com';
  res.setHeader(
    'WWW-Authenticate',
    `Bearer resource_metadata="${baseUrl}/.well-known/oauth-protected-resource", error="invalid_token", error_description="Token has been revoked"`
  );
  res.status(401).json({ 
    jsonrpc: '2.0',
    id: req.body?.id || null,
    error: {
      code: -32001,
      message: 'Token has been revoked. Please authenticate again.'
    }
  });
  return;
}
// ===== FIN validación de blacklist =====
```

### 3.2. Iniciar Cleanup Task

**Archivo:** `src/server-http.ts`

#### Paso 3.2.1: Añadir Import

**Ubicación:** Al inicio del archivo, con los otros imports

```typescript
import { oauthStorage } from './oauth/storage';
```

#### Paso 3.2.2: Iniciar Tarea de Limpieza

**Ubicación:** Al final del archivo, ANTES de `app.listen()`

```typescript
// ===== Iniciar tarea de limpieza de tokens revocados =====
oauthStorage.startCleanupTask();
console.log('🧹 OAuth: Tarea de limpieza de tokens iniciada (cada 1 hora)');
```

### ✅ Checklist FASE 3

- [ ] Import de `oauthStorage` en auth.middleware.ts
- [ ] Validación de blacklist añadida al middleware
- [ ] Respuesta 401 con WWW-Authenticate para tokens revocados
- [ ] Import de `oauthStorage` en server-http.ts
- [ ] Llamada a `startCleanupTask()` al iniciar servidor
- [ ] Compilación sin errores (`npm run build`)

---

## FASE 4: Testing

**Duración:** 1 hora

### 4.1. Test Manual con cURL

#### Test 1: Verificar que el endpoint responde

```powershell
# Debe responder 401 (token inválido)
curl -X POST https://mcp-promps.onrender.com/oauth/revoke `
  -H "Content-Type: application/x-www-form-urlencoded" `
  -H "Authorization: Bearer token-invalido" `
  -d "token=otro-token"
```

#### Test 2: Flujo completo con token real

1. Obtener un access_token válido mediante OAuth
2. Verificar que funciona:
```powershell
curl -X POST https://mcp-promps.onrender.com/mcp `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer TU_ACCESS_TOKEN" `
  -d '{"jsonrpc":"2.0","id":1,"method":"prompts/list"}'
```

3. Revocar el token:
```powershell
curl -X POST https://mcp-promps.onrender.com/oauth/revoke `
  -H "Content-Type: application/x-www-form-urlencoded" `
  -H "Authorization: Bearer TU_ACCESS_TOKEN" `
  -d "token=TU_ACCESS_TOKEN&token_type_hint=access_token"
```

4. Verificar que el token ya NO funciona:
```powershell
curl -X POST https://mcp-promps.onrender.com/mcp `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer TU_ACCESS_TOKEN" `
  -d '{"jsonrpc":"2.0","id":1,"method":"prompts/list"}'
# Debe responder: 401 Unauthorized
```

### 4.2. Script de Test Automatizado

**Archivo:** `test-mcp-revocation.js` (crear en raíz del proyecto)

```javascript
const fetch = require('node-fetch');

const BASE_URL = 'https://mcp-promps.onrender.com';

async function testMCPRevocation() {
  const ACCESS_TOKEN = process.env.MCP_ACCESS_TOKEN;
  
  if (!ACCESS_TOKEN) {
    console.error('❌ Configura MCP_ACCESS_TOKEN');
    console.error('   $env:MCP_ACCESS_TOKEN="tu-token"');
    process.exit(1);
  }
  
  console.log('🧪 Test 1: Verificar que token funciona ANTES de revocar');
  const test1 = await fetch(`${BASE_URL}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ACCESS_TOKEN}`
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'prompts/list' })
  });
  
  if (test1.status !== 200) {
    console.error(`❌ Token no funciona: ${test1.status}`);
    process.exit(1);
  }
  console.log('✅ Test 1 PASÓ\n');
  
  console.log('🧪 Test 2: Revocar el token');
  const test2 = await fetch(`${BASE_URL}/oauth/revoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Bearer ${ACCESS_TOKEN}`
    },
    body: `token=${encodeURIComponent(ACCESS_TOKEN)}&token_type_hint=access_token`
  });
  
  if (test2.status !== 200) {
    console.error(`❌ Revocación falló: ${test2.status}`);
    process.exit(1);
  }
  console.log('✅ Test 2 PASÓ\n');
  
  console.log('🧪 Test 3: Verificar que token NO funciona DESPUÉS de revocar');
  const test3 = await fetch(`${BASE_URL}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ACCESS_TOKEN}`
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'prompts/list' })
  });
  
  if (test3.status !== 401) {
    console.error(`❌ Token debería ser rechazado: ${test3.status}`);
    process.exit(1);
  }
  console.log('✅ Test 3 PASÓ\n');
  
  console.log('✅✅✅ TODOS LOS TESTS PASARON ✅✅✅');
}

testMCPRevocation().catch(console.error);
```

**Ejecutar:**

```powershell
npm install node-fetch@2
$env:MCP_ACCESS_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
node test-mcp-revocation.js
```

### ✅ Checklist FASE 4

- [ ] Test manual con cURL exitoso
- [ ] Token funciona antes de revocar
- [ ] Token NO funciona después de revocar
- [ ] Script de test automatizado creado
- [ ] Tests automatizados pasados

---

## 📡 Coordinación con Frontend

### Lo que el Frontend NECESITA de ti:

1. **Endpoint `/oauth/revoke` disponible** ✅
2. **Respuesta 200 OK** cuando revoque tokens
3. **El token debe ser invalidado inmediatamente**

### Request que recibirás del Frontend:

```http
POST /oauth/revoke
Content-Type: application/x-www-form-urlencoded
Authorization: Bearer <access_token_del_usuario>

token=<token_a_revocar>&token_type_hint=access_token
```

### Respuesta que esperan:

```json
{
  "status": "ok",
  "message": "Token revoked successfully"
}
```

### Comportamiento Esperado:

Cuando VSCode intente usar un token revocado:
1. Tu middleware detecta que está en blacklist
2. Respondes 401 con WWW-Authenticate
3. VSCode detecta el 401 y pide re-autenticación

---

## 📊 Resumen de Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/oauth/storage.ts` | + Interface RevokedToken, + Map, + 5 métodos |
| `src/oauth/routes.ts` | + Endpoint POST /oauth/revoke |
| `src/middleware/auth.middleware.ts` | + Import, + validación blacklist |
| `src/server-http.ts` | + Import, + startCleanupTask() |
| `test-mcp-revocation.js` | NUEVO archivo de test |

---

## ✅ Checklist Final

### FASE 1: Storage
- [ ] Interface `RevokedToken`
- [ ] Map `revokedTokens`
- [ ] `hashToken()`
- [ ] `revokeToken()`
- [ ] `isTokenRevoked()`
- [ ] `revokeAllUserTokens()`
- [ ] `cleanExpiredRevokedTokens()`
- [ ] `startCleanupTask()`

### FASE 2: Endpoint
- [ ] POST `/oauth/revoke` creado
- [ ] Validación de auth
- [ ] Ownership check
- [ ] RFC 7009 compliance

### FASE 3: Middleware + Cleanup
- [ ] Import en auth.middleware.ts
- [ ] Validación de blacklist
- [ ] Import en server-http.ts
- [ ] Cleanup task iniciada

### FASE 4: Testing
- [ ] Tests manuales exitosos
- [ ] Script automatizado creado
- [ ] Todos los tests pasan

### Despliegue
- [ ] Código commiteado
- [ ] Deploy a producción
- [ ] Verificar logs en Render
- [ ] Notificar a equipo Frontend que está listo

---

## 🚨 Notas Importantes

### 1. Seguridad: Hash de Tokens

**NUNCA** almacenar el token completo. Usar SHA-256:

```typescript
crypto.createHash('sha256').update(token).digest('hex');
```

### 2. RFC 7009 Compliance

**SIEMPRE** responder 200 OK en `/oauth/revoke`, incluso si:
- El token no existe
- El token ya estaba revocado
- El usuario no es dueño del token

Esto evita information leakage.

### 3. Almacenamiento en Memoria

⚠️ **Limitación actual**: La blacklist se pierde al reiniciar el servidor.

**Para producción** considerar migrar a Redis (ver FASE 5 del plan general).

### 4. Tiempo de Vida del Token

El access_token expira en 1 hora (`accessTokenLifetime: 3600`).

Los tokens en la blacklist se auto-limpian cuando expiran naturalmente.

---

**Tiempo Total Estimado:** 5 horas  
**Prioridad:** 🔴 CRÍTICA  
**Fecha Límite Sugerida:** [Coordinar con equipo]

---

*Plan de trabajo generado el 17 de marzo de 2026*
