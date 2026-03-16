// src/oauth/config.ts

/**
 * Configuración de clientes OAuth 2.0 para MCP Server
 * 
 * Clientes públicos: VS Code e IntelliJ (no pueden proteger secrets)
 * Requieren PKCE obligatorio para seguridad
 */

export interface OAuthClient {
  clientId: string;
  name: string;
  redirectUris: string[];        // Patrones permitidos (soporta wildcard *)
  isPublic: boolean;             // true = no requiere client_secret
  requiresPKCE: boolean;         // true = requiere code_challenge
  allowedScopes?: string[];      // Scopes permitidos (futuro)
}

/**
 * Registro de clientes OAuth pre-autorizados
 * 
 * VS Code e IntelliJ usan puertos dinámicos en 127.0.0.1,
 * por lo que usamos patrones con wildcard para validación
 */
export const registeredClients: Record<string, OAuthClient> = {
  'vscode-mcp-client': {
    clientId: 'vscode-mcp-client',
    name: 'VS Code GitHub Copilot',
    redirectUris: [
      'http://127.0.0.1:*',              // Puerto dinámico local
      'http://localhost:*',              // Alternativa localhost
      'vscode://github.copilot.chat/*'   // Deep link de VS Code (si aplica)
    ],
    isPublic: true,
    requiresPKCE: true,
    allowedScopes: ['mcp:read', 'mcp:write']
  },
  
  'intellij-mcp-client': {
    clientId: 'intellij-mcp-client',
    name: 'IntelliJ GitHub Copilot',
    redirectUris: [
      'http://127.0.0.1:*',
      'http://localhost:*'
    ],
    isPublic: true,
    requiresPKCE: true,
    allowedScopes: ['mcp:read', 'mcp:write']
  }
};

/**
 * Configuración de OAuth 2.0
 */
export const oauthConfig = {
  // URL base del servidor (issuer)
  issuer: process.env.OAUTH_ISSUER || 'https://mcp-promps.onrender.com',
  
  // URL del frontend de login
  frontendLoginUrl: process.env.FRONTEND_LOGIN_URL || 'https://front-mcp-gules.vercel.app/login',
  
  // Lifetimes (en segundos)
  accessTokenLifetime: 3600,        // 1 hora
  refreshTokenLifetime: 604800,     // 7 días
  authorizationCodeLifetime: 300,   // 5 minutos
  authRequestLifetime: 600,         // 10 minutos
};

/**
 * Validar si un redirect_uri coincide con patrones registrados
 * Soporta wildcard '*' en el puerto
 * 
 * Ejemplos:
 * - Pattern: 'http://127.0.0.1:*'
 * - Matches: 'http://127.0.0.1:12345', 'http://127.0.0.1:54321'
 * 
 * @param uri - URI a validar
 * @param allowedPatterns - Lista de patrones permitidos
 * @returns true si el URI coincide con algún patrón
 */
export function validateRedirectUri(uri: string, allowedPatterns: string[]): boolean {
  return allowedPatterns.some(pattern => {
    // Convertir patrón con wildcard a expresión regular
    // Escapar caracteres especiales de regex excepto *
    const regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')  // Escapar especiales
      .replace(/\*/g, '.*');                   // * → .* (cualquier cosa)
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(uri);
  });
}
