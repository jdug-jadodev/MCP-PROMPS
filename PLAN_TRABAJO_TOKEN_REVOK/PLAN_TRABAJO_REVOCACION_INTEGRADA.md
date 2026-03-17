# 🔐 Plan de Trabajo: Revocación Integrada de Tokens (Frontend → Backend Login + MCP Server)

**Fecha:** 17 de marzo de 2026  
**Versión:** 1.0  
**Objetivo:** Implementar sistema completo de revocación de tokens que coordine el logout entre Frontend, Backend de Login y MCP Server, invalidando también el acceso de VSCode

---

## 📋 Tabla de Contenidos

1. [Visión General del Sistema](#1-visión-general-del-sistema)
2. [Análisis de Situación Actual](#2-análisis-de-situación-actual)
3. [Arquitectura de la Solución](#3-arquitectura-de-la-solución)
4. [FASE 1: Implementar Revocación en MCP Server](#fase-1-implementar-revocación-en-mcp-server)
5. [FASE 2: Actualizar Frontend para Revocación Dual](#fase-2-actualizar-frontend-para-revocación-dual)
6. [FASE 3: Coordinar Revocación con Backend de Login](#fase-3-coordinar-revocación-con-backend-de-login)
7. [FASE 4: Testing End-to-End](#fase-4-testing-end-to-end)
8. [FASE 5: Optimizaciones y Mejoras](#fase-5-optimizaciones-y-mejoras)
9. [Checklist General](#checklist-general)
10. [Consideraciones Importantes](#consideraciones-importantes)

---

## 1. Visión General del Sistema

### 1.1. Ecosistema de Tokens

Actualmente existen **DOS sistemas de autenticación separados**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    SISTEMA DE AUTENTICACIÓN                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  BACKEND DE LOGIN (Loggin-MCP)                           │  │
│  │  https://loggin-mcp.onrender.com                         │  │
│  │                                                           │  │
│  │  • Genera JWT con jti único                              │  │
│  │  • Tabla: revoked_tokens (PostgreSQL)                    │  │
│  │  • Endpoint: POST /auth/logout                           │  │
│  │  • Middleware valida revocación                          │  │
│  │  • Token lifetime: 15h                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓ ↑                                  │
│                     JWT del usuario                             │
│                            ↓ ↑                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  FRONTEND REACT                                          │  │
│  │  https://front-mcp-gules.vercel.app                      │  │
│  │                                                           │  │
│  │  • Almacena JWT del backend de login                     │  │
│  │  • Almacena access_token de MCP (OAuth)                  │  │
│  │  • Gestiona logout del usuario                           │  │
│  │  • Debe revocar AMBOS tokens al cerrar sesión            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓ ↑                                  │
│                  OAuth access_token                             │
│                            ↓ ↑                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  MCP SERVER                                              │  │
│  │  https://mcp-promps.onrender.com                         │  │
│  │                                                           │  │
│  │  • Genera access_token OAuth (JWT)                       │  │
│  │  • ❌ NO TIENE sistema de revocación                     │  │
│  │  • ❌ Tokens válidos hasta expiración (1h)               │  │
│  │  • ✅ NECESITA implementar blacklist                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓ ↑                                  │
│                     MCP Protocol                                │
│                            ↓ ↑                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  VSCODE / GITHUB COPILOT                                 │  │
│  │                                                           │  │
│  │  • Usa access_token para llamar MCP                      │  │
│  │  • Mantiene token hasta que expire                       │  │
│  │  • Debe ser invalidado al hacer logout                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2. Problema Identificado

Cuando el usuario hace logout en el frontend:

1. ✅ **Backend de Login**: YA tiene implementado revocación de JWT
2. ❌ **MCP Server**: NO revoca el access_token → VSCode mantiene acceso
3. ❌ **Frontend**: NO coordina revocación en ambos sistemas

**Resultado**: Logout incompleto e inseguro.

---

## 2. Análisis de Situación Actual

### 2.1. Backend de Login (Loggin-MCP) ✅

**Estado**: ✅ **IMPLEMENTADO Y FUNCIONAL**

| Componente | Estado | Descripción |
|------------|--------|-------------|
| Tabla `revoked_tokens` | ✅ | PostgreSQL con jti, expires_at, created_at |
| Endpoint `/auth/logout` | ✅ | Recibe JWT, extrae jti, guarda en BD |
| Middleware de auth | ✅ | Valida que jti NO esté en revoked_tokens |
| Limpieza automática | ✅ | Función SQL `clean_revoked_tokens()` |

**Características JWT del Backend de Login:**
```json
{
  "userId": "uuid",
  "email": "usuario@example.com",
  "jti": "a1b2c3d4-...",
  "iat": 1710691200,
  "exp": 1710745200
}
```

### 2.2. MCP Server ❌

**Estado**: ❌ **NO IMPLEMENTADO**

| Componente | Estado | Necesidad |
|------------|--------|-----------|
| Blacklist de tokens | ❌ | Implementar en memoria o BD |
| Endpoint `/oauth/revoke` | ❌ | Crear según RFC 7009 |
| Validación en middleware | ❌ | Verificar blacklist |
| Limpieza de expirados | ❌ | Tarea periódica |

**Características access_token de MCP (OAuth):**
```json
{
  "userId": "uuid",
  "email": "usuario@example.com",
  "clientId": "vscode-mcp-client",
  "type": "access_token",
  "iat": 1710691200,
  "exp": 1710694800
}
```

**⚠️ Diferencias clave:**
- Backend de Login usa `jti` (JWT ID único)
- MCP Server NO usa `jti` en sus access_tokens
- **Solución**: Usar el token completo o su hash SHA-256 para blacklist

### 2.3. Frontend React 🔶

**Estado**: 🔶 **PARCIALMENTE IMPLEMENTADO**

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| Logout del backend de login | ✅ | Llama a `/auth/logout` |
| Logout del MCP Server | ❌ | No revoca access_token OAuth |
| Coordinación de ambos | ❌ | No ejecuta revocación dual |
| Notificación a VSCode | ❌ | Indirecta (vía revocación) |

---

## 3. Arquitectura de la Solución

### 3.1. Flujo Completo de Logout

```
┌────────────────────────────────────────────────────────────────────┐
│                    SECUENCIA DE LOGOUT INTEGRADO                   │
└────────────────────────────────────────────────────────────────────┘

Usuario hace clic en "Cerrar Sesión"
            │
            ▼
┌───────────────────────────────────┐
│   FRONTEND REACT                  │
│                                   │
│   1. Confirmar logout             │
│   2. Obtener tokens:              │
│      - JWT (Backend Login)        │
│      - access_token (MCP OAuth)   │
└───────────┬───────────────────────┘
            │
            ├──────────────────────────────────┐
            │                                  │
            ▼                                  ▼
┌───────────────────────────┐   ┌──────────────────────────────┐
│  BACKEND DE LOGIN         │   │  MCP SERVER                  │
│                           │   │                              │
│  POST /auth/logout        │   │  POST /oauth/revoke          │
│  Authorization: Bearer    │   │  Authorization: Bearer       │
│      <JWT>                │   │      <access_token>          │
│                           │   │                              │
│  ↓                        │   │  ↓                           │
│  Extraer jti del JWT      │   │  Hashear access_token        │
│  ↓                        │   │  ↓                           │
│  INSERT INTO              │   │  INSERT INTO                 │
│  revoked_tokens           │   │  revoked_tokens              │
│  (jti, expires_at)        │   │  (token_hash, expires_at)    │
│                           │   │                              │
│  ↓                        │   │  ↓                           │
│  200 OK                   │   │  200 OK                      │
│  { status: "success" }    │   │  { status: "ok" }            │
└───────────┬───────────────┘   └──────────────┬───────────────┘
            │                                  │
            └──────────────┬───────────────────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │  FRONTEND REACT              │
            │                              │
            │  3. Ambas revocaciones OK    │
            │  4. Limpiar localStorage:    │
            │     - token                  │
            │     - access_token           │
            │     - refresh_token          │
            │     - user                   │
            │  5. Redirigir a /login       │
            └──────────────┬───────────────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │  VSCODE                      │
            │                              │
            │  Próximo intento de usar MCP │
            │  ↓                           │
            │  POST /mcp                   │
            │  Authorization: Bearer       │
            │      <access_token_revocado> │
            │  ↓                           │
            │  ❌ 401 Unauthorized         │
            │  "Token has been revoked"    │
            │  ↓                           │
            │  VSCode detecta WWW-Auth     │
            │  Inicia nuevo flujo OAuth    │
            └──────────────────────────────┘
```

### 3.2. Componentes a Implementar/Modificar

```
┌─────────────────────────────────────────────────────────────────┐
│                         COMPONENTES                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  MCP SERVER                                                      │
│  ├─ src/oauth/storage.ts           [MODIFICAR]                  │
│  │  └─ Añadir blacklist de tokens revocados                     │
│  │                                                               │
│  ├─ src/oauth/routes.ts            [MODIFICAR]                  │
│  │  └─ Crear endpoint POST /oauth/revoke                        │
│  │                                                               │
│  ├─ src/middleware/auth.middleware.ts  [MODIFICAR]              │
│  │  └─ Verificar blacklist antes de aceptar token               │
│  │                                                               │
│  └─ src/server-http.ts             [MODIFICAR]                  │
│     └─ Iniciar tarea de limpieza                                │
│                                                                  │
│  FRONTEND REACT                                                  │
│  ├─ src/services/authService.ts    [MODIFICAR]                  │
│  │  └─ Añadir revokeMCPToken()                                  │
│  │                                                               │
│  ├─ src/pages/Dashboard.tsx (o donde esté logout) [MODIFICAR]   │
│  │  └─ Ejecutar doble revocación                                │
│  │                                                               │
│  └─ src/hooks/useAuth.ts           [MODIFICAR]                  │
│     └─ Función logout actualizada                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## FASE 1: Implementar Revocación en MCP Server

**Duración estimada**: 3-4 horas  
**Prioridad**: 🔴 CRÍTICA  
**Dependencias**: Ninguna

### 1.1. Extender OAuthStorage con Blacklist

**Archivo**: `src/oauth/storage.ts`

#### Paso 1.1.1: Añadir interfaz RevokedToken

**Ubicación**: Al inicio del archivo, después de las interfaces existentes

```typescript
/**
 * Token revocado (blacklist)
 * 
 * NOTA: A diferencia del backend de login que usa jti,
 * los access_tokens de MCP no tienen jti, por lo que
 * almacenamos el hash SHA-256 del token completo.
 */
export interface RevokedToken {
  tokenHash: string;           // SHA-256 del token completo
  userId: string;
  email: string;
  clientId: string;
  tokenType: 'access_token' | 'refresh_token';
  revokedAt: number;           // Timestamp de revocación
  expiresAt: number;           // Cuando limpiar de blacklist
  reason?: string;             // Motivo: "user_logout", "admin_revocation", etc.
}
```

**Explicación**:
- `tokenHash`: SHA-256 del token (no almacenar token completo por seguridad)
- `expiresAt`: Fecha de expiración natural del token (para limpieza automática)
- `reason`: Ayuda para auditoría y debugging

#### Paso 1.1.2: Añadir Map de tokens revocados

**Ubicación**: Dentro de la clase `OAuthStorage`

```typescript
class OAuthStorage {
  private authRequests: Map<string, AuthRequest> = new Map();
  private authorizationCodes: Map<string, AuthorizationCode> = new Map();
  private refreshTokens: Map<string, RefreshTokenData> = new Map();
  private dynamicClients: Map<string, any> = new Map();
  
  // ===== NUEVO: Blacklist de tokens revocados =====
  private revokedTokens: Map<string, RevokedToken> = new Map();
  
  // ... métodos existentes ...
}
```

#### Paso 1.1.3: Implementar métodos de revocación

**Ubicación**: Al final de la clase `OAuthStorage`, antes del cierre

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
 * 
 * @param token - El token completo (será hasheado)
 * @param userId - ID del usuario dueño del token
 * @param email - Email del usuario
 * @param clientId - ID del cliente OAuth (ej: "vscode-mcp-client")
 * @param tokenType - Tipo de token ("access_token" o "refresh_token")
 * @param expiresAt - Timestamp de expiración natural del token
 * @param reason - Motivo de revocación (opcional)
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
 * 
 * @param token - El token completo a verificar
 * @returns true si el token está revocado, false en caso contrario
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
 * Útil para "cerrar sesión en todos los dispositivos"
 * 
 * @param userId - ID del usuario
 * @param reason - Motivo de revocación masiva
 * @returns Cantidad de tokens revocados
 */
revokeAllUserTokens(userId: string, reason?: string): number {
  let count = 0;
  
  // Revocar todos los refresh tokens del usuario
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
 * Revocar todos los tokens de un cliente específico
 * Útil para revocar solo VSCode pero no IntelliJ, por ejemplo
 * 
 * @param userId - ID del usuario
 * @param clientId - ID del cliente (ej: "vscode-mcp-client")
 * @param reason - Motivo de revocación
 * @returns Cantidad de tokens revocados
 */
revokeClientTokens(userId: string, clientId: string, reason?: string): number {
  let count = 0;
  
  this.refreshTokens.forEach((data, token) => {
    if (data.userId === userId && data.clientId === clientId) {
      this.revokeToken(
        token, 
        data.userId, 
        data.email, 
        data.clientId, 
        'refresh_token', 
        data.expiresAt, 
        reason || 'revoke_client_session'
      );
      count++;
    }
  });
  
  console.log(`🚫 OAuth: Revocados ${count} tokens del cliente ${clientId}`);
  return count;
}

/**
 * Limpiar tokens revocados que ya expiraron
 * Esta función debe ejecutarse periódicamente (ej: cada hora)
 * 
 * @returns Cantidad de tokens limpiados
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
 * Obtener estadísticas de revocación
 * Útil para monitoring y debugging
 */
getRevocationStats(): { 
  total: number; 
  byType: Record<string, number>; 
  byUser: Record<string, number>;
  byClient: Record<string, number>;
} {
  const stats = {
    total: this.revokedTokens.size,
    byType: {} as Record<string, number>,
    byUser: {} as Record<string, number>,
    byClient: {} as Record<string, number>
  };
  
  this.revokedTokens.forEach(data => {
    // Por tipo
    stats.byType[data.tokenType] = (stats.byType[data.tokenType] || 0) + 1;
    
    // Por usuario
    stats.byUser[data.userId] = (stats.byUser[data.userId] || 0) + 1;
    
    // Por cliente
    stats.byClient[data.clientId] = (stats.byClient[data.clientId] || 0) + 1;
  });
  
  return stats;
}

/**
 * Iniciar limpieza periódica de tokens expirados
 * Ejecutar cada hora
 */
startCleanupTask(): void {
  setInterval(() => {
    console.log('🧹 OAuth: Ejecutando limpieza automática de tokens expirados...');
    this.cleanExpiredRevokedTokens();
  }, 60 * 60 * 1000); // Cada 1 hora
  
  console.log('✅ OAuth: Tarea de limpieza programada (cada 1 hora)');
}
```

**📝 Notas importantes**:
1. **Hashing**: Usamos SHA-256 en lugar de almacenar el token completo
2. **Auto-limpieza**: Los tokens expirados se eliminan automáticamente
3. **Auditoría**: Todos los métodos loguean las operaciones

### 1.2. Crear Endpoint POST /oauth/revoke

**Archivo**: `src/oauth/routes.ts`

#### Paso 1.2.1: Añadir endpoint de revocación

**Ubicación**: Al final del archivo, antes de `export default router`

```typescript
/**
 * POST /oauth/revoke
 * 
 * Endpoint de revocación de tokens según RFC 7009
 * Permite a un usuario o aplicación revocar un access_token o refresh_token
 * 
 * IMPORTANTE: Este endpoint DEBE responder siempre 200 OK según RFC 7009,
 * incluso si el token no existe o ya estaba revocado, para evitar 
 * information leakage.
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
    console.log(`  📋 User-Agent: ${req.headers['user-agent']}`);
    
    // 1. Validar que existe token a revocar
    if (!token || token.trim().length === 0) {
      console.error(`❌ OAuth /revoke: Token no proporcionado`);
      // RFC 7009: DEBE responder 200 OK siempre
      return res.status(200).json({ 
        status: 'ok',
        message: 'Token processed' 
      });
    }
    
    // 2. Validar autenticación del usuario que está revocando
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error(`❌ OAuth /revoke: No autenticado`);
      return res.status(401).json({ 
        error: 'invalid_client', 
        message: 'Se requiere autenticación para revocar tokens'
      });
    }
    
    const userAccessToken = authHeader.split(' ')[1];
    
    try {
      // 3. Verificar el access_token del usuario que hace la solicitud
      const decoded = jwt.verify(userAccessToken, process.env.JWT_SECRET!) as any;
      const userId = decoded.userId;
      const email = decoded.email;
      
      console.log(`✅ OAuth /revoke: Usuario autenticado: ${email}`);
      
      // 4. Intentar decodificar el token a revocar (sin verificar firma)
      //    El token puede estar ya expirado, pero igual queremos revocarlo
      let tokenData: any;
      try {
        tokenData = jwt.decode(token) as any;
      } catch (e) {
        console.warn(`⚠️ OAuth /revoke: Token no decodificable`);
        // RFC 7009: responder OK aunque el token sea inválido
        return res.status(200).json({ 
          status: 'ok', 
          message: 'Token processed' 
        });
      }
      
      if (!tokenData || !tokenData.userId) {
        console.warn(`⚠️ OAuth /revoke: Token sin userId en payload`);
        return res.status(200).json({ 
          status: 'ok', 
          message: 'Token processed' 
        });
      }
      
      // 5. Verificar que el usuario que revoca es el dueño del token
      if (tokenData.userId !== userId) {
        console.error(`❌ OAuth /revoke: Usuario ${userId} intentó revocar token de ${tokenData.userId}`);
        // RFC 7009: responder OK para no revelar información
        return res.status(200).json({ 
          status: 'ok', 
          message: 'Token processed' 
        });
      }
      
      // 6. Determinar tipo de token
      const tokenType = token_type_hint || tokenData.type || 'access_token';
      const clientId = tokenData.clientId || 'unknown';
      
      // 7. Calcular expiresAt del token
      //    Si el token tiene exp, usarlo; si no, asumir 7 días
      const expiresAt = tokenData.exp 
        ? tokenData.exp * 1000 
        : Date.now() + 7 * 24 * 60 * 60 * 1000;
      
      // 8. 🔑 Revocar el token
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
      console.log(`  👤 Usuario: ${email}`);
      console.log(`  🔑 Tipo: ${tokenType}`);
      
      // 9. RFC 7009: SIEMPRE responder 200 OK
      res.status(200).json({ 
        status: 'ok',
        message: 'Token revoked successfully'
      });
      
    } catch (error: any) {
      console.error(`❌ OAuth /revoke: Error al verificar token:`, error.message);
      
      // Si el error es de verificación JWT, el usuario no está autenticado
      if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          error: 'invalid_client',
          message: 'Token de autenticación inválido o expirado'
        });
      }
      
      // Otro tipo de error
      return res.status(500).json({ 
        error: 'server_error',
        message: 'Error interno del servidor'
      });
    }
});

console.log('✅ OAuth: Ruta /oauth/revoke (RFC 7009) registrada');
```

**📝 Notas del endpoint**:
1. **RFC 7009 Compliance**: Siempre responde 200 OK
2. **Seguridad**: Verifica que el usuario sea dueño del token
3. **Flexibilidad**: Acepta tokens ya expirados
4. **Auditoría**: Registra todas las operaciones

### 1.3. Actualizar Middleware de Autenticación

**Archivo**: `src/middleware/auth.middleware.ts`

#### Paso 1.3.1: Importar oauthStorage

**Ubicación**: Al inicio del archivo, con los otros imports

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, JWTPayload } from '../types/auth.types';
import { oauthStorage } from '../oauth/storage';  // 🔑 NUEVO
```

#### Paso 1.3.2: Añadir validación de blacklist

**Ubicación**: Dentro de la función `authenticateToken`, después de obtener el token y antes de `jwt.verify`

Buscar esta línea:
```typescript
const token = parts[1];
```

Y DESPUÉS de esa línea, AÑADIR:

```typescript
// ===== NUEVO: Verificar si el token está revocado =====
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
// ===== FIN NUEVO =====
```

**Explicación**: 
- Verificamos la blacklist ANTES de verificar la firma JWT
- Si el token está revocado, respondemos 401 inmediatamente
- El header `WWW-Authenticate` indica a VSCode que debe iniciar nuevo flujo OAuth

### 1.4. Iniciar Tarea de Limpieza Automática

**Archivo**: `src/server-http.ts`

#### Paso 1.4.1: Importar oauthStorage

**Ubicación**: Al inicio del archivo, con los otros imports

```typescript
import { oauthStorage } from './oauth/storage';
```

#### Paso 1.4.2: Iniciar cleanup task

**Ubicación**: Al final del archivo, ANTES de `app.listen()`

Buscar:
```typescript
app.listen(port, () => {
  console.log(`🚀 MCP HTTP Server running on port ${port}`);
  // ...
});
```

AÑADIR ANTES de `app.listen()`:

```typescript
// ===== Iniciar tarea de limpieza de tokens revocados =====
oauthStorage.startCleanupTask();
console.log('🧹 OAuth: Tarea de limpieza de tokens iniciada (cada 1 hora)');
```

### 1.5. Testing de la Implementación

#### Test 1.5.1: Verificar que el endpoint responde

```bash
# Desde PowerShell o terminal
curl -X POST https://mcp-promps.onrender.com/oauth/revoke `
  -H "Content-Type: application/x-www-form-urlencoded" `
  -H "Authorization: Bearer test-token" `
  -d "token=otro-token"

# Debería responder: 401 (porque test-token es inválido)
```

#### Test 1.5.2: Probar revocación con token real

1. Obtener un access_token válido mediante OAuth flow completo
2. Verificar que funciona haciendo un request a `/mcp`
3. Revocar el token con `/oauth/revoke`
4. Intentar usar el token revocado → debe dar 401

**Script de test** (`test-mcp-revocation.js`):

```javascript
// Guardar como test-mcp-revocation.js en la raíz del proyecto
const fetch = require('node-fetch');

const BASE_URL = 'https://mcp-promps.onrender.com';

async function testMCPRevocation() {
  const ACCESS_TOKEN = process.env.MCP_ACCESS_TOKEN;
  
  if (!ACCESS_TOKEN) {
    console.error('❌ Debes configurar MCP_ACCESS_TOKEN');
    console.error('   Ejecuta: $env:MCP_ACCESS_TOKEN="tu-token-aqui"');
    process.exit(1);
  }
  
  console.log('🧪 Test 1: Verificar que el token funciona ANTES de revocar');
  const test1 = await fetch(`${BASE_URL}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'prompts/list'
    })
  });
  
  console.log(`   Status: ${test1.status}`);
  if (test1.status !== 200) {
    console.error('❌ Token no funciona, verifica que sea válido');
    process.exit(1);
  }
  console.log('✅ Test 1 PASÓ');
  
  console.log('\n🧪 Test 2: Revocar el token');
  const test2 = await fetch(`${BASE_URL}/oauth/revoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Bearer ${ACCESS_TOKEN}`
    },
    body: `token=${encodeURIComponent(ACCESS_TOKEN)}&token_type_hint=access_token`
  });
  
  console.log(`   Status: ${test2.status}`);
  const body2 = await test2.json();
  console.log(`   Response:`, JSON.stringify(body2, null, 2));
  
  if (test2.status !== 200) {
    console.error('❌ Revocación falló');
    process.exit(1);
  }
  console.log('✅ Test 2 PASÓ');
  
  console.log('\n🧪 Test 3: Verificar que el token revocado NO funciona');
  const test3 = await fetch(`${BASE_URL}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'prompts/list'
    })
  });
  
  console.log(`   Status: ${test3.status}`);
  const body3 = await test3.json();
  console.log(`   Response:`, JSON.stringify(body3, null, 2));
  
  if (test3.status !== 401) {
    console.error('❌ Token revocado debería dar 401');
    process.exit(1);
  }
  console.log('✅ Test 3 PASÓ');
  
  console.log('\n✅ TODOS LOS TESTS PASARON');
  console.log('   La revocación de tokens funciona correctamente');
}

testMCPRevocation().catch(console.error);
```

**Ejecutar**:

```powershell
# Primero instalar node-fetch si no está
npm install node-fetch@2

# Configurar un access_token válido (obtenerlo del flujo OAuth real)
$env:MCP_ACCESS_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Ejecutar test
node test-mcp-revocation.js
```

---

## FASE 2: Actualizar Frontend para Revocación Dual

**Duración estimada**: 2-3 horas  
**Prioridad**: 🟠 ALTA  
**Dependencias**: FASE 1 completada

### 2.1. Añadir Servicio de Revocación MCP

**Archivo**: `src/services/authService.ts` (en el repositorio del frontend)

#### Paso 2.1.1: Añadir función revokeMCPToken

**Ubicación**: Dentro del objeto `authService`, después de las otras funciones

```typescript
export const authService = {
  // ... métodos existentes (login, register, etc.) ...
  
  /**
   * Revocar access_token de MCP Server
   * Se debe llamar al hacer logout para invalidar el acceso de VSCode
   * 
   * @param mcpAccessToken - El access_token obtenido via OAuth
   * @returns Promise con resultado de la revocación
   */
  async revokeMCPToken(mcpAccessToken: string): Promise<{ status: 'success' } | ErrorResponse> {
    try {
      console.log('🔐 Revocando access_token de MCP...');
      
      const response = await fetch(`${MCP_BASE_URL}/oauth/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${mcpAccessToken}`
        },
        body: new URLSearchParams({
          token: mcpAccessToken,
          token_type_hint: 'access_token'
        })
      });
      
      if (response.ok) {
        console.log('✅ Access token de MCP revocado');
        return { status: 'success' };
      } else {
        const errorData = await response.json();
        console.error('❌ Error revocando token de MCP:', errorData);
        return {
          status: 'error',
          message: errorData.message || 'Error al revocar token de MCP'
        };
      }
    } catch (error) {
      console.error('❌ Error de red al revocar token de MCP:', error);
      return {
        status: 'error',
        message: 'Error de red al revocar token de MCP'
      };
    }
  },
  
  /**
   * Revocar refresh_token de MCP Server (si existe)
   * 
   * @param mcpRefreshToken - El refresh_token obtenido via OAuth
   * @param mcpAccessToken - Access token válido para autenticación
   * @returns Promise con resultado de la revocación
   */
  async revokeMCPRefreshToken(
    mcpRefreshToken: string, 
    mcpAccessToken: string
  ): Promise<{ status: 'success' } | ErrorResponse> {
    try {
      console.log('🔐 Revocando refresh_token de MCP...');
      
      const response = await fetch(`${MCP_BASE_URL}/oauth/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${mcpAccessToken}`
        },
        body: new URLSearchParams({
          token: mcpRefreshToken,
          token_type_hint: 'refresh_token'
        })
      });
      
      if (response.ok) {
        console.log('✅ Refresh token de MCP revocado');
        return { status: 'success' };
      } else {
        return {
          status: 'error',
          message: 'Error al revocar refresh token de MCP'
        };
      }
    } catch (error) {
      console.error('❌ Error revocando refresh token de MCP:', error);
      return {
        status: 'error',
        message: 'Error de red al revocar refresh token de MCP'
      };
    }
  }
}
```

**📝 Configuración necesaria**:

Añadir al inicio del archivo la constante del MCP Server:

```typescript
// Al inicio del archivo, con las otras constantes
const MCP_BASE_URL = import.meta.env.VITE_MCP_URL || 'https://mcp-promps.onrender.com';
```

Y en el archivo `.env`:

```env
VITE_MCP_URL=https://mcp-promps.onrender.com
```

### 2.2. Implementar Logout Dual

**Archivo**: `src/hooks/useAuth.ts` o `src/pages/Dashboard.tsx` (donde esté la lógica de logout)

#### Paso 2.2.1: Función de logout actualizada

**Ubicación**: Reemplazar la función de logout existente

```typescript
/**
 * Logout completo: revoca tokens en AMBOS sistemas
 * 1. Backend de Login (Loggin-MCP)
 * 2. MCP Server
 */
async function handleLogout() {
  console.log('🚪 Iniciando logout completo...');
  
  // 1. Obtener todos los tokens almacenados
  const loginToken = localStorage.getItem('token');         // JWT del backend de login
  const mcpAccessToken = localStorage.getItem('mcp_access_token');  // OAuth del MCP
  const mcpRefreshToken = localStorage.getItem('mcp_refresh_token');
  
  let loginRevoked = false;
  let mcpRevoked = false;
  
  // 2. Revocar token del Backend de Login
  if (loginToken) {
    try {
      console.log('🔐 Revocando token del backend de login...');
      const result = await authService.logout(loginToken);
      
      if (result.status === 'success') {
        console.log('✅ Token del backend de login revocado');
        loginRevoked = true;
      } else {
        console.warn('⚠️ No se pudo revocar token del backend de login');
      }
    } catch (error) {
      console.error('❌ Error revocando token del backend:', error);
      // Continuar con el logout local aunque falle
    }
  }
  
  // 3. Revocar tokens de MCP Server
  if (mcpAccessToken) {
    try {
      // 3.1. Revocar refresh_token primero (más importante)
      if (mcpRefreshToken) {
        console.log('🔐 Revocando refresh_token de MCP...');
        await authService.revokeMCPRefreshToken(mcpRefreshToken, mcpAccessToken);
      }
      
      // 3.2. Revocar access_token
      console.log('🔐 Revocando access_token de MCP...');
      const result = await authService.revokeMCPToken(mcpAccessToken);
      
      if (result.status === 'success') {
        console.log('✅ Tokens de MCP revocados');
        mcpRevoked = true;
      } else {
        console.warn('⚠️ No se pudo revocar token de MCP');
      }
    } catch (error) {
      console.error('❌ Error revocando tokens de MCP:', error);
      // Continuar con el logout local aunque falle
    }
  }
  
  // 4. Limpiar TODOS los datos del localStorage
  console.log('🧹 Limpiando almacenamiento local...');
  localStorage.removeItem('token');
  localStorage.removeItem('token_expires_at');
  localStorage.removeItem('user');
  localStorage.removeItem('mcp_access_token');
  localStorage.removeItem('mcp_refresh_token');
  localStorage.removeItem('mcp_token_expires_at');
  
  // O limpiar todo:
  // localStorage.clear();
  
  // 5. Mostrar feedback al usuario
  if (loginRevoked && mcpRevoked) {
    console.log('✅ Logout completo exitoso en todos los sistemas');
    // toast.success('Sesión cerrada correctamente');
  } else if (loginRevoked || mcp Revoked) {
    console.log('🔶 Logout parcial: algunos tokens no se pudieron revocar');
    // toast.warning('Sesión cerrada (algunos servicios pueden requerir re-autenticación)');
  } else {
    console.log('⚠️ Logout local: no se pudieron revocar tokens remotos');
    // toast.info('Sesión cerrada localmente');
  }
  
  // 6. Redirigir a login
  navigate('/login');
}
```

**📝 Explicación del flujo**:
1. **Orden de revocación**: Primero backend, luego MCP (puede ser paralelo)
2. **Resiliente**: Si falla una revocación, continúa con las demás
3. **Limpieza completa**: Elimina todos los tokens de localStorage
4. **Feedback**: Informa al usuario del resultado

### 2.3. Mejorar UX del Logout

#### Paso 2.3.1: Agregar loading state

```typescript
const [isLoggingOut, setIsLoggingOut] = useState(false);

async function handleLogout() {
  setIsLoggingOut(true);
  
  try {
    // ... código de logout ...
  } finally {
    setIsLoggingOut(false);
  }
}
```

#### Paso 2.3.2: Botón de logout con feedback

```tsx
<button
  onClick={handleLogout}
  disabled={isLoggingOut}
  className="btn-logout"
>
  {isLoggingOut ? (
    <>
      <Spinner />
      <span>Cerrando sesión...</span>
    </>
  ) : (
    <>
      <LogoutIcon />
      <span>Cerrar sesión</span>
    </>
  )}
</button>
```

### 2.4. Timeout y Fallback

Para evitar que el logout se bloquee por problemas de red:

```typescript
/**
 * Ejecutar promesa con timeout
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeoutMs)
    )
  ]);
}

async function handleLogout() {
  console.log('🚪 Iniciando logout...');
  
  const loginToken = localStorage.getItem('token');
  const mcpAccessToken = localStorage.getItem('mcp_access_token');
  
  // Ejecutar revocaciones en paralelo con timeout de 5 segundos
  const revocations = [];
  
  if (loginToken) {
    revocations.push(
      withTimeout(authService.logout(loginToken), 5000)
        .catch(err => console.warn('Timeout/error revocando backend de login:', err))
    );
  }
  
  if (mcpAccessToken) {
    revocations.push(
      withTimeout(authService.revokeMCPToken(mcpAccessToken), 5000)
        .catch(err => console.warn('Timeout/error revocando MCP:', err))
    );
  }
  
  // Esperar a que todas terminen (o fallen)
  await Promise.allSettled(revocations);
  
  // Continuar con limpieza local
  localStorage.clear();
  navigate('/login');
}
```

---

## FASE 3: Coordinar Revocación con Backend de Login

**Duración estimada**: 1 hora  
**Prioridad**: 🟢 MEDIA  
**Dependencias**: FASE 2 completada

### 3.1. Verificar Implementación Existente

El backend de login **YA tiene implementado** el sistema de revocación. Solo necesitamos asegurarnos que el frontend lo está usando correctamente.

#### Checklist de Verificación:

- [ ] El frontend llama a `POST /auth/logout` con el JWT correcto
- [ ] El backend de login responde 200 OK
- [ ] El jti del JWT se guarda en la tabla `revoked_tokens`
- [ ] El middleware del backend valida tokens revocados

### 3.2. Actualizar Servicio de Auth del Backend de Login (si es necesario)

**Archivo**: `src/services/authService.ts` (frontend)

Verificar que existe el método `logout`:

```typescript
export const authService = {
  // ... otros métodos ...
  
  /**
   * Logout del backend de login
   * Revoca el JWT del usuario
   */
  async logout(token: string): Promise<{ status: 'success' } | ErrorResponse> {
    try {
      const response = await fetch(`${AUTH_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        return { status: 'success' };
      } else {
        const errorData = await response.json();
        return {
          status: 'error',
          message: errorData.message || 'Error al cerrar sesión'
        };
      }
    } catch (error) {
      console.error('Error en logout:', error);
      return {
        status: 'error',
        message: 'Error de red al cerrar sesión'
      };
    }
  }
}
```

**📝 Configuración** (si no existe):

```typescript
// Al inicio del archivo
const AUTH_BASE_URL = import.meta.env.VITE_AUTH_URL || 'https://loggin-mcp.onrender.com';
```

Y en `.env`:

```env
VITE_AUTH_URL=https://loggin-mcp.onrender.com
```

### 3.3. Implementar "Cerrar Sesión en Todos los Dispositivos"

Esta es una funcionalidad opcional pero muy útil.

**Archivo**: `src/pages/Settings.tsx` o similar

```typescript
async function handleLogoutAllDevices() {
  const confirmed = window.confirm(
    '¿Estás seguro de que quieres cerrar sesión en TODOS los dispositivos?\n\n' +
    'Esto revocará todas las sesiones activas incluyendo VSCode, IntelliJ, etc.'
  );
  
  if (!confirmed) return;
  
  try {
    setLoading(true);
    
    // Llamar a endpoint especial en el backend de login (si existe)
    const response = await fetch(`${AUTH_BASE_URL}/auth/logout-all`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (response.ok) {
      alert('Sesiones cerradas en todos los dispositivos');
      // Hacer logout local
      localStorage.clear();
      navigate('/login');
    } else {
      alert('Error al cerrar sesiones');
    }
  } catch (error) {
    console.error(error);
    alert('Error de red');
  } finally {
    setLoading(false);
  }
}
```

---

## FASE 4: Testing End-to-End

**Duración estimada**: 2-3 horas  
**Prioridad**: 🔴 CRÍTICA  
**Dependencias**: FASE 1, 2, 3 completadas

### 4.1. Plan de Testing

#### Test Case 1: Logout desde Frontend → VSCode Pierde Acceso

**Objetivo**: Verificar que al hacer logout en el frontend, VSCode ya no puede usar MCP

**Pasos**:
1. Usuario hace login en frontend
2. Usuario autoriza VSCode mediante OAuth
3. VSCode usa MCP exitosamente
4. Usuario hace LOGOUT en frontend
5. VSCode intenta usar MCP → debe recibir 401

**Script de Verificación** (`test-logout-flow.md`):

```markdown
# Test: Flujo Completo de Logout

## Preparación
1. Abrir el frontend en navegador
2. Abrir VSCode con extensión de Copilot habilitada
3. Configurar MCP server en VSCode

## Ejecución

### Paso 1: Login y Autorización
- [ ] Hacer login en frontend
- [ ] Verificar que aparece el dashboard
- [ ] Abrir VSCode
- [ ] Copilot intenta conectar a MCP
- [ ] Se abre navegador para OAuth
- [ ] Usuario autoriza en el frontend
- [ ] VSCode recibe access_token
- [ ] Copilot puede usar prompts de MCP ✅

### Paso 2: Logout
- [ ] En el frontend, hacer clic en "Cerrar sesión"
- [ ] Ver consola del navegador:
  ```
  🚪 Iniciando logout completo...
  🔐 Revocando token del backend de login...
  ✅ Token del backend de login revocado
  🔐 Revocando access_token de MCP...
  ✅ Tokens de MCP revocados
  🧹 Limpiando almacenamiento local...
  ✅ Logout completo exitoso
  ```
- [ ] Usuario redirigido a /login ✅

### Paso 3: Verificar Revocación
- [ ] En VSCode, intentar usar un prompt de MCP
- [ ] VSCode NO puede conectar
- [ ] Error: "401 Unauthorized"
- [ ] Copilot solicita re-autenticación ✅

### Paso 4: Re-autenticación
- [ ] Usuario vuelve a autorizar en navegador
- [ ] VSCode recibe NUEVO access_token
- [ ] Copilot funciona nuevamente ✅

## Resultado Esperado
✅ PASS: El logout revoca correctamente el acceso de VSCode
```

### 4.2. Test Automatizado End-to-End

**Archivo**: `test-e2e-logout.js`

```javascript
const fetch = require('node-fetch');

const AUTH_URL = 'https://loggin-mcp.onrender.com';
const MCP_URL = 'https://mcp-promps.onrender.com';

async function testE2ELogout() {
  console.log('🧪 ===== TEST END-TO-END DE LOGOUT =====\n');
  
  // REQUISITO: Tener credenciales de test
  const EMAIL = process.env.TEST_EMAIL;
  const PASSWORD = process.env.TEST_PASSWORD;
  const MCP_ACCESS_TOKEN = process.env.TEST_MCP_TOKEN;
  
  if (!EMAIL || !PASSWORD || !MCP_ACCESS_TOKEN) {
    console.error('❌ Faltan variables de entorno:');
    console.error('   TEST_EMAIL, TEST_PASSWORD, TEST_MCP_TOKEN');
    process.exit(1);
  }
  
  // 1. Login en backend de autenticación
  console.log('📝 Paso 1: Login en backend de autenticación...');
  const loginRes = await fetch(`${AUTH_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  });
  
  const loginData = await loginRes.json();
  if (loginData.status !== 'success') {
    console.error('❌ Login falló:', loginData);
    process.exit(1);
  }
  
  const authToken = loginData.token;
  console.log('✅ Login exitoso\n');
  
  // 2. Verificar que MCP access_token funciona
  console.log('📝 Paso 2: Verificar que MCP funciona ANTES de logout...');
  const mcpBefore = await fetch(`${MCP_URL}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MCP_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'prompts/list'
    })
  });
  
  if (mcpBefore.status !== 200) {
    console.error('❌ MCP access_token no funciona antes de logout');
    process.exit(1);
  }
  console.log('✅ MCP funciona correctamente\n');
  
  // 3. Ejecutar logout en backend de autenticación
  console.log('📝 Paso 3: Logout en backend de autenticación...');
  const logoutAuthRes = await fetch(`${AUTH_URL}/auth/logout`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  if (!logoutAuthRes.ok) {
    console.error('❌ Logout del backend falló');
    process.exit(1);
  }
  console.log('✅ Logout del backend exitoso\n');
  
  // 4. Revocar token de MCP
  console.log('📝 Paso 4: Revocar access_token de MCP...');
  const revokeMcpRes = await fetch(`${MCP_URL}/oauth/revoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Bearer ${MCP_ACCESS_TOKEN}`
    },
    body: `token=${encodeURIComponent(MCP_ACCESS_TOKEN)}`
  });
  
  if (!revokeMcpRes.ok) {
    console.error('❌ Revocación de MCP falló');
    process.exit(1);
  }
  console.log('✅ Revocación de MCP exitosa\n');
  
  // 5. Verificar que MCP ya NO funciona
  console.log('📝 Paso 5: Verificar que MCP NO funciona DESPUÉS de logout...');
  const mcpAfter = await fetch(`${MCP_URL}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MCP_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'prompts/list'
    })
  });
  
  if (mcpAfter.status !== 401) {
    console.error('❌ MCP debería rechazar token revocado con 401');
    console.error(`   Pero respondió: ${mcpAfter.status}`);
    process.exit(1);
  }
  console.log('✅ MCP rechaza correctamente el token revocado\n');
  
  console.log('✅✅✅ TODOS LOS TESTS PASARON ✅✅✅');
  console.log('El flujo de logout funciona correctamente de extremo a extremo');
}

