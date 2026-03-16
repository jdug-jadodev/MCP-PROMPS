# 🚀 Plan de Integración MCP Gateway

**Sistema de Autenticación con MCP Server Gateway**

> Plan estructurado por fases para integrar un servidor MCP que actúe como gateway entre el frontend y el backend de autenticación, evaluando sesiones y controlando el acceso.

---

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Arquitectura Propuesta](#arquitectura-propuesta)
3. [Fase 1: Diseño y Planificación](#fase-1-diseño-y-planificación)
4. [Fase 2: Configuración del MCP Gateway](#fase-2-configuración-del-mcp-gateway)
5. [Fase 3: Implementación del Gateway](#fase-3-implementación-del-gateway)
6. [Fase 4: Integración con Backend](#fase-4-integración-con-backend)
7. [Fase 5: Adaptación del Frontend](#fase-5-adaptación-del-frontend)
8. [Fase 6: Testing y Validación](#fase-6-testing-y-validación)
9. [Fase 7: Optimización y Monitoreo](#fase-7-optimización-y-monitoreo)
10. [Checklist de Implementación](#checklist-de-implementación)

---

## 🎯 Visión General

### Problema Actual

```
Frontend  ────────▶  Backend Auth
  React              Express/Node
```

**Limitaciones:**
- La lógica de validación de sesión está duplicada (frontend + backend)
- No hay un punto centralizado para auditoría de accesos
- Difícil implementar políticas de seguridad complejas
- No hay caché de validaciones de tokens

### Solución Propuesta

```
Frontend  ────▶  MCP Gateway  ────▶  Backend Auth
  React          (Proxy + Auth)       Express/Node
                       │
                       ▼
                  [Cache Redis]
                  [Session Store]
                  [Audit Log]
```

**Beneficios:**
✅ Punto único de validación de autenticación
✅ Caché de tokens para reducir carga en DB
✅ Auditoría centralizada de accesos
✅ Rate limiting por usuario
✅ Políticas de seguridad centralizadas
✅ Soporte para múltiples backends futuros

---

## 🏗️ Arquitectura Propuesta

### Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENTE (Browser)                       │
│                                                             │
│  [React App] ─── localStorage (token) ─── axios/fetch     │
└────────────────────────────┬────────────────────────────────┘
                             │
                    HTTP Request + Bearer Token
                             │
┌────────────────────────────▼────────────────────────────────┐
│                      MCP GATEWAY SERVER                     │
│                     (Puerto 5000)                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  1. Middleware de Autenticación                     │   │
│  │     - Extrae token del header Authorization         │   │
│  │     - Verifica firma JWT                            │   │
│  │     - Valida expiración                             │   │
│  │     - Consulta caché (Redis opcional)               │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  2. Router de Endpoints                             │   │
│  │     - /api/auth/* → Backend Auth                    │   │
│  │     - /api/protected/* → Requiere sesión válida     │   │
│  │     - /api/public/* → Sin autenticación             │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  3. Proxy/Forward                                   │   │
│  │     - Reenvía request al backend correspondiente    │   │
│  │     - Agrega metadata (userId, sessionId)           │   │
│  │     - Logs de auditoría                             │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────┘
                             │
                    HTTP Request (modificado)
                             │
┌────────────────────────────▼────────────────────────────────┐
│                    BACKEND AUTH SERVICE                     │
│                     (Puerto 4000)                           │
│                                                             │
│  [Express API] ─── [PostgreSQL/MySQL] ─── [Email Service]  │
└─────────────────────────────────────────────────────────────┘
```

### Flujo de Datos

#### 1. Login (Sin sesión previa)
```
1. Usuario → Frontend: Ingresa email/password
2. Frontend → MCP Gateway: POST /api/auth/login
3. MCP Gateway → Backend: POST /auth/login (sin validación)
4. Backend → MCP Gateway: { token, user }
5. MCP Gateway → Frontend: { token, user }
6. Frontend: Guarda token en localStorage
```

#### 2. Request Protegido (Con sesión)
```
1. Frontend → MCP Gateway: GET /api/protected/users
   Headers: Authorization: Bearer <token>
   
2. MCP Gateway: 
   a. Extrae y valida token JWT
   b. Verifica expiración
   c. (Opcional) Consulta caché de sesiones
   d. Si válido → continúa
   e. Si inválido → retorna 401
   
3. MCP Gateway → Backend: GET /users
   Headers: 
     Authorization: Bearer <token>
     X-User-Id: <userId extraído del token>
     X-Session-Id: <sessionId>
     
4. Backend → MCP Gateway: Respuesta con datos
5. MCP Gateway → Frontend: Respuesta con datos
```

---

## 📍 Fase 1: Diseño y Planificación

**Duración Estimada:** 1-2 días

### Objetivos
- [ ] Definir alcance del gateway
- [ ] Diseñar estructura de directorios
- [ ] Elegir stack tecnológico
- [ ] Documentar contratos de API

### 1.1 Stack Tecnológico Recomendado

```yaml
MCP Gateway:
  Runtime: Node.js v20+
  Framework: Express.js (familiaridad y compatibilidad)
  Lenguaje: TypeScript
  Validación JWT: jsonwebtoken
  Proxy: http-proxy-middleware
  Cache (opcional): ioredis + Redis
  
Herramientas:
  Testing: Jest + Supertest
  Linting: ESLint
  Logging: Winston
  Monitoring: Morgan (HTTP logs)
```

### 1.2 Estructura de Directorios

```
mcp-gateway/
├── src/
│   ├── config/
│   │   ├── index.ts              # Configuración centralizada
│   │   ├── jwt.config.ts         # Configuración JWT
│   │   └── routes.config.ts      # Mapeo de rutas
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts    # Validación de tokens
│   │   ├── error.middleware.ts   # Manejo de errores
│   │   ├── logger.middleware.ts  # Logging de requests
│   │   └── rateLimit.middleware.ts # Rate limiting
│   │
│   ├── services/
│   │   ├── token.service.ts      # Validación JWT
│   │   ├── proxy.service.ts      # Lógica de proxy
│   │   └── cache.service.ts      # Cache de sesiones (opcional)
│   │
│   ├── routes/
│   │   ├── auth.routes.ts        # Rutas públicas de auth
│   │   ├── protected.routes.ts   # Rutas protegidas
│   │   └── health.routes.ts      # Health checks
│   │
│   ├── types/
│   │   ├── auth.types.ts         # Tipos de autenticación
│   │   └── request.types.ts      # Extensiones de Request
│   │
│   ├── utils/
│   │   ├── logger.ts             # Logger configurado
│   │   └── errors.ts             # Custom errors
│   │
│   ├── app.ts                    # Configuración de Express
│   └── server.ts                 # Entry point
│
├── tests/
│   ├── integration/
│   └── unit/
│
├── .env.example
├── .env
├── package.json
├── tsconfig.json
└── README.md
```

### 1.3 Definición de Puertos

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| Frontend (Vite) | 5173 | Aplicación React |
| **MCP Gateway** | **5000** | **Nuevo gateway** |
| Backend Auth | 4000 | Servicio de autenticación existente |
| Redis (opcional) | 6379 | Caché de sesiones |

### 1.4 Variables de Entorno

**Frontend (.env):**
```env
# Cambiar de apuntar al backend directamente a apuntar al gateway
VITE_API_URL=http://localhost:5000/api
```

**MCP Gateway (.env):**
```env
# Configuración del Gateway
NODE_ENV=development
PORT=5000
GATEWAY_HOST=0.0.0.0

# Backend de autenticación
AUTH_SERVICE_URL=http://localhost:4000

# JWT (debe coincidir con el backend)
JWT_SECRET=tu-secret-compartido-con-backend
JWT_EXPIRES_IN=15h

# CORS
CORS_ORIGIN=http://localhost:5173

# Logging
LOG_LEVEL=debug

# Redis (opcional)
REDIS_ENABLED=false
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutos
RATE_LIMIT_MAX_REQUESTS=100  # 100 requests por ventana
```

---

## 📍 Fase 2: Configuración del MCP Gateway

**Duración Estimada:** 1 día

### 2.1 Inicializar Proyecto

```bash
# Crear directorio del gateway (fuera o dentro del proyecto frontend)
mkdir mcp-gateway
cd mcp-gateway

# Inicializar proyecto Node
npm init -y

# Instalar dependencias
npm install express cors dotenv jsonwebtoken http-proxy-middleware winston morgan
npm install -D typescript @types/node @types/express @types/cors @types/jsonwebtoken ts-node-dev

# Inicializar TypeScript
npx tsc --init
```

### 2.2 Configurar TypeScript

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 2.3 Configurar package.json

**package.json (scripts):**
```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest",
    "lint": "eslint src --ext .ts"
  }
}
```

---

## 📍 Fase 3: Implementación del Gateway

**Duración Estimada:** 2-3 días

### 3.1 Configuración Base

**src/config/index.ts:**
```typescript
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  host: process.env.GATEWAY_HOST || '0.0.0.0',

  // Backend services
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:4000',

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '15h'
  },

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // Redis (opcional)
  redis: {
    enabled: process.env.REDIS_ENABLED === 'true',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined
  },

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
  }
} as const;
```

### 3.2 Tipos de Autenticación

**src/types/auth.types.ts:**
```typescript
import { Request } from 'express';

export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
  sessionId?: string;
}

export interface TokenValidationResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
}
```

### 3.3 Servicio de Validación de Tokens

**src/services/token.service.ts:**
```typescript
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { JWTPayload, TokenValidationResult } from '../types/auth.types';

export class TokenService {
  /**
   * Valida un token JWT
   */
  static validateToken(token: string): TokenValidationResult {
    try {
      const payload = jwt.verify(token, config.jwt.secret) as JWTPayload;

      return {
        valid: true,
        payload
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return {
          valid: false,
          error: 'TOKEN_EXPIRED'
        };
      }

      if (error instanceof jwt.JsonWebTokenError) {
        return {
          valid: false,
          error: 'INVALID_TOKEN'
        };
      }

      return {
        valid: false,
        error: 'TOKEN_VALIDATION_FAILED'
      };
    }
  }

  /**
   * Extrae el token del header Authorization
   */
  static extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader) return null;

    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * Decodifica el token sin validarlo (útil para logs)
   */
  static decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch {
      return null;
    }
  }
}
```

### 3.4 Middleware de Autenticación

**src/middleware/auth.middleware.ts:**
```typescript
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth.types';
import { TokenService } from '../services/token.service';
import { logger } from '../utils/logger';

/**
 * Middleware que valida el token JWT
 * Si es válido, adjunta el payload a req.user
 * Si no, retorna 401
 */
export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const token = TokenService.extractTokenFromHeader(authHeader);

  if (!token) {
    res.status(401).json({
      status: 'error',
      message: 'No authorization token provided',
      code: 'UNAUTHORIZED'
    });
    return;
  }

  const validation = TokenService.validateToken(token);

  if (!validation.valid) {
    logger.warn(`Token validation failed: ${validation.error}`);

    res.status(401).json({
      status: 'error',
      message: validation.error === 'TOKEN_EXPIRED' 
        ? 'Token has expired' 
        : 'Invalid token',
      code: validation.error
    });
    return;
  }

  // Adjuntar usuario al request
  req.user = validation.payload;

  // Generar sessionId único para esta request
  req.sessionId = `${validation.payload?.userId}-${Date.now()}`;

  logger.debug(`User authenticated: ${validation.payload?.email}`);

  next();
};

/**
 * Middleware opcional que valida token pero no falla si no existe
 * Útil para rutas que pueden ser públicas o privadas
 */
export const optionalAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const token = TokenService.extractTokenFromHeader(authHeader);

  if (token) {
    const validation = TokenService.validateToken(token);
    if (validation.valid) {
      req.user = validation.payload;
      req.sessionId = `${validation.payload?.userId}-${Date.now()}`;
    }
  }

  next();
};
```

### 3.5 Servicio de Proxy

**src/services/proxy.service.ts:**
```typescript
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { config } from '../config';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../types/auth.types';

/**
 * Crea un proxy hacia el backend de autenticación
 */
export const createAuthProxy = (pathRewrite?: Record<string, string>) => {
  const proxyOptions: Options = {
    target: config.authServiceUrl,
    changeOrigin: true,
    pathRewrite: pathRewrite || {
      '^/api/auth': '/auth'  // /api/auth/login → /auth/login
    },
    
    // Intercepción de requests
    onProxyReq: (proxyReq, req: AuthenticatedRequest) => {
      // Agregar headers personalizados si hay usuario autenticado
      if (req.user) {
        proxyReq.setHeader('X-User-Id', req.user.userId);
        proxyReq.setHeader('X-User-Email', req.user.email);
        
        if (req.sessionId) {
          proxyReq.setHeader('X-Session-Id', req.sessionId);
        }
      }

      logger.debug(`Proxying request to: ${config.authServiceUrl}${proxyReq.path}`);
    },

    // Intercepción de responses
    onProxyRes: (proxyRes, req) => {
      logger.debug(`Received response from backend: ${proxyRes.statusCode}`);
    },

    // Manejo de errores
    onError: (err, req, res) => {
      logger.error(`Proxy error: ${err.message}`);
      
      if (!res.headersSent) {
        res.status(502).json({
          status: 'error',
          message: 'Backend service unavailable',
          code: 'PROXY_ERROR'
        });
      }
    }
  };

  return createProxyMiddleware(proxyOptions);
};
```

### 3.6 Logger Configurado

**src/utils/logger.ts:**
```typescript
import winston from 'winston';
import { config } from '../config';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level}]: ${message} ${
      Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
    }`;
  })
);

export const logger = winston.createLogger({
  level: config.logLevel,
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: consoleFormat
    }),
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});
```

### 3.7 Middleware de Logging

**src/middleware/logger.middleware.ts:**
```typescript
import morgan from 'morgan';
import { logger } from '../utils/logger';

// Stream para integrar morgan con winston
const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  }
};

// Formato personalizado de morgan
export const httpLogger = morgan(
  ':method :url :status :res[content-length] - :response-time ms',
  { stream }
);
```

### 3.8 Rutas de Autenticación (Públicas)

**src/routes/auth.routes.ts:**
```typescript
import { Router } from 'express';
import { createAuthProxy } from '../services/proxy.service';

export const authRoutes = Router();

/**
 * Rutas públicas de autenticación
 * No requieren token válido, se reenvían directamente al backend
 */

// POST /api/auth/login
// POST /api/auth/check-email
// POST /api/auth/create-password
// POST /api/auth/forgot-password
// POST /api/auth/reset-password
authRoutes.use('/', createAuthProxy({
  '^/api/auth': '/auth'
}));
```

### 3.9 Rutas Protegidas

**src/routes/protected.routes.ts:**
```typescript
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { createAuthProxy } from '../services/proxy.service';

export const protectedRoutes = Router();

/**
 * Todas las rutas protegidas pasan por el middleware de autenticación
 */
protectedRoutes.use(authenticateToken);

/**
 * POST /api/protected/auth/register-email (Solo admin)
 * Cualquier otra ruta protegida futura
 */
protectedRoutes.use('/', createAuthProxy({
  '^/api/protected/auth': '/auth'
}));
```

### 3.10 Health Checks

**src/routes/health.routes.ts:**
```typescript
import { Router, Request, Response } from 'express';
import { config } from '../config';

export const healthRoutes = Router();

/**
 * GET /health
 * Verifica que el gateway esté funcionando
 */
healthRoutes.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'MCP Gateway',
    timestamp: new Date().toISOString(),
    environment: config.env,
    uptime: process.uptime()
  });
});

/**
 * GET /health/backend
 * Verifica conectividad con el backend
 */
healthRoutes.get('/backend', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${config.authServiceUrl}/health`);
    const data = await response.json();

    res.json({
      status: 'connected',
      backend: data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});
```

### 3.11 Aplicación Principal

**src/app.ts:**
```typescript
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config';
import { httpLogger } from './middleware/logger.middleware';
import { authRoutes } from './routes/auth.routes';
import { protectedRoutes } from './routes/protected.routes';
import { healthRoutes } from './routes/health.routes';
import { logger } from './utils/logger';

const app = express();

// ============================================
// MIDDLEWARES GLOBALES
// ============================================

// CORS
app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP logging
app.use(httpLogger);

// ============================================
// RUTAS
// ============================================

// Health checks
app.use('/health', healthRoutes);

// Rutas públicas de autenticación
app.use('/api/auth', authRoutes);

// Rutas protegidas (requieren autenticación)
app.use('/api/protected', protectedRoutes);

// ============================================
// MANEJO DE ERRORES
// ============================================

// 404 - Ruta no encontrada
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
    code: 'NOT_FOUND',
    path: req.path
  });
});

