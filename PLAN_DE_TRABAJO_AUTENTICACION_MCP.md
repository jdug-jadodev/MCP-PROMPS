# ðŸ” Plan de Trabajo: Middleware de AutenticaciÃ³n para MCP Server

**Proyecto:** MCP Prompts Server  
**Objetivo:** Proteger endpoints MCP validando tokens JWT del backend de autenticaciÃ³n existente  
**Fecha Inicio:** 15 de marzo de 2026  
**DuraciÃ³n Estimada:** 3-4 horas  
**Arquitectura:** Middleware simple de validaciÃ³n JWT

---

## ðŸ“‹ Contexto

**Sistema Existente:**
- âœ… Frontend con login/registro
- âœ… Backend de autenticaciÃ³n que genera tokens JWT
- âœ… Servidor MCP (sin protecciÃ³n)

**Lo que vamos a hacer:**
- âœ… Agregar middleware que valide tokens JWT
- âœ… Proteger endpoint `/mcp` 
- âœ… Mantener `/health` pÃºblico

**Lo que NO vamos a hacer:**
- âŒ Crear sistema de usuarios
- âŒ Crear endpoints de login/registro
- âŒ Crear base de datos

---

## ðŸ“‹ Tabla de Contenidos

1. [Arquitectura Propuesta](#arquitectura-propuesta)
2. [Tarea 1: Instalar Dependencias](#tarea-1-instalar-dependencias)
3. [Tarea 2: Configurar Variables de Entorno](#tarea-2-configurar-variables-de-entorno)
4. [Tarea 3: Crear Tipos TypeScript](#tarea-3-crear-tipos-typescript)
5. [Tarea 4: Crear Middleware de AutenticaciÃ³n](#tarea-4-crear-middleware-de-autenticaciÃ³n)
6. [Tarea 5: Crear Middleware de Errores](#tarea-5-crear-middleware-de-errores)
7. [Tarea 6: Proteger Endpoint /mcp](#tarea-6-proteger-endpoint-mcp)
8. [Tarea 7: Testing](#tarea-7-testing)
9. [Tarea 8: DocumentaciÃ³n](#tarea-8-documentaciÃ³n)

---

## ðŸ” AnÃ¡lisis del Proyecto Actual

### Endpoints Actuales
- **POST /mcp** â†’ âŒ Sin protecciÃ³n
- **GET /health** â†’ PÃºblico (OK)

### Lo que necesitas
- Middleware que valide JWT
- Proteger `/mcp`
- Mantener `/health` pÃºblico

---

## ðŸ—ï¸ Arquitectura Propuesta

### Flujo Actual (Sin AutenticaciÃ³n)
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”       â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Frontend â”‚â”€â”€â”€â”€â”€â”€â–¶â”‚  MCP Server  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜       â”‚   (puerto    â”‚
                   â”‚    3000)     â”‚
                   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### Flujo Nuevo (Con ValidaciÃ³n JWT)
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  1. Login  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Frontend â”‚â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¶â”‚ Backend Auth    â”‚
â”‚          â”‚            â”‚  (puerto 4000)  â”‚
â”‚          â”‚â—€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”‚  Genera JWT     â”‚
â””â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”˜  2. Token  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
     â”‚
     â”‚ 3. Request con token
     â”‚ Authorization: Bearer <jwt>
     â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚         MCP Server (puerto 3000)       â”‚
â”‚                                        â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”‚
â”‚  â”‚  Middleware Auth             â”‚     â”‚
â”‚  â”‚  1. Extrae token             â”‚     â”‚
â”‚  â”‚  2. Valida JWT               â”‚     â”‚
â”‚  â”‚  3. Verifica firma           â”‚     â”‚
â”‚  â”‚  4. Verifica expiraciÃ³n      â”‚     â”‚
â”‚  â”‚  5. Si vÃ¡lido â†’ next()       â”‚     â”‚
â”‚  â”‚  6. Si no â†’ 401             â”‚     â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â”‚
â”‚               â–¼                        â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”‚
â”‚  â”‚  Endpoint /mcp               â”‚     â”‚
â”‚  â”‚  (protegido)                 â”‚     â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Puntos clave:**
- Frontend ya tiene el token JWT (lo obtiene del backend auth)
- MCP Server solo **valida** el token (no lo genera)
- Usamos el mismo `JWT_SECRET` que el backend auth
- Sin base de datos en MCP Server

---

## âœ… Tarea 1: Instalar Dependencias

**DuraciÃ³n:** 5 minutos

### 1.1 Instalar paquetes necesarios

```bash
npm install jsonwebtoken dotenv cors
npm install -D @types/jsonwebtoken @types/cors
```

**Â¿Por quÃ© estos paquetes?**
- `jsonwebtoken` - Validar tokens JWT
- `dotenv` - Variables de entorno
- `cors` - Configurar CORS correctamente

**Checklist:**
- [ ] Ejecutar npm install
- [ ] Verificar package.json actualizado

---

## âœ… Tarea 2: Configurar Variables de Entorno

**DuraciÃ³n:** 10 minutos

### 2.1 Crear archivo .env

**Archivo:** `.env`
```env
# Servidor
NODE_ENV=development
PORT=3000

# JWT (DEBE SER EL MISMO que usa tu backend de autenticaciÃ³n)
JWT_SECRET=el-mismo-secret-que-tu-backend-auth

# CORS (dominio de tu frontend)
CORS_ORIGIN=http://localhost:5173
```

### 2.2 Crear archivo .env.example

**Archivo:** `.env.example`
```env
NODE_ENV=development
PORT=3000
JWT_SECRET=cambiar-por-el-secreto-del-backend
CORS_ORIGIN=http://localhost:5173
```

### 2.3 Actualizar .gitignore

**Archivo:** `.gitignore`
```gitignore
# Archivos existentes...
node_modules/
dist/

# Agregar
.env
*.log
```

**âš ï¸ CRÃTICO:** El `JWT_SECRET` debe ser **exactamente el mismo** que usa tu backend de autenticaciÃ³n.

**Checklist:**
- [ ] Crear .env con el JWT_SECRET correcto
- [ ] Crear .env.example
- [ ] Actualizar .gitignore
- [ ] Verificar que .env NO se commitea

---

## âœ… Tarea 3: Crear Tipos TypeScript

**DuraciÃ³n:** 10 minutos

### 3.1 Crear carpeta de tipos

```bash
mkdir -p src/types
```

### 3.2 Crear tipos de autenticaciÃ³n

**Archivo:** `src/types/auth.types.ts`
```typescript
import { Request } from 'express';

/**
 * Payload del JWT (debe coincidir con lo que genera tu backend)
 */
export interface JWTPayload {
  userId: string;
  email: string;
  role?: string;
  iat?: number;  // Issued at
  exp?: number;  // Expiration
}

/**
 * Request extendido con usuario autenticado
 */
export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

/**
 * Resultado de validaciÃ³n de token
 */
export interface TokenValidationResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
}
```

**ðŸ“ Nota:** Ajusta `JWTPayload` para que coincida con la estructura exacta que genera tu backend. Si tu backend incluye otros campos (ej: `username`, `permissions`), agrÃ©galos aquÃ­.

**Checklist:**
- [ ] Crear carpeta src/types
- [ ] Crear auth.types.ts
- [ ] Ajustar JWTPayload segÃºn tu backend

---

## âœ… Tarea 4: Crear Middleware de AutenticaciÃ³n

**DuraciÃ³n:** 30 minutos

### 4.1 Crear carpeta de middleware

```bash
mkdir -p src/middleware
```

### 4.2 Crear middleware de autenticaciÃ³n

**Archivo:** `src/middleware/auth.middleware.ts`
```typescript
import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, JWTPayload } from '../types/auth.types';

/**
 * Middleware que valida el token JWT
 */
export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    // 1. Extraer token del header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({
        status: 'error',
        code: 'NO_TOKEN',
        message: 'No se proporcionÃ³ token de autenticaciÃ³n'
      });
      return;
    }

    // Formato esperado: "Bearer <token>"
    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        status: 'error',
        code: 'INVALID_TOKEN_FORMAT',
        message: 'Formato de token invÃ¡lido. Use: Bearer <token>'
      });
      return;
    }

    const token = parts[1];

    // 2. Validar token con el secret
    const JWT_SECRET = process.env.JWT_SECRET;
    
    if (!JWT_SECRET) {
      console.error('âŒ JWT_SECRET no estÃ¡ configurado en .env');
      res.status(500).json({
        status: 'error',
        code: 'SERVER_CONFIG_ERROR',
        message: 'Error de configuraciÃ³n del servidor'
      });
      return;
    }

    // 3. Verificar firma y expiraciÃ³n
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;

    // 4. Adjuntar payload al request
    req.user = payload;

    // 5. Continuar con el siguiente middleware
    next();

  } catch (error) {
    // Manejar errores de JWT
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        status: 'error',
        code: 'TOKEN_EXPIRED',
        message: 'El token ha expirado'
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        status: 'error',
        code: 'INVALID_TOKEN',
        message: 'Token invÃ¡lido'
      });
      return;
    }

    // Error genÃ©rico
    console.error('Error validando token:', error);
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Error al validar token'
    });
  }
};

/**
 * Middleware opcional para rutas que pueden ser pÃºblicas o privadas
 */
export const optionalAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    const parts = authHeader.split(' ');
    
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const token = parts[1];
      const JWT_SECRET = process.env.JWT_SECRET;
      
      if (JWT_SECRET) {
        try {
          const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
          req.user = payload;
        } catch (error) {
          // Si el token es invÃ¡lido, simplemente no adjuntamos user
          // pero dejamos que la request continÃºe
        }
      }
    }
  }
  
  next();
};
```

**Checklist:**
- [ ] Crear src/middleware/auth.middleware.ts
- [ ] Implementar authenticateToken()
- [ ] Implementar optionalAuth() (opcional)
- [ ] Manejar errores de token expirado
- [ ] Manejar errores de token invÃ¡lido

---

## âœ… Tarea 5: Crear Middleware de Errores

**DuraciÃ³n:** 15 minutos

### 5.1 Crear middleware de error global

**Archivo:** `src/middleware/error.middleware.ts`
```typescript
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware para rutas no encontradas (404)
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.status(404).json({
    status: 'error',
    code: 'NOT_FOUND',
    message: 'Ruta no encontrada',
    path: req.path
  });
};

/**
 * Middleware de error global
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', err);

  const isDevelopment = process.env.NODE_ENV !== 'production';

  res.status(500).json({
    status: 'error',
    code: 'INTERNAL_ERROR',
    message: isDevelopment ? err.message : 'Error interno del servidor',
    ...(isDevelopment && { stack: err.stack })
  });
};
```

**Checklist:**
- [ ] Crear src/middleware/error.middleware.ts
- [ ] Implementar notFoundHandler()
- [ ] Implementar errorHandler()

---

## âœ… Tarea 6: Proteger Endpoint /mcp

**DuraciÃ³n:** 30 minutos

### 6.1 Modificar server-http.ts

**Archivo:** `src/server-http.ts`

Agregar las siguientes modificaciones:

#### 6.1.1 Importar dependencias al inicio del archivo

```typescript
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import './scripts/keepalive';
import { tools } from './tools';
import path from 'path';
import fs from 'fs';

// Importar middleware de autenticaciÃ³n
import { authenticateToken } from './middleware/auth.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { AuthenticatedRequest } from './types/auth.types';

// Cargar variables de entorno
dotenv.config();

const app = express();
```

#### 6.1.2 Configurar CORS despuÃ©s de crear app

```typescript
// Configurar CORS
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: corsOrigin,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
```

#### 6.1.3 Proteger el endpoint /mcp

Busca la lÃ­nea donde defines el endpoint `/mcp` y cÃ¡mbiala de:

```typescript
// ANTES
app.post('/mcp', async (req: Request, res: Response) => {
```

A:

```typescript
// DESPUÃ‰S
app.post('/mcp', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
```

#### 6.1.4 (Opcional) Agregar logging de usuario

Dentro del handler de `/mcp`, puedes agregar:

```typescript
app.post('/mcp', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const message = req.body;
  
  // Log del usuario autenticado
  console.log(`ðŸ“¨ Request MCP de usuario: ${req.user?.email || req.user?.userId}`);
  console.log(`   MÃ©todo: ${message.method}`);
  
  // ... resto del cÃ³digo existente
});
```

#### 6.1.5 Agregar middlewares de error al final

Antes de `app.listen()`, agrega:

```typescript
// Middlewares de error (deben ir al final)
app.use(notFoundHandler);
app.use(errorHandler);

// Tu cÃ³digo de app.listen() existente
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`ðŸš€ MCP Server running on http://localhost:${PORT}`);
  console.log(`ðŸ”’ Authentication: ENABLED`);
  console.log(`ðŸŒ CORS Origin: ${corsOrigin}`);
});
```

### 6.2 CÃ³digo completo de ejemplo

Para referencia, asÃ­ deberÃ­a verse la estructura general:

```typescript
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import './scripts/keepalive';
import { tools } from './tools';
import path from 'path';
import fs from 'fs';
import { authenticateToken } from './middleware/auth.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { AuthenticatedRequest } from './types/auth.types';

dotenv.config();

const app = express();

// CORS
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: corsOrigin, credentials: true }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ... tu cÃ³digo de hot reload existente ...

// Health check (pÃºblico)
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'MCP Prompts Server',
    timestamp: new Date().toISOString(),
    authentication: 'enabled'
  });
});

// Endpoint MCP (PROTEGIDO)
app.post('/mcp', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const message = req.body;
  
  console.log(`ðŸ“¨ Usuario: ${req.user?.email}, MÃ©todo: ${message.method}`);
  
  // ... tu lÃ³gica MCP existente ...
});

// Middlewares de error
app.use(notFoundHandler);
app.use(errorHandler);

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`ðŸš€ MCP Server running on http://localhost:${PORT}`);
  console.log(`ðŸ”’ Authentication: ENABLED`);
});

