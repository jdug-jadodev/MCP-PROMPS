import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, JWTPayload } from '../types/auth.types';

/**
 * Middleware de autenticación para MCP Server con soporte OAuth
 * 
 * Cuando falla la autenticación, incluye el header WWW-Authenticate
 * para que VS Code sepa que debe iniciar el flujo OAuth
 */
export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    
    console.log(`🔐 Auth Middleware: Verificando autenticación`);
    console.log(`  📋 Path: ${req.path}`);
    console.log(`  📋 Authorization header: ${authHeader ? 'presente' : 'ausente'}`);
    
    if (!authHeader) {
      console.log(`⚠️  Auth Middleware: No hay token, respondiendo 401 con WWW-Authenticate`);
      
      // WWW-Authenticate per MCP Auth spec - resource_metadata points to PRM endpoint
      const baseUrl = process.env.OAUTH_ISSUER || 'https://mcp-promps.onrender.com';
      res.setHeader(
        'WWW-Authenticate',
        `Bearer resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"`
      );
      res.status(401).json({ 
        status: 'error', 
        code: 'NO_TOKEN', 
        message: 'No se proporcionó token de autenticación' 
      });
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      const baseUrl = process.env.OAUTH_ISSUER || 'https://mcp-promps.onrender.com';
      res.setHeader(
        'WWW-Authenticate',
        `Bearer resource_metadata="${baseUrl}/.well-known/oauth-protected-resource", error="invalid_token"`
      );
      res.status(401).json({ 
        status: 'error', 
        code: 'INVALID_TOKEN_FORMAT', 
        message: 'Formato de token inválido. Use: Bearer <token>' 
      });
      return;
    }

    const token = parts[1];
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error('JWT_SECRET no está configurado');
      res.status(500).json({ 
        status: 'error', 
        code: 'SERVER_CONFIG_ERROR', 
        message: 'Error de configuración del servidor' 
      });
      return;
    }

    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    req.user = payload;
    console.log(`✅ Auth Middleware: Token válido para ${payload.email || payload.userId}`);
    next();
  } catch (error: any) {
    const baseUrl = process.env.OAUTH_ISSUER || 'https://mcp-promps.onrender.com';
    if (error && error.name === 'TokenExpiredError') {
      console.log(`⚠️  Auth Middleware: Token expirado, respondiendo 401 con WWW-Authenticate`);
      res.setHeader(
        'WWW-Authenticate',
        `Bearer resource_metadata="${baseUrl}/.well-known/oauth-protected-resource", error="invalid_token"`
      );
      res.status(401).json({ 
        status: 'error', 
        code: 'TOKEN_EXPIRED', 
        message: 'El token ha expirado' 
      });
      return;
    }
    if (error && error.name === 'JsonWebTokenError') {
      console.log(`⚠️  Auth Middleware: Token inválido, respondiendo 401 con WWW-Authenticate`);
      res.setHeader(
        'WWW-Authenticate',
        `Bearer resource_metadata="${baseUrl}/.well-known/oauth-protected-resource", error="invalid_token"`
      );
      res.status(401).json({ 
        status: 'error', 
        code: 'INVALID_TOKEN', 
        message: 'Token inválido' 
      });
      return;
    }
    console.error('Error validando token:', error);
    res.status(500).json({ 
      status: 'error', 
      code: 'INTERNAL_ERROR', 
      message: 'Error al validar token' 
    });
  }
};

export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader) { next(); return; }
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer' && process.env.JWT_SECRET) {
    try { req.user = jwt.verify(parts[1], process.env.JWT_SECRET as string) as JWTPayload; } catch (_) { }
  }
  next();
};