// Error handler global
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });

  res.status(500).json({
    status: 'error',
    message: config.env === 'production' 
      ? 'Internal server error' 
      : err.message,
    code: 'INTERNAL_ERROR'
  });
});

export default app;
```

### 3.12 Servidor

**src/server.ts:**
```typescript
import app from './app';
import { config } from './config';
import { logger } from './utils/logger';

const startServer = () => {
  try {
    app.listen(config.port, config.host, () => {
      logger.info(`🚀 MCP Gateway running on http://${config.host}:${config.port}`);
      logger.info(`📡 Environment: ${config.env}`);
      logger.info(`🔒 Backend Auth Service: ${config.authServiceUrl}`);
      logger.info(`🌐 CORS Origin: ${config.corsOrigin}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();
```

---

## 📍 Fase 4: Integración con Backend

**Duración Estimada:** 1 día

### 4.1 Verificar Compatibilidad

**Checklist:**
- [ ] Backend usa el mismo `JWT_SECRET` que el gateway
- [ ] Backend acepta headers personalizados (`X-User-Id`, etc.)
- [ ] Backend tiene endpoint `/health` para health checks
- [ ] Backend maneja CORS para recibir requests del gateway

### 4.2 Actualizar Backend (si es necesario)

**Backend: Leer headers agregados por el gateway**

```javascript
// En tus rutas del backend (opcional)
app.get('/users', (req, res) => {
  // El gateway ya validó el token
  const userId = req.headers['x-user-id'];
  const userEmail = req.headers['x-user-email'];
  const sessionId = req.headers['x-session-id'];

  console.log(`Request from user ${userId} (${userEmail})`);
  
  // ... tu lógica existente
});
```

### 4.3 Sincronizar Variables de Entorno

Asegurarse de que tanto el backend como el gateway usen:
- Mismo `JWT_SECRET`
- Mismo `JWT_EXPIRES_IN`

---

## 📍 Fase 5: Adaptación del Frontend

**Duración Estimada:** 0.5-1 día

### 5.1 Actualizar Variables de Entorno

**front-mcp/.env:**
```env
# ANTES
# VITE_API_URL=http://localhost:4000

# DESPUÉS
VITE_API_URL=http://localhost:5000/api
```

### 5.2 Actualizar Configuración de API

**src/lib/api.ts:**

```typescript
// Cambiar esta línea:
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Por:
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
```

### 5.3 Actualizar Rutas de AuthService

**src/services/authService.ts:**

Cambiar rutas para incluir prefijo correcto:

```typescript
// ANTES: '/auth/login'
// DESPUÉS: '/auth/login' (el gateway se encarga del prefijo /api)

// O si usas rutas protegidas:
// ANTES: '/auth/register-email'
// DESPUÉS: '/protected/auth/register-email'
```

Ejemplo completo:

```typescript
import { api } from '../lib/api';

export const authService = {
  // Rutas públicas → /api/auth/*
  async login(email: string, password: string) {
    return api.post('/auth/login', { email, password });
  },

  async checkEmail(email: string) {
    return api.post('/auth/check-email', { email });
  },

  async createPassword(token: string, password: string) {
    return api.post('/auth/create-password', { token, password });
  },

  async forgotPassword(email: string) {
    return api.post('/auth/forgot-password', { email });
  },

  async resetPassword(token: string, newPassword: string) {
    return api.post('/auth/reset-password', { token, newPassword });
  },

  // Rutas protegidas → /api/protected/auth/*
  async registerEmail(email: string) {
    // El token se agrega automáticamente en api.post
    return api.post('/protected/auth/register-email', { email });
  }
};
```

### 5.4 NO Cambiar Lógica de Tokens

El frontend **NO** necesita cambios en cómo maneja los tokens:
- Sigue guardando el token en `localStorage`
- Sigue enviando el token en el header `Authorization: Bearer <token>`
- El gateway se encarga de validarlo

---

## 📍 Fase 6: Testing y Validación

**Duración Estimada:** 1-2 días

### 6.1 Tests Unitarios del Gateway

**tests/unit/token.service.test.ts:**
```typescript
import { TokenService } from '../../src/services/token.service';
import jwt from 'jsonwebtoken';

describe('TokenService', () => {
  const secret = 'test-secret';
  const validPayload = { userId: '123', email: 'test@example.com' };

  beforeAll(() => {
    process.env.JWT_SECRET = secret;
  });

  describe('validateToken', () => {
    it('should validate a correct token', () => {
      const token = jwt.sign(validPayload, secret, { expiresIn: '1h' });
      const result = TokenService.validateToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload?.userId).toBe('123');
    });

    it('should reject an expired token', () => {
      const token = jwt.sign(validPayload, secret, { expiresIn: '-1h' });
      const result = TokenService.validateToken(token);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('TOKEN_EXPIRED');
    });

    it('should reject an invalid token', () => {
      const result = TokenService.validateToken('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('INVALID_TOKEN');
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      const token = TokenService.extractTokenFromHeader('Bearer abc123');
      expect(token).toBe('abc123');
    });

    it('should return null for invalid header', () => {
      expect(TokenService.extractTokenFromHeader('abc123')).toBeNull();
      expect(TokenService.extractTokenFromHeader(undefined)).toBeNull();
    });
  });
});
```

### 6.2 Tests de Integración

**tests/integration/auth.routes.test.ts:**
```typescript
import request from 'supertest';
import app from '../../src/app';
import jwt from 'jsonwebtoken';

describe('Auth Routes', () => {
  describe('Public routes', () => {
    it('should allow access to /api/auth/login without token', async () => {
      // Este test requiere que el backend esté corriendo o usar mocks
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      // Depende de la respuesta de tu backend
      expect([200, 401]).toContain(response.status);
    });
  });

  describe('Protected routes', () => {
    it('should reject access without token', async () => {
      const response = await request(app)
        .post('/api/protected/auth/register-email')
        .send({ email: 'new@example.com' });

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('UNAUTHORIZED');
    });

    it('should allow access with valid token', async () => {
      const token = jwt.sign(
        { userId: '123', email: 'admin@example.com' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post('/api/protected/auth/register-email')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'new@example.com' });

      // El backend debe estar corriendo para este test
      expect([200, 201, 403]).toContain(response.status);
    });
  });
});
```

### 6.3 Tests Manuales

**Checklist de Pruebas Manuales:**

```bash
# 1. Iniciar backend
cd backend-auth
npm run dev  # puerto 4000

# 2. Iniciar gateway
cd mcp-gateway
npm run dev  # puerto 5000

# 3. Iniciar frontend
cd front-mcp
npm run dev  # puerto 5173
```

**Escenarios a Probar:**

| # | Escenario | Pasos | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Login exitoso | Email + password correctos | Token guardado, redirect a dashboard |
| 2 | Login fallido | Password incorrecta | Error 401 |
| 3 | Crear contraseña | Acceder con token del email | Contraseña creada |
| 4 | Token expirado | Esperar >15h y hacer request | Error 401, redirect a login |
| 5 | Registrar usuario (admin) | Usar token de admin | Usuario creado |
| 6 | Registrar usuario (no admin) | Usar token de usuario normal | Error 403 |
| 7 | Health check | GET /health | Status: healthy |
| 8 | Backend caído | Apagar backend, hacer request | Error 502 |

### 6.4 Monitoreo de Logs

**Terminal 1 (Backend):**
```
[AUTH] POST /auth/login - 200 - 45ms
```

**Terminal 2 (Gateway):**
```
14:23:45 [info]: 🚀 MCP Gateway running on http://0.0.0.0:5000
14:23:50 [debug]: User authenticated: user@example.com
14:23:50 [debug]: Proxying request to: http://localhost:4000/auth/register-email
14:23:50 [debug]: Received response from backend: 201
```

**Terminal 3 (Frontend):**
```
VITE v7.3.1  ready in 234 ms
➜  Local:   http://localhost:5173/
```

---

## 📍 Fase 7: Optimización y Monitoreo

**Duración Estimada:** 1-2 días (opcional pero recomendado)

### 7.1 Implementar Caché de Sesiones (Opcional)

**Instalar Redis:**
```bash
npm install ioredis
npm install -D @types/ioredis
```

**src/services/cache.service.ts:**
```typescript
import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';
import { JWTPayload } from '../types/auth.types';

class CacheService {
  private client: Redis | null = null;

  constructor() {
    if (config.redis.enabled) {
      this.client = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        }
      });

      this.client.on('connect', () => {
        logger.info('✅ Redis connected');
      });

      this.client.on('error', (err) => {
        logger.error('Redis error:', err);
      });
    }
  }

  /**
   * Guarda la validación de un token en caché
   */
  async setTokenValidation(token: string, payload: JWTPayload, ttl: number = 900): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.setex(
        `token:${token}`,
        ttl,
        JSON.stringify(payload)
      );
    } catch (error) {
      logger.error('Error setting cache:', error);
    }
  }

  /**
   * Obtiene la validación de un token desde caché
   */
  async getTokenValidation(token: string): Promise<JWTPayload | null> {
    if (!this.client) return null;

    try {
      const cached = await this.client.get(`token:${token}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Error getting cache:', error);
      return null;
    }
  }

  /**
   * Invalida un token (logout)
   */
  async invalidateToken(token: string): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.del(`token:${token}`);
    } catch (error) {
      logger.error('Error deleting cache:', error);
    }
  }
}

