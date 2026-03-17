// src/oauth/routes.ts

import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { oauthConfig, registeredClients, OAuthClient } from './config';
import { oauthStorage } from './storage';
import express from 'express';

const router = Router();

// Sesiones de redirección temporales (max 2 min) para pasar el code a VS Code
// sin depender de que el frontend redirija directamente a http://localhost
const redirectSessions = new Map<string, { url: string; expiresAt: number }>();

console.log('🔧 OAuth: Inicializando router OAuth...');

/**
 * GET /.well-known/oauth-protected-resource
 * 
 * Protected Resource Metadata per RFC 9728
 * VS Code/IntelliJ needs this to discover which authorization server
 * protects this MCP resource before initiating the OAuth flow.
 */
router.get('/.well-known/oauth-protected-resource', (req: Request, res: Response) => {
  const baseUrl = (oauthConfig.issuer || `https://${req.headers.host}`).replace(/\/$/, '');
  
  console.log(`📋 OAuth: Protected Resource Metadata solicitado desde ${req.ip}`);
  
  // resource MUST match the MCP endpoint URL per RFC 9728
  res.json({
    resource: `${baseUrl}/mcp`,
    authorization_servers: [baseUrl],
    bearer_methods_supported: ['header'],
    scopes_supported: ['mcp:read', 'mcp:write']
  });
});

// Path-suffixed variant per RFC 9728
router.get('/.well-known/oauth-protected-resource/mcp', (req: Request, res: Response) => {
  const baseUrl = (oauthConfig.issuer || `https://${req.headers.host}`).replace(/\/$/, '');
  
  console.log(`📋 OAuth: Protected Resource Metadata (path-suffixed) solicitado desde ${req.ip}`);
  
  res.json({
    resource: `${baseUrl}/mcp`,
    authorization_servers: [baseUrl],
    bearer_methods_supported: ['header'],
    scopes_supported: ['mcp:read', 'mcp:write']
  });
});

console.log('✅ OAuth: Ruta /.well-known/oauth-protected-resource registrada');

/**
 * GET /.well-known/oauth-authorization-server
 * 
 * Metadata del servidor OAuth según RFC 8414
 * VS Code e IntelliJ consultan este endpoint para descubrir capacidades
 * 
 * Referencia: https://tools.ietf.org/html/rfc8414
 */
router.get('/.well-known/oauth-authorization-server', (req: Request, res: Response) => {
  // Construir base URL dinámicamente o usar variable de entorno
  const baseUrl = oauthConfig.issuer || `https://${req.headers.host}`;
  
  console.log(`📋 OAuth: Metadata solicitado desde ${req.ip}`);
  console.log(`  🔗 Base URL: ${baseUrl}`);
  console.log(`  🔗 Authorization endpoint: ${baseUrl}/authorize`);
  console.log(`  🔗 Token endpoint: ${baseUrl}/token`);
  
  const metadata = {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/authorize`,
    token_endpoint: `${baseUrl}/token`,
    registration_endpoint: `${baseUrl}/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
    code_challenge_methods_supported: ['S256', 'plain'],
    scopes_supported: ['mcp:read', 'mcp:write']
  };

  console.log(`📋 OAuth: Metadata solicitado desde ${req.ip}`);
  
  res.json(metadata);
});

console.log('✅ OAuth: Ruta /.well-known/oauth-authorization-server registrada');

/**
 * POST /oauth/register - Dynamic Client Registration (RFC 7591)
 * 
 * VS Code calls this automatically to register its client before starting OAuth.
 * We accept any registration and create a dynamic client entry.
 */