export default app;
```

**Checklist:**
- [ ] Importar dotenv y cargar .env
- [ ] Importar middleware de autenticaciÃ³n
- [ ] Configurar CORS
- [ ] Proteger POST /mcp con authenticateToken
- [ ] Mantener GET /health pÃºblico
- [ ] Agregar middlewares de error al final
- [ ] Verificar que compila sin errores

---

## âœ… Tarea 7: Testing

**DuraciÃ³n:** 30 minutos

### 7.1 Compilar y ejecutar

```bash
# Compilar
npm run build

# Ejecutar
npm start

# O en desarrollo
npm run dev
```

### 7.2 Pruebas con cURL o Postman

#### Test 1: Health check (debe funcionar sin token)
```bash
curl http://localhost:3000/health
```

**Esperado:** 200 OK
```json
{
  "status": "healthy",
  "service": "MCP Prompts Server",
  "timestamp": "2026-03-15T...",
  "authentication": "enabled"
}
```

#### Test 2: Acceso a /mcp SIN token (debe fallar)
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize"
  }'
```

**Esperado:** 401 Unauthorized
```json
{
  "status": "error",
  "code": "NO_TOKEN",
  "message": "No se proporcionÃ³ token de autenticaciÃ³n"
}
```

#### Test 3: Acceso a /mcp CON token vÃ¡lido

