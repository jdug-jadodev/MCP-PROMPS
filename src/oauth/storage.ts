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
 * Clase singleton para gestionar almacenamiento OAuth
 */
class OAuthStorage {
  private authRequests: Map<string, AuthRequest> = new Map();
  private authorizationCodes: Map<string, AuthorizationCode> = new Map();
  private refreshTokens: Map<string, RefreshTokenData> = new Map();

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
}

// Singleton export
export const oauthStorage = new OAuthStorage();

// Limpiar items expirados cada 10 minutos
setInterval(() => {
  oauthStorage.cleanupExpired();
}, 10 * 60 * 1000);