router.post('/oauth/register', express.json(), (req: Request, res: Response) => {
  const { client_name, redirect_uris, grant_types, token_endpoint_auth_method, scope } = req.body;

  console.log(`🔐 OAuth /oauth/register: ===== DCR REQUEST RECIBIDO =====`);
  console.log(`  📋 client_name: ${client_name}`);
  console.log(`  📋 redirect_uris: ${JSON.stringify(redirect_uris)}`);
  console.log(`  📋 grant_types: ${JSON.stringify(grant_types)}`);
  console.log(`  📋 token_endpoint_auth_method: ${token_endpoint_auth_method}`);
  console.log(`  📋 scope: ${scope}`);
  console.log(`  📋 Full body:`, JSON.stringify(req.body, null, 2));

  // Generate a unique client_id for this registration
  const clientId = uuid();

  // Store the dynamically registered client
  const newClient: OAuthClient = {
    clientId,
    name: client_name || 'Dynamic Client',
    redirectUris: redirect_uris || ['http://127.0.0.1:*', 'http://localhost:*'],
    isPublic: true,
    requiresPKCE: false, // Don't enforce PKCE requirement for dynamic clients - VS Code sends it anyway
    allowedScopes: ['mcp:read', 'mcp:write']
  };

  // Add to registered clients map
  registeredClients[clientId] = newClient;
  oauthStorage.saveDynamicClient(clientId, newClient);

  console.log(`✅ OAuth: Cliente registrado dinámicamente: ${clientId} (${client_name})`);

  // Respond per RFC 7591
  res.status(201).json({
    client_id: clientId,
    client_name: client_name || 'Dynamic Client',
    redirect_uris: redirect_uris || ['http://127.0.0.1:*', 'http://localhost:*'],
    grant_types: grant_types || ['authorization_code', 'refresh_token'],
    token_endpoint_auth_method: token_endpoint_auth_method || 'none',
    scope: scope || 'mcp:read mcp:write'
  });
});

console.log('✅ OAuth: Ruta /oauth/register (DCR) registrada');

/**
 * GET /authorize - Inicia flujo OAuth
 * 
 * Este endpoint recibe la solicitud inicial de VS Code/IntelliJ,
 * valida los parámetros, y redirige al usuario al frontend de login
 */
router.get('/authorize', (req: Request, res: Response) => {
  const { 
    client_id, 
    redirect_uri, 
    state, 
    code_challenge, 
    code_challenge_method,
    response_type,
    scope
  } = req.query;

  console.log(`🔐 OAuth /authorize: ===== FLUJO OAUTH INICIADO =====`);
  console.log(`  📋 client_id: ${client_id}`);
  console.log(`  📋 redirect_uri: ${redirect_uri}`);
  console.log(`  📋 state: ${state}`);
  console.log(`  📋 response_type: ${response_type}`);
  console.log(`  📋 scope: ${scope}`);
  console.log(`  📋 code_challenge: ${code_challenge ? 'presente' : 'ausente'}`);
  console.log(`  📋 code_challenge_method: ${code_challenge_method}`);
  console.log(`  📋 Full query:`, JSON.stringify(req.query, null, 2));

  // 1. Validate client_id - check static and dynamic clients
  let client = registeredClients[client_id as string];
  if (!client) {
    // Also check dynamic clients from storage
    client = oauthStorage.getDynamicClient(client_id as string) as OAuthClient;
  }
  if (!client) {
    // Auto-register si el redirect_uri es localhost válido (VS Code tras redeploy del servidor)
    const redirectUriStr = redirect_uri as string;
    const isLocalhostRedirect = redirectUriStr && (
      redirectUriStr.startsWith('http://127.0.0.1:') ||
      redirectUriStr.startsWith('http://localhost:')
    );
    if (client_id && isLocalhostRedirect) {
      client = {
        clientId: client_id as string,
        name: 'Auto-registered Client',
        redirectUris: ['http://127.0.0.1:*', 'http://localhost:*'],
        isPublic: true,
        requiresPKCE: false,
        allowedScopes: ['mcp:read', 'mcp:write']
      };
      registeredClients[client_id as string] = client;
      oauthStorage.saveDynamicClient(client_id as string, client);
      console.log(`⚠️ OAuth: Cliente auto-registrado (redeploy): ${client_id}`);
    } else {
      console.error(`❌ OAuth: Cliente no registrado: ${client_id}`);
      console.error(`❌ OAuth: Clientes registrados disponibles:`, Object.keys(registeredClients));
      return res.status(400).json({ 
        error: 'invalid_client', 
        message: 'Cliente no registrado' 
      });
    }
  }

  // 2. Validar redirect_uri
  if (redirect_uri) {
    const isValidRedirectUri = validateRedirectUri(redirect_uri as string, client.redirectUris);
    if (!isValidRedirectUri) {
      console.error(`❌ OAuth: redirect_uri inválido: ${redirect_uri}`);
      return res.status(400).json({ 
        error: 'invalid_redirect_uri',
        message: 'Redirect URI no permitido para este cliente'
      });
    }
  }

  // 3. Validar response_type
  if (response_type !== 'code') {
    console.error(`❌ OAuth: response_type no soportado: ${response_type}`);
    return res.status(400).json({ 
      error: 'unsupported_response_type',
      message: 'Solo se soporta response_type=code'
    });
  }

  // 4. Guardar solicitud OAuth en memoria (expira en 10 min)
  const oauthRequestId = uuid();
  const expiresAt = Date.now() + oauthConfig.authRequestLifetime * 1000;
  
  oauthStorage.saveAuthRequest(oauthRequestId, {
    clientId: client_id as string,
    redirectUri: redirect_uri as string,
    state: state as string,
    codeChallenge: code_challenge as string,
    codeChallengeMethod: (code_challenge_method as 'S256' | 'plain') || 'S256',
    scope: scope as string,
    expiresAt
  });

  // 5. Redirigir a frontend de login con oauth_request parameter
  const loginRedirectUrl = `${oauthConfig.frontendLoginUrl}?oauth_request=${oauthRequestId}`;
  
  console.log(`✅ OAuth: Redirigiendo a login...`);
  console.log(`  🔗 URL de frontend: ${loginRedirectUrl}`);
  console.log(`  🔗 Cliente: ${client.name}`);
  res.redirect(loginRedirectUrl);
});