Primero, obtÃ©n un token de tu backend de autenticaciÃ³n:

```bash
# Hacer login en tu backend (ajustar URL y credenciales)
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tu-email@example.com",
    "password": "tu-password"
  }'
```

Copia el token de la respuesta y Ãºsalo:

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize"
  }'
```

**Esperado:** 200 OK con la respuesta MCP normal

#### Test 4: Token expirado
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token_expirado" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize"
  }'
```

**Esperado:** 401 con cÃ³digo `TOKEN_EXPIRED`

#### Test 5: Token invÃ¡lido
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token_invalido_123" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize"
  }'
```

**Esperado:** 401 con cÃ³digo `INVALID_TOKEN`

### 7.3 Matriz de pruebas

| Test | Endpoint | Token | Resultado Esperado | Estado |
|------|----------|-------|-------------------|--------|
| 1 | GET /health | Sin token | 200 OK | [ ] |
| 2 | POST /mcp | Sin token | 401 NO_TOKEN | [ ] |
| 3 | POST /mcp | Token vÃ¡lido | 200 OK + respuesta MCP | [ ] |
| 4 | POST /mcp | Token expirado | 401 TOKEN_EXPIRED | [ ] |
| 5 | POST /mcp | Token invÃ¡lido | 401 INVALID_TOKEN | [ ] |
| 6 | POST /mcp | Formato incorrecto | 401 INVALID_TOKEN_FORMAT | [ ] |

**Checklist:**
- [ ] Todos los tests pasan
- [ ] Logs muestran usuario autenticado
- [ ] CORS funciona correctamente
- [ ] Frontend puede conectarse exitosamente

---

## âœ… Tarea 8: DocumentaciÃ³n

**DuraciÃ³n:** 15 minutos

### 8.1 Actualizar README.md

Agregar secciÃ³n de autenticaciÃ³n:

```markdown
## ðŸ” AutenticaciÃ³n