export const cacheService = new CacheService();
```

**Actualizar auth.middleware.ts para usar caché:**
```typescript
// Antes de validar el token con JWT, consultar caché
const cached = await cacheService.getTokenValidation(token);

if (cached) {
  req.user = cached;
  next();
  return;
}

// Si no está en caché, validar con JWT y guardar en caché
const validation = TokenService.validateToken(token);
if (validation.valid && validation.payload) {
  await cacheService.setTokenValidation(token, validation.payload);
  // ... continuar
}
```

### 7.2 Rate Limiting

**Instalar:**
```bash
npm install express-rate-limit
```

**src/middleware/rateLimit.middleware.ts:**
```typescript
import rateLimit from 'express-rate-limit';
import { config } from '../config';

export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    status: 'error',
    message: 'Too many requests, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos
  message: {
    status: 'error',
    message: 'Too many login attempts, please try again later',
    code: 'LOGIN_RATE_LIMIT_EXCEEDED'
  }
});
```

**Aplicar en app.ts:**
```typescript
import { apiLimiter, authLimiter } from './middleware/rateLimit.middleware';

// Rate limiting global
app.use('/api', apiLimiter);

// Rate limiting específico para login
app.use('/api/auth/login', authLimiter);
```

### 7.3 Métricas y Monitoreo

**Instalar Prometheus (opcional):**
```bash
npm install prom-client
```

**src/utils/metrics.ts:**
```typescript
import { Registry, Counter, Histogram } from 'prom-client';

