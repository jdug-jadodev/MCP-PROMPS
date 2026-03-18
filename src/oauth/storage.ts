// src/oauth/storage.ts

/**
 * Sistema de almacenamiento en memoria para datos OAuth
 * 
 * ADVERTENCIA: Los datos se pierden al reiniciar el servidor.
 * Para producción, migrar a Redis o base de datos.
 */

/**
 * Solicitud OAuth temporal durante flujo /authorize
 * Guardada mientras el usuario completa el login
 */
export interface AuthRequest {
  clientId: string;
  redirectUri: string;
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: 'S256' | 'plain';
  scope?: string;
  expiresAt: number;              // Timestamp en ms
}

/**
 * Código de autorización emitido después del login
 * Intercambiado por access_token en endpoint /token
 */
export interface AuthorizationCode {
  code: string;
  clientId: string;
  redirectUri: string;
  userId: string;                 // ID del usuario autenticado
  email: string;
  codeChallenge?: string;
  codeChallengeMethod?: 'S256' | 'plain';
  scope?: string;
  expiresAt: number;
  createdAt: number;
}

/**
 * Refresh token para obtener nuevos access tokens
 * sin re-autenticación del usuario
 */
export interface RefreshTokenData {
  userId: string;
  email: string;
  clientId: string;
  scope?: string;
  expiresAt: number;
}

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

/**
 * Clase singleton para gestionar almacenamiento OAuth
 */
class OAuthStorage {
  private authRequests: Map<string, AuthRequest> = new Map();
  private authorizationCodes: Map<string, AuthorizationCode> = new Map();
  private refreshTokens: Map<string, RefreshTokenData> = new Map();
  private dynamicClients: Map<string, any> = new Map();
  
  // ===== NUEVO: Blacklist de tokens revocados =====
  private revokedTokens: Map<string, RevokedToken> = new Map();

  // ===== DYNAMIC CLIENTS =====
  
  saveDynamicClient(clientId: string, data: any): void {
    this.dynamicClients.set(clientId, data);
    console.log(`💾 OAuth: Dynamic client guardado: ${clientId}`);
  }

  getDynamicClient(clientId: string): any | undefined {
    return this.dynamicClients.get(clientId);
  }

  // ===== AUTH REQUESTS =====
  
  saveAuthRequest(requestId: string, data: AuthRequest): void {
    this.authRequests.set(requestId, data);
    console.log(`💾 OAuth: Auth request guardado: ${requestId} para cliente ${data.clientId}`);
  }

  getAuthRequest(requestId: string): AuthRequest | undefined {
    const request = this.authRequests.get(requestId);
    
    // Validar expiración
    if (request && Date.now() > request.expiresAt) {
      this.deleteAuthRequest(requestId);
      console.log(`⏰ OAuth: Auth request expirado: ${requestId}`);
      return undefined;
    }
    
    return request;
  }

  deleteAuthRequest(requestId: string): void {
    this.authRequests.delete(requestId);
    console.log(`🗑️ OAuth: Auth request eliminado: ${requestId}`);
  }

  // ===== AUTHORIZATION CODES =====
  
  saveAuthorizationCode(code: string, data: AuthorizationCode): void {
    this.authorizationCodes.set(code, data);
    console.log(`💾 OAuth: Authorization code guardado para usuario ${data.email}`);
  }

  getAuthorizationCode(code: string): AuthorizationCode | undefined {
    const authCode = this.authorizationCodes.get(code);
    
    // Validar expiración
    if (authCode && Date.now() > authCode.expiresAt) {
      this.deleteAuthorizationCode(code);
      console.log(`⏰ OAuth: Authorization code expirado`);
      return undefined;
    }
    
    return authCode;
  }

  deleteAuthorizationCode(code: string): void {
    this.authorizationCodes.delete(code);
    console.log(`🗑️ OAuth: Authorization code eliminado (single-use)`);
  }

  // ===== REFRESH TOKENS =====
  
  saveRefreshToken(token: string, data: RefreshTokenData): void {
    this.refreshTokens.set(token, data);
    console.log(`💾 OAuth: Refresh token guardado para usuario ${data.email}`);
  }

  getRefreshToken(token: string): RefreshTokenData | undefined {
    const refreshToken = this.refreshTokens.get(token);
    
    // Validar expiración
    if (refreshToken && Date.now() > refreshToken.expiresAt) {
      this.deleteRefreshToken(token);
      console.log(`⏰ OAuth: Refresh token expirado`);
      return undefined;
    }
    
    return refreshToken;
  }

  deleteRefreshToken(token: string): void {
    this.refreshTokens.delete(token);
    console.log(`🗑️ OAuth: Refresh token eliminado`);
  }

  // ===== UTILIDADES =====
  
  /**
   * Limpiar items expirados (ejecutar periódicamente)
   */
  cleanupExpired(): number {
    const now = Date.now();
    let cleaned = 0;

    // Limpiar auth requests expirados
    for (const [id, request] of this.authRequests.entries()) {
      if (now > request.expiresAt) {
        this.authRequests.delete(id);
        cleaned++;
      }
    }

    // Limpiar authorization codes expirados
    for (const [code, authCode] of this.authorizationCodes.entries()) {
      if (now > authCode.expiresAt) {
        this.authorizationCodes.delete(code);
        cleaned++;
      }
    }

    // Limpiar refresh tokens expirados
    for (const [token, refreshToken] of this.refreshTokens.entries()) {
      if (now > refreshToken.expiresAt) {
        this.refreshTokens.delete(token);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 OAuth: ${cleaned} items expirados limpiados`);
    }

    return cleaned;
  }

  /**
   * Obtener estadísticas de almacenamiento
   */
  getStats(): { authRequests: number; authCodes: number; refreshTokens: number } {
    return {
      authRequests: this.authRequests.size,
      authCodes: this.authorizationCodes.size,
      refreshTokens: this.refreshTokens.size
    };
  }

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
}

// Singleton export
export const oauthStorage = new OAuthStorage();

// Limpiar items expirados cada 10 minutos
setInterval(() => {
  oauthStorage.cleanupExpired();
}, 10 * 60 * 1000);