Este servidor requiere autenticaciÃ³n JWT para acceder al endpoint `/mcp`.

### Flujo de AutenticaciÃ³n

1. **ObtÃ©n un token JWT** de tu backend de autenticaciÃ³n
2. **Incluye el token** en el header Authorization de tus requests:
   ```
   Authorization: Bearer <tu-token-jwt>
   ```

### Endpoints

| Endpoint | AutenticaciÃ³n | DescripciÃ³n |
|----------|---------------|-------------|
| `GET /health` | âŒ PÃºblico | Health check |
| `POST /mcp` | âœ… Requerida | Protocolo MCP |

### ConfiguraciÃ³n

Variables de entorno requeridas (`.env`):

```env
JWT_SECRET=el-mismo-secreto-que-tu-backend-auth
CORS_ORIGIN=http://localhost:5173
PORT=3000
```

âš ï¸ **Importante:** El `JWT_SECRET` debe ser **exactamente el mismo** que usa tu backend de autenticaciÃ³n.

### Errores de AutenticaciÃ³n

| CÃ³digo | DescripciÃ³n |
|--------|-------------|
| `NO_TOKEN` | No se proporcionÃ³ token |
| `INVALID_TOKEN_FORMAT` | Formato incorrecto (debe ser `Bearer <token>`) |
| `TOKEN_EXPIRED` | Token expirado |
| `INVALID_TOKEN` | Token invÃ¡lido o firma incorrecta |
```

### 8.2 Crear guÃ­a de integraciÃ³n

**Archivo:** `INTEGRACION_FRONTEND.md`

```markdown
# GuÃ­a de IntegraciÃ³n Frontend