export const register = new Registry();

// Contador de requests
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register]
});

// Histograma de duración de requests
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  registers: [register]
});

// Contador de validaciones de tokens
export const tokenValidationsTotal = new Counter({
  name: 'token_validations_total',
  help: 'Total number of token validations',
  labelNames: ['result'],
  registers: [register]
});
```

**Endpoint de métricas:**
```typescript
// En app.ts
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### 7.4 Logs Estructurados para Auditoría

**src/utils/audit.ts:**
```typescript
import { logger } from './logger';
import { AuthenticatedRequest } from '../types/auth.types';

interface AuditLog {
  timestamp: string;
  userId?: string;
  email?: string;
  action: string;
  resource: string;
  method: string;
  statusCode: number;
  ip: string;
  userAgent: string;
}

export const logAudit = (
  req: AuthenticatedRequest,
  action: string,
  statusCode: number
): void => {
  const log: AuditLog = {
    timestamp: new Date().toISOString(),
    userId: req.user?.userId,
    email: req.user?.email,
    action,
    resource: req.path,
    method: req.method,
    statusCode,
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: req.get('user-agent') || 'unknown'
  };

  logger.info('AUDIT', log);
};
```

---

## ✅ Checklist de Implementación

### Infraestructura
- [ ] Proyecto `mcp-gateway` creado
- [ ] Dependencias instaladas
- [ ] TypeScript configurado
- [ ] Variables de entorno configuradas