console.log('✅ OAuth: Ruta /authorize registrada');

/**
 * POST /oauth/callback
 * 
 * Frontend envía el JWT del usuario después del login exitoso.
 * Generamos authorization_code y respondemos con redirect_uri para VS Code/IntelliJ
 */
router.post('/oauth/callback', express.json(), async (req: Request, res: Response) => {
  // El frontend puede enviar el JWT bajo el campo 'jwt' o 'token'
  const { oauth_request, jwt: jwtToken, token } = req.body;
  const userToken = jwtToken || token;

  console.log(`🔐 OAuth /callback: Procesando oauth_request ${oauth_request}`);

  // 1. Validar que existe la solicitud OAuth
  const authRequest = oauthStorage.getAuthRequest(oauth_request);
  if (!authRequest) {
    console.error(`❌ OAuth: Auth request no encontrado o expirado: ${oauth_request}`);
    return res.status(400).json({ 
      error: 'invalid_request', 
      message: 'Solicitud OAuth expirada o inválida' 
    });
  }

  // 2. Validar que no ha expirado (doble check)
  if (Date.now() > authRequest.expiresAt) {
    oauthStorage.deleteAuthRequest(oauth_request);
    console.error(`❌ OAuth: Auth request expirado: ${oauth_request}`);
    return res.status(400).json({ 
      error: 'expired_request', 
      message: 'La solicitud OAuth ha expirado' 
    });
  }

  // 3. Validar el JWT del usuario (usando JWT_SECRET existente)
  try {
    const decoded = jwt.verify(userToken, process.env.JWT_SECRET!) as { userId: string; email: string };
    
    console.log(`✅ OAuth: JWT validado para usuario ${decoded.email}`);
    
    // 4. Generar authorization_code
    const authorizationCode = uuid();
    
    // 5. Guardar el código asociado al usuario y la solicitud
    const codeExpiresAt = Date.now() + oauthConfig.authorizationCodeLifetime * 1000;
    
    oauthStorage.saveAuthorizationCode(authorizationCode, {
      code: authorizationCode,
      userId: decoded.userId,
      email: decoded.email,
      clientId: authRequest.clientId,
      redirectUri: authRequest.redirectUri,
      codeChallenge: authRequest.codeChallenge,
      codeChallengeMethod: authRequest.codeChallengeMethod,
      scope: authRequest.scope,
      expiresAt: codeExpiresAt,
      createdAt: Date.now()
    });

    // 6. Limpiar la solicitud OAuth (ya no se necesita)
    oauthStorage.deleteAuthRequest(oauth_request);

    // 7. Construir URL final de redirección para VS Code/IntelliJ
    const redirectUrl = new URL(authRequest.redirectUri);
    redirectUrl.searchParams.set('code', authorizationCode);
    if (authRequest.state) {
      redirectUrl.searchParams.set('state', authRequest.state);
    }

    // 8. Guardar la URL final en una sesión temporal y devolver una URL HTTPS del backend.
    //    Así el frontend navega a HTTPS (siempre funciona) y el backend hace el redirect
    //    final a http://127.0.0.1:PORT (VS Code). Evita problemas de mixed-content.
    const redirectSessionId = uuid();
    redirectSessions.set(redirectSessionId, {
      url: redirectUrl.toString(),
      expiresAt: Date.now() + 2 * 60 * 1000 // 2 minutos
    });

    const baseUrl = (oauthConfig.issuer || `https://${req.headers.host}`).replace(/\/$/, '');
    const frontendRedirectUrl = `${baseUrl}/oauth/redirect/${redirectSessionId}`;

    console.log(`✅ OAuth: Código generado para usuario ${decoded.email}`);
    console.log(`  🔗 Redirect session: ${redirectSessionId}`);
    console.log(`  🔗 URL final (VS Code): ${redirectUrl.toString()}`);

    res.json({
      status: 'success',
      redirectUrl: frontendRedirectUrl
    });

  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    return res.status(401).json({ 
      error: 'invalid_token', 
      message: 'Token JWT inválido o expirado' 
    });
  }
});