## Requisitos

Tu frontend debe tener almacenado el token JWT (tÃ­picamente en localStorage o sessionStorage).

## Ejemplo de integraciÃ³n

### JavaScript Vanilla

```javascript
const token = localStorage.getItem('authToken');

fetch('http://localhost:3000/mcp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'prompts/list'
  })
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

### Axios

```javascript
import axios from 'axios';

const token = localStorage.getItem('authToken');

const api = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para agregar token automÃ¡ticamente
api.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Uso
api.post('/mcp', {
  jsonrpc: '2.0',
  id: 1,
  method: 'prompts/list'
})
  .then(response => console.log(response.data))
  .catch(error => {
    if (error.response?.status === 401) {
      // Token expirado o invÃ¡lido - redirigir a login
      window.location.href = '/login';
    }
  });
```

### React Hook personalizado

```typescript
// hooks/useMCP.ts
import { useState, useEffect } from 'react';
import axios from 'axios';

interface MCPRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: any;
}

export const useMCP = () => {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    setToken(storedToken);
  }, []);

  const callMCP = async (request: MCPRequest) => {
    if (!token) {
      throw new Error('No hay token de autenticaciÃ³n');
    }

    const response = await axios.post('http://localhost:3000/mcp', request, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return response.data;
  };

  return { callMCP };
};