testE2ELogout().catch(console.error);
```

**Ejecutar**:

```powershell
# Configurar variables
$env:TEST_EMAIL="test@example.com"
$env:TEST_PASSWORD="password123"
$env:TEST_MCP_TOKEN="<obtener-del-flujo-oauth>"

# Ejecutar
node test-e2e-logout.js
```

### 4.3. Testing Manual con VSCode

#### Guía Paso a Paso:

1. **Configurar MCP en VSCode**

Editar settings.json de VSCode:

```json
{
  "github.copilot.mcpServers": {
    "mis-prompts": {
      "type": "http",
      "url": "https://mcp-promps.onrender.com/mcp",
      "oauth": {
        "type": "oauth2",
        "authorizationUrl": "https://mcp-promps.onrender.com/authorize",
        "tokenUrl": "https://mcp-promps.onrender.com/token"
      }
    }
  }
}
```

2. **Autorizar VSCode**

- Abrir Copilot en VSCode
- Copilot detecta que necesita OAuth
- Abre navegador → usuario hace login/autoriza
- VSCode recibe access_token

3. **Usar MCP**

- En Copilot, usar un prompt: `@mis-prompts revisar-codigo`
- Debería funcionar ✅

4. **Hacer Logout en Frontend**

- En el navegador, hacer clic en "Cerrar sesión"
- Verificar en consola que revoca ambos tokens

5. **Intentar Usar MCP Nuevamente**

- En VSCode, volver a usar `@mis-prompts`
- Debería fallar con error de autenticación ❌
- VSCode debería pedir re-autorización

---

## FASE 5: Optimizaciones y Mejoras

**Duración estimada**: 2-3 horas  
**Prioridad**: 🟡 BAJA (opcional)  
**Dependencias**: FASE 1-4 completadas

### 5.1. Migrar a Redis para Blacklist

**Problema**: La blacklist en memoria se pierde al reiniciar el servidor

**Solución**: Usar Redis

#### Paso 5.1.1: Instalar dependencias

```bash
npm install ioredis @types/ioredis
```

#### Paso 5.1.2: Configurar Redis

**Archivo**: `src/config/redis.ts` (nuevo)

```typescript
import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redis.on('connect', () => {
  console.log('✅ Redis conectado');
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err);
});
```

#### Paso 5.1.3: Adaptar OAuthStorage

**Archivo**: `src/oauth/storage.ts`

```typescript
import { redis } from '../config/redis';
import crypto from 'crypto';