console.log('✅ OAuth: Ruta /oauth/callback registrada');

/**
 * GET /oauth/redirect/:sessionId
 *
 * El frontend navega aquí (HTTPS) tras el login OAuth.
 * El backend redirige al localhost de VS Code con el authorization_code.
 * Esto evita que el frontend tenga que redirigir directamente a http://127.0.0.1
 * desde una página HTTPS.
 */
router.get('/oauth/redirect/:sessionId', (req: Request, res: Response) => {
  const sessionId = req.params.sessionId as string;
  const session = redirectSessions.get(sessionId);

  if (!session) {
    console.error(`❌ OAuth /redirect: Sesión no encontrada o expirada: ${sessionId}`);
    return res.status(404).send('Sesión OAuth expirada. Por favor, inicia el proceso de nuevo desde VS Code.');
  }

  if (Date.now() > session.expiresAt) {
    redirectSessions.delete(sessionId);
    console.error(`❌ OAuth /redirect: Sesión expirada: ${sessionId}`);
    return res.status(410).send('Sesión OAuth expirada. Por favor, inicia el proceso de nuevo desde VS Code.');
  }

  redirectSessions.delete(sessionId);
  console.log(`✅ OAuth /redirect: Redirigiendo a VS Code: ${session.url}`);
  res.redirect(session.url);
});

console.log('✅ OAuth: Ruta /oauth/redirect/:sessionId registrada');

/**
 * POST /token
 * 
 * Intercambia authorization_code por access_token
 * También soporta refresh_token grant
 */