### Gateway Core
- [ ] Configuración centralizada (`config/index.ts`)
- [ ] Tipos definidos (`types/auth.types.ts`)
- [ ] Logger configurado (Winston)
- [ ] Servicio de validación de tokens
- [ ] Middleware de autenticación
- [ ] Servicio de proxy

### Rutas
- [ ] Rutas públicas (`/api/auth/*`)
- [ ] Rutas protegidas (`/api/protected/*`)
- [ ] Health checks (`/health`)

### Frontend
- [ ] Variable `VITE_API_URL` actualizada
- [ ] Rutas de API actualizadas
- [ ] Tests manuales realizados

### Testing
- [ ] Tests unitarios escritos
- [ ] Tests de integración escritos
- [ ] Pruebas manuales completadas

### Optimización (Opcional)
- [ ] Redis configurado para caché
- [ ] Rate limiting implementado
- [ ] Métricas de Prometheus
- [ ] Logs de auditoría

### Documentación
- [ ] README del gateway creado
- [ ] Diagrams de arquitectura
- [ ] Guía de deployment

---

## 📊 Diagrama de Secuencia Final

```
┌─────────┐          ┌─────────────┐          ┌──────────┐
│ Frontend│          │ MCP Gateway │          │  Backend │
└────┬────┘          └──────┬──────┘          └────┬─────┘
     │                      │                      │
     │  POST /api/auth/login │                     │
     │  {email, password}   │                      │
     ├─────────────────────▶│                      │
     │                      │                      │
     │                      │  POST /auth/login    │
     │                      ├─────────────────────▶│
     │                      │                      │
     │                      │  {token, user}       │
     │                      │◀─────────────────────┤
     │                      │                      │
     │  {token, user}       │                      │
     │◀─────────────────────┤                      │
     │                      │                      │
     │ [Guarda token]       │                      │
     │                      │                      │
     │ GET /api/protected/  │                      │
     │    users             │                      │
     │ Authorization:       │                      │
     │    Bearer <token>    │                      │
     ├─────────────────────▶│                      │
     │                      │                      │
     │                      │ [Valida token JWT]   │
     │                      │                      │
     │                      │ GET /users           │
     │                      │ Headers:             │
     │                      │   Authorization: ... │
     │                      │   X-User-Id: 123     │
     │                      ├─────────────────────▶│
     │                      │                      │
     │                      │  {users: [...]}      │
     │                      │◀─────────────────────┤
     │                      │                      │
     │  {users: [...]}      │                      │
     │◀─────────────────────┤                      │
     │                      │                      │
```