class OAuthStorage {
  // ... métodos existentes ...
  
  /**
   * Revocar token usando Redis
   */
  async revokeToken(
    token: string,
    userId: string,
    email: string,
    clientId: string,
    tokenType: 'access_token' | 'refresh_token',
    expiresAt: number,
    reason?: string
  ): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    const data = {
      tokenHash,
      userId,
      email,
      clientId,
      tokenType,
      revokedAt: Date.now(),
      expiresAt,
      reason: reason || 'user_revocation'
    };
    
    // Calcular TTL (Time To Live) en segundos
    const ttl = Math.floor((expiresAt - Date.now()) / 1000);
    
    if (ttl > 0) {
      // Almacenar en Redis con TTL automático
      await redis.setex(
        `revoked:${tokenHash}`,
        ttl,
        JSON.stringify(data)
      );
      
      console.log(`🚫 OAuth: Token revocado y almacenado en Redis`);
      console.log(`  TTL: ${ttl} segundos`);
    }
  }
  
  /**
   * Verificar si token está revocado (consulta Redis)
   */
  async isTokenRevoked(token: string): Promise<boolean> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const exists = await redis.exists(`revoked:${tokenHash}`);
    return exists === 1;
  }
}
```

**Ventajas de Redis**:
- ✅ Persistencia entre reinicios
- ✅ TTL automático (no necesita cleanup manual)
- ✅ Escalable horizontalmente
- ✅ Compartido entre múltiples instancias del servidor

### 5.2. Implementar Notificaciones

Cuando se revoca un token, notificar al usuario por email:

**Archivo**: `src/oauth/routes.ts`

```typescript
import { sendEmail } from '../services/emailService';