router.post('/token', express.urlencoded({ extended: true }), async (req: Request, res: Response) => {
  const { 
    grant_type, 
    code, 
    client_id, 
    redirect_uri, 
    code_verifier,
    refresh_token 
  } = req.body;

  console.log(`🔐 OAuth /token: grant_type=${grant_type}, client_id=${client_id}`);

  // Soporte para refresh_token
  if (grant_type === 'refresh_token') {
    return handleRefreshToken(req, res, refresh_token, client_id);
  }

  // Validar grant_type
  if (grant_type !== 'authorization_code') {
    console.error(`❌ OAuth: grant_type no soportado: ${grant_type}`);
    return res.status(400).json({ 
      error: 'unsupported_grant_type',
      message: 'Solo se soporta authorization_code y refresh_token'
    });
  }

  // 1. Buscar el authorization_code
  const authCode = oauthStorage.getAuthorizationCode(code);
  if (!authCode) {
    console.error(`❌ OAuth: Código inválido o expirado`);
    return res.status(400).json({ 
      error: 'invalid_grant', 
      message: 'Código inválido o expirado' 
    });
  }

  // 2. Validar que no ha expirado (doble check)
  if (Date.now() > authCode.expiresAt) {
    oauthStorage.deleteAuthorizationCode(code);
    console.error(`❌ OAuth: Código expirado`);
    return res.status(400).json({ 
      error: 'invalid_grant', 
      message: 'Código expirado' 
    });
  }

  // 3. Validar client_id
  if (authCode.clientId !== client_id) {
    console.error(`❌ OAuth: Client ID no coincide`);
    return res.status(400).json({ 
      error: 'invalid_grant', 
      message: 'Client ID no coincide' 
    });
  }

  // 4. Validar redirect_uri
  if (authCode.redirectUri !== redirect_uri) {
    console.error(`❌ OAuth: Redirect URI no coincide`);
    return res.status(400).json({ 
      error: 'invalid_grant', 
      message: 'Redirect URI no coincide' 
    });
  }

  // 5. Validar PKCE (code_verifier)
  if (authCode.codeChallenge) {
    const isValidPKCE = validatePKCE(
      code_verifier, 
      authCode.codeChallenge, 
      authCode.codeChallengeMethod || 'S256'
    );
    if (!isValidPKCE) {
      console.error(`❌ OAuth: PKCE validation failed`);
      return res.status(400).json({ 
        error: 'invalid_grant', 
        message: 'PKCE validation failed' 
      });
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
    { expiresIn: `${oauthConfig.accessTokenLifetime}s` }
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
    { expiresIn: `${oauthConfig.refreshTokenLifetime}s` }
  );

  // Guardar refresh_token
  const refreshTokenExpiresAt = Date.now() + oauthConfig.refreshTokenLifetime * 1000;
  oauthStorage.saveRefreshToken(newRefreshToken, {
    userId: authCode.userId,
    email: authCode.email,
    clientId: client_id,
    scope: authCode.scope,
    expiresAt: refreshTokenExpiresAt
  });

  console.log(`✅ Token generado para usuario ${authCode.email} (cliente: ${client_id})`);

  // 9. Responder con tokens
  res.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: oauthConfig.accessTokenLifetime,
    refresh_token: newRefreshToken
  });
});

console.log('✅ OAuth: Ruta /token registrada');

// ===== HELPER FUNCTIONS =====

/**
 * Valida redirect_uri contra patrones con wildcards
 */
function validateRedirectUri(uri: string, allowedPatterns: string[]): boolean {
  if (!uri) return false;
  
  return allowedPatterns.some(pattern => {
    // Convertir patrón con wildcard a regex
    // "http://127.0.0.1:*" → /^http:\/\/127\.0\.0\.1:\d+/
    const regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escapar caracteres especiales
      .replace(/\*/g, '.*'); // Convertir * a .*
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(uri);
  });
}

/**
 * Valida PKCE code_verifier contra code_challenge
 */
function validatePKCE(verifier: string, challenge: string, method: 'S256' | 'plain'): boolean {
  if (!verifier) return false;
  
  if (method === 'plain') {
    return verifier === challenge;
  }
  
  // S256: BASE64URL(SHA256(code_verifier)) === code_challenge
  const hash = crypto.createHash('sha256').update(verifier).digest();
  const computed = hash.toString('base64url');
  return computed === challenge;
}

/**
 * Maneja refresh_token grant
 */
async function handleRefreshToken(req: Request, res: Response, refreshToken: string, clientId: string) {
  try {
    console.log(`🔐 OAuth: Procesando refresh_token para ${clientId}`);
    
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as any;
    
    if (decoded.type !== 'refresh_token') {
      console.error(`❌ OAuth: Token no es del tipo refresh_token`);
      return res.status(400).json({ 
        error: 'invalid_grant',
        message: 'El token provisto no es un refresh_token'
      });
    }

    // Validar que el refresh_token existe en storage
    const storedToken = oauthStorage.getRefreshToken(refreshToken);
    if (!storedToken) {
      console.error(`❌ OAuth: Refresh token no encontrado o expirado`);
      return res.status(400).json({ 
        error: 'invalid_grant',
        message: 'Refresh token inválido o expirado'
      });
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
      { expiresIn: `${oauthConfig.accessTokenLifetime}s` }
    );

    console.log(`✅ Access token renovado para usuario ${decoded.email}`);

    res.json({
      access_token: newAccessToken,
      token_type: 'Bearer',
      expires_in: oauthConfig.accessTokenLifetime
    });
  } catch (error) {
    console.error(`❌ OAuth: Error validando refresh_token:`, error);
    return res.status(400).json({ 
      error: 'invalid_grant', 
      message: 'Refresh token inválido' 
    });
  }
}

export default router;