---

## 🚀 Inicio Rápido

### Comandos de Desarrollo

```bash
# Terminal 1: Backend (puerto 4000)
cd backend-auth
npm run dev

# Terminal 2: Gateway (puerto 5000)
cd mcp-gateway
npm run dev

# Terminal 3: Frontend (puerto 5173)
cd front-mcp
npm run dev
```

### Variables de Entorno Resumen

| Proyecto | Variable | Valor |
|----------|----------|-------|
| Frontend | `VITE_API_URL` | `http://localhost:5000/api` |
| Gateway | `PORT` | `5000` |
| Gateway | `AUTH_SERVICE_URL` | `http://localhost:4000` |
| Gateway | `JWT_SECRET` | *(mismo del backend)* |
| Backend | `PORT` | `4000` |

---

## 📚 Recursos Adicionales

### Documentación
- [Express.js](https://expressjs.com/)
- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)
- [http-proxy-middleware](https://github.com/chimurai/http-proxy-middleware)
- [Winston Logger](https://github.com/winstonjs/winston)

### Próximos Pasos
1. Implementar refresh tokens
2. Agregar WebSocket support
3. Multi-tenancy
4. Integrar con servicios de terceros (OAuth)

---

*Plan creado el 13 de marzo de 2026*
*Basado en: GUIA_INTEGRACION_FRONTEND.md*