// Dentro del endpoint /oauth/revoke, después de revocar:
await sendEmail({
  to: email,
  subject: 'Sesión cerrada en MCP Server',
  html: `
    <h2>Sesión Cerrada</h2>
    <p>Se ha cerrado una sesión activa de <strong>${clientId}</strong>.</p>
    <p>Fecha: ${new Date().toLocaleString()}</p>
    <p>Si no reconoces esta acción, por favor contacta con soporte.</p>
  `
});
```

### 5.3. Panel de Gestión de Sesiones

Crear una página en el frontend para que el usuario vea sus sesiones activas:

**Archivo**: `src/pages/Sessions.tsx` (nuevo)

```typescript
interface ActiveSession {
  clientId: string;
  clientName: string;
  lastUsed: Date;
  expiresAt: Date;
  ipAddress?: string;
}

export function SessionsPage() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  
  useEffect(() => {
    // Llamar a endpoint /api/sessions (hay que crearlo en el backend)
    fetchActiveSessions().then(setSessions);
  }, []);
  
  async function revokeSession(clientId: string) {
    // Llamar a endpoint personalizado para revocar solo ese cliente
    await fetch(`/api/sessions/${clientId}/revoke`, { method: 'POST' });
    // Recargar lista
    fetchActiveSessions().then(setSessions);
  }
  
  return (
    <div>
      <h1>Sesiones Activas</h1>
      <ul>
        {sessions.map(session => (
          <li key={session.clientId}>
            <div>
              <strong>{session.clientName}</strong>
              <span>Expira: {session.expiresAt.toLocaleString()}</span>
            </div>
            <button onClick={() => revokeSession(session.clientId)}>
              Revocar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## Checklist General

### Backend MCP Server

- [ ] **FASE 1.1**: Extender OAuthStorage
  - [ ] Interfaz `RevokedToken` añadida
  - [ ] Map `revokedTokens` añadido
  - [ ] Método `hashToken()` implementado
  - [ ] Método `revokeToken()` implementado
  - [ ] Método `isTokenRevoked()` implementado
  - [ ] Método `revokeAllUserTokens()` implementado
  - [ ] Método `cleanExpiredRevokedTokens()` implementado
  - [ ] Método `startCleanupTask()` implementado

- [ ] **FASE 1.2**: Endpoint `/oauth/revoke`
  - [ ] Ruta POST `/oauth/revoke` creada
  - [ ] Validación de autenticación implementada
  - [ ] Verificación de ownership del token
  - [ ] Revocación del token en blacklist
  - [ ] Respuesta 200 OK siempre (RFC 7009)
  - [ ] Logging de auditoría implementado

- [ ] **FASE 1.3**: Middleware actualizado
  - [ ] Import de `oauthStorage` añadido
  - [ ] Validación de blacklist antes de `jwt.verify`
  - [ ] Respuesta 401 con WWW-Authenticate para tokens revocados

- [ ] **FASE 1.4**: Cleanup Task
  - [ ] Import de `oauthStorage` en server-http.ts
  - [ ] Llamada a `startCleanupTask()` al iniciar servidor

- [ ] **FASE 1.5**: Testing
  - [ ] Script `test-mcp-revocation.js` creado
  - [ ] Tests ejecutados y pasados

### Frontend

- [ ] **FASE 2.1**: Servicio de revocación
  - [ ] Constante `MCP_BASE_URL` configurada
  - [ ] Método `revokeMCPToken()` implementado
  - [ ] Método `revokeMCPRefreshToken()` implementado
  - [ ] Variables de entorno `.env` configuradas

- [ ] **FASE 2.2**: Logout dual
  - [ ] Función `handleLogout()` actualizada
  - [ ] Revocación de backend de login integrada
  - [ ] Revocación de MCP integrada
  - [ ] Limpieza de localStorage completa
  - [ ] Feedback al usuario implementado

- [ ] **FASE 2.3**: UX mejorado
  - [ ] Loading state durante logout
  - [ ] Botón de logout con spinner
  - [ ] Mensajes de confirmación

- [ ] **FASE 2.4**: Timeout
  - [ ] Función `withTimeout()` implementada
  - [ ] Revocaciones con timeout de 5s
  - [ ] Fallback si falla revocación remota

### Backend de Login

- [ ] **FASE 3.1**: Verificación
  - [ ] Endpoint `/auth/logout` funciona
  - [ ] Frontend lo está llamando correctamente
  - [ ] Tokens se guardan en `revoked_tokens`
  - [ ] Middleware valida tokens revocados

- [ ] **FASE 3.2**: Servicio actualizado
  - [ ] Constante `AUTH_BASE_URL` configurada
  - [ ] Método `logout()` verif icado

### Testing

- [ ] **FASE 4.1**: Test manual
  - [ ] Flujo completo de logout ejecutado
  - [ ] VSCode pierde acceso después de logout
  - [ ] Re-autenticación funciona

- [ ] **FASE 4.2**: Test automatizado
  - [ ] Script `test-e2e-logout.js` creado
  - [ ] Variables de entorno configuradas
  - [ ] Tests ejecutados y pasados

- [ ] **FASE 4.3**: Testing con VSCode
  - [ ] MCP configurado en VSCode
  - [ ] OAuth flow completado
  - [ ] Logout revoca correctamente
  - [ ] VSCode solicita re-autenticación

### Optimizaciones (Opcionales)

- [ ] **FASE 5.1**: Redis
  - [ ] Redis instalado y configurado
  - [ ] OAuthStorage migrado a Redis
  - [ ] TTL automático verificado

- [ ] **FASE 5.2**: Notificaciones
  - [ ] Email de notificación implementado
  - [ ] Template de email creado

- [ ] **FASE 5.3**: Panel de sesiones
  - [ ] Página de sesiones creada
  - [ ] Endpoint `/api/sessions` implementado
  - [ ] UI para revocar sesiones específicas

---

## Consideraciones Importantes

### 1. Seguridad

#### 1.1. No Almacenar Tokens Completos

❌ **MAL**:
```typescript
revokedTokens.set(token, data);  // Token completo expuesto
```

✅ **BIEN**:
```typescript
const hash = crypto.createHash('sha256').update(token).digest('hex');
revokedTokens.set(hash, data);
```

#### 1.2. Validar Ownership

Siempre verificar que el usuario que revoca es el dueño del token:

```typescript
if (tokenData.userId !== userId) {
  // Usuario A NO puede revocar tokens de Usuario B
  return res.status(200).json({ status: 'ok' });  // RFC 7009
}
```

#### 1.3. RFC 7009 Compliance

Responder siempre 200 OK para evitar information leakage:

```typescript
// Incluso si el token no existe:
return res.status(200).json({ status: 'ok' });
```

### 2. Rendimiento

#### 2.1. Índices en Base de Datos

Si migras a PostgreSQL:

```sql
CREATE INDEX idx_revoked_tokens_hash ON revoked_tokens(token_hash);
CREATE INDEX idx_revoked_tokens_expires ON revoked_tokens(expires_at);
```

#### 2.2. Caché de Blacklist

Para alta concurrencia, usar Redis con caché en memoria:

```typescript
// Cache layer
const localCache = new Map();
const CACHE_TTL = 60000;  // 1 minuto

async function isTokenRevoked(token: string): Promise<boolean> {
  const hash = hashToken(token);
  
  // 1. Verificar cache local
  const cached = localCache.get(hash);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.revoked;
  }
  
  // 2. Consultar Redis
  const revoked = await redis.exists(`revoked:${hash}`) === 1;
  
  // 3. Actualizar cache local
  localCache.set(hash, {
    revoked,
    expiresAt: Date.now() + CACHE_TTL
  });
  
  return revoked;
}
```

### 3. Escalabilidad

#### 3.1. Múltiples Instancias

Si tienes múltiples instancias del MCP Server:

- ✅ Usar Redis (compartido entre instancias)
- ❌ NO usar in-memory Map (cada instancia tiene su propia copia)

#### 3.2. Rate Limiting

Proteger el endpoint de revocación:

```typescript
import rateLimit from 'express-rate-limit';

const revokeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutos
  max: 20,  // Máximo 20 revocaciones por IP
  message: 'Demasiadas solicitudes de revocación'
});

router.post('/oauth/revoke', revokeLimiter, ...);
```

### 4. Monitoreo y Logging

#### 4.1. Métricas Importantes

- Cantidad de revocaciones por día
- Tiempo promedio de revocación
- Errores de revocación
- Tokens revocados vs activos

#### 4.2. Alertas

Configurar alertas para:
- Picos anormales de revocaciones (posible ataque)
- Errores de conexión a Redis
- Blacklist demasiado grande

### 5. Migración y Rollback

#### 5.1. Plan de Migración

1. Desplegar código del MCP Server (FASE 1)
2. Actualizar frontend (FASE 2)
3. Monitorear logs por 24h
4. Optimizar si es necesario (FASE 5)

#### 5.2. Plan de Rollback

Si algo falla:

1. Revertir frontend a versión anterior
2. Revertir MCP Server a versión anterior
3. Limpiar blacklist en Redis (si aplica)
4. Comunicar a usuarios

---

## Conclusión

Este plan de trabajo detallado te guía paso a paso para implementar un sistema completo de revocación de tokens que coordina:

1. ✅ **Backend de Login**: Ya implementado, solo verificar
2. ✅ **MCP Server**: Implementar blacklist y endpoint de revocación
3. ✅ **Frontend**: Coordinar revocación dual al hacer logout
4. ✅ **VSCode**: Invalidar acceso automáticamente

**Resultado final**: Logout seguro y completo que invalida todas las sesiones activas en todos los sistemas.

**Tiempo total estimado**: 8-12 horas  
**Prioridad**: CRÍTICA (seguridad)

---

**Autor**: Análisis basado en ANALISIS_PROYECTO_LOGOUT.md y ANALISIS_Y_PLAN_REVOCACION_TOKENS.md  
**Fecha**: 17 de marzo de 2026  
**Versión**: 1.0