// Uso
function MyComponent() {
  const { callMCP } = useMCP();

  const listPrompts = async () => {
    try {
      const response = await callMCP({
        jsonrpc: '2.0',
        id: 1,
        method: 'prompts/list'
      });
      console.log(response);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return <button onClick={listPrompts}>Listar Prompts</button>;
}
```

## Manejo de Errores

### Token Expirado

Cuando el token expira, recibirÃ¡s un error 401:

```javascript
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Limpiar token y redirigir a login
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

## CORS

Si tienes problemas de CORS, verifica que:
1. El servidor MCP tenga configurado `CORS_ORIGIN` correctamente
2. EstÃ©s usando `credentials: true` si envÃ­as cookies
```

**Checklist:**
- [ ] Actualizar README.md
- [ ] Crear INTEGRACION_FRONTEND.md
- [ ] Documentar variables de entorno
- [ ] Documentar cÃ³digos de error

---

## ðŸŽ¯ Resumen y Checklist Final

### Archivos Creados/Modificados

**Nuevos:**
- [ ] `src/types/auth.types.ts`
- [ ] `src/middleware/auth.middleware.ts`
- [ ] `src/middleware/error.middleware.ts`
- [ ] `.env`
- [ ] `.env.example`
- [ ] `INTEGRACION_FRONTEND.md`

**Modificados:**
- [ ] `src/server-http.ts`
- [ ] `.gitignore`
- [ ] `README.md`
- [ ] `package.json` (dependencias)

### ConfiguraciÃ³n

- [ ] JWT_SECRET configurado (igual al backend)
- [ ] CORS_ORIGIN configurado
- [ ] .env.example creado
- [ ] .env en .gitignore

### Testing

- [ ] CompilaciÃ³n exitosa
- [ ] Servidor inicia correctamente
- [ ] /health funciona sin token
- [ ] /mcp rechaza requests sin token
- [ ] /mcp acepta requests con token vÃ¡lido
- [ ] Manejo correcto de token expirado
- [ ] Manejo correcto de token invÃ¡lido

### DocumentaciÃ³n

- [ ] README actualizado
- [ ] GuÃ­a de integraciÃ³n creada
- [ ] Ejemplos de cÃ³digo para frontend

---

## ðŸ“Š Diagrama de Arquitectura Final

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                     FRONTEND (React/Vue)                    â”‚
â”‚                                                             â”‚
â”‚  1. Usuario hace login en frontend                         â”‚
â”‚  2. Frontend llama a Backend Auth                          â”‚
â”‚  3. Backend Auth retorna JWT token                         â”‚
â”‚  4. Frontend guarda token en localStorage                  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                     â”‚
                     â”‚ Token guardado
                     â”‚
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                                                             â”‚
â”‚  Requests a MCP Server con:                                â”‚
â”‚  Authorization: Bearer <token>                             â”‚
â”‚                                                             â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                     â”‚
                     â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚               MCP SERVER (Puerto 3000)                      â”‚
â”‚                                                             â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”‚
â”‚  â”‚ Express Middlewares                                â”‚    â”‚
â”‚  â”‚ 1. CORS                                            â”‚    â”‚
â”‚  â”‚ 2. Body Parser                                     â”‚    â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â”‚
â”‚                          â”‚                                  â”‚
â”‚                          â–¼                                  â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”‚
â”‚  â”‚ Router                                             â”‚    â”‚
â”‚  â”‚ - /health â†’ Sin Auth (pÃºblico)                     â”‚    â”‚
â”‚  â”‚ - /mcp â†’ Con Auth (protegido)                      â”‚    â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â”‚
â”‚                          â”‚                                  â”‚
â”‚                          â–¼ (solo para /mcp)                â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”‚
â”‚  â”‚ authenticateToken Middleware                       â”‚    â”‚
â”‚  â”‚                                                    â”‚    â”‚
â”‚  â”‚ 1. Extraer token del header Authorization         â”‚    â”‚
â”‚  â”‚ 2. Verificar formato: Bearer <token>              â”‚    â”‚
â”‚  â”‚ 3. jwt.verify(token, JWT_SECRET)                  â”‚    â”‚
â”‚  â”‚ 4. Si vÃ¡lido: req.user = payload y next()         â”‚    â”‚
â”‚  â”‚ 5. Si no: return 401                              â”‚    â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â”‚
â”‚                          â”‚                                  â”‚
â”‚                          â–¼                                  â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”‚
â”‚  â”‚ MCP Protocol Handler                               â”‚    â”‚
â”‚  â”‚ - initialize                                       â”‚    â”‚
â”‚  â”‚ - prompts/list                                     â”‚    â”‚
â”‚  â”‚ - prompts/get                                      â”‚    â”‚
â”‚  â”‚ - tools/list                                       â”‚    â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚          BACKEND AUTH (Puerto 4000 - Existente)            â”‚
â”‚                                                             â”‚
â”‚  - POST /auth/login â†’ Genera JWT                           â”‚
â”‚  - POST /auth/register                                     â”‚
â”‚  - Usa mismo JWT_SECRET                                    â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## ðŸš€ Comandos RÃ¡pidos

```bash
# 1. Instalar dependencias
npm install jsonwebtoken dotenv cors
npm install -D @types/jsonwebtoken @types/cors

# 2. Crear archivos de configuraciÃ³n
touch .env .env.example

# 3. Crear estructura de carpetas
mkdir -p src/types src/middleware

# 4. Compilar
npm run build

# 5. Ejecutar
npm start

# 6. Desarrollo con hot reload
npm run dev
```

---

## â“ Troubleshooting

### Error: "JWT_SECRET no estÃ¡ configurado"
- Verificar que `.env` existe y tiene `JWT_SECRET`
- Verificar que estÃ¡s cargando dotenv: `dotenv.config()`

### Error: "Token invÃ¡lido" con token que sÃ­ funciona en backend
- **Causa mÃ¡s comÃºn:** JWT_SECRET diferente entre backend y MCP server
- **SoluciÃ³n:** Copiar exactamente el mismo JWT_SECRET del backend

### CORS Error
- Verificar `CORS_ORIGIN` en `.env`
- Verificar que coincide con el dominio de tu frontend
- Usar `credentials: true` en configuraciÃ³n CORS

### Token vÃ¡lido pero sigue dando 401
- Verificar que el header sea exactamente: `Authorization: Bearer <token>`
- Verificar que no hay espacios extra
- Verificar que el token no haya expirado

---

**Plan creado el 15 de marzo de 2026**  
**Para:** IntegraciÃ³n simple de middleware de autenticaciÃ³n JWT  
**DuraciÃ³n total:** 3-4 horas
