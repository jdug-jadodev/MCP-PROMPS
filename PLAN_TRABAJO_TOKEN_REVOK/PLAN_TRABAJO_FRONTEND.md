# 🎨 Plan de Trabajo: Frontend - Implementación de Logout con Revocación Dual

**Fecha:** 17 de marzo de 2026  
**Equipo:** Frontend React  
**Repositorio:** front-mcp  
**URL Producción:** https://front-mcp-gules.vercel.app

---

## 📋 Resumen Ejecutivo

### Tu Rol en el Sistema

El **Frontend** es la aplicación React que:
- Gestiona el login/logout de usuarios
- Almacena tokens del Backend de Login (JWT con jti)
- Almacena tokens del MCP Server (OAuth access_token)
- **Actualmente NO revoca tokens al hacer logout** ❌

### Objetivo

Implementar logout completo que:
- Revoque el JWT en el Backend de Login (ya tiene sistema)
- Revoque el access_token en el MCP Server (nuevo endpoint)
- Limpie todo el almacenamiento local
- Invalide inmediatamente el acceso de VSCode

### Dependencias

| Dependencia | Estado | Notas |
|-------------|--------|-------|
| Backend Login | ✅ Ya tiene `/auth/logout` | Solo llamar al endpoint |
| MCP Server | 🔶 Implementando `/oauth/revoke` | Coordinarse con ellos |

---

## 🏗️ Arquitectura Actual (Análisis)

### Archivos Clave

```
src/
├── services/
│   └── authService.ts          # API calls - MODIFICAR
├── lib/
│   └── api.ts                  # Cliente HTTP + tokens - REVISAR
├── pages/
│   └── Dashboard.tsx           # Botón logout - MODIFICAR
└── hooks/
    └── useAuth.ts              # (si existe) - MODIFICAR
```

### Estado Actual del Logout

```typescript
// Dashboard.tsx - CÓDIGO ACTUAL
const handleLogout = () => {
  clearAuth();        // Solo limpia localStorage
  navigate('/login'); // Redirige
}
```

**Problemas:**
1. ❌ No revoca JWT en Backend de Login
2. ❌ No revoca access_token en MCP Server
3. ❌ VSCode mantiene acceso después del logout

---

## ⏱️ Cronograma

| Fase | Duración | Prioridad |
|------|----------|-----------|
| FASE 1: Servicio de Revocación | 1 hora | 🔴 CRÍTICA |
| FASE 2: Logout Dual | 1.5 horas | 🔴 CRÍTICA |
| FASE 3: UX y Feedback | 30 min | 🟠 ALTA |
| FASE 4: Testing | 1 hora | 🟠 ALTA |
| **TOTAL** | **4 horas** | |

---

## FASE 1: Implementar Servicios de Revocación

**Duración:** 1 hora  
**Archivo:** `src/services/authService.ts`

### 1.1. Añadir Constantes de URLs

**Ubicación:** Al inicio del archivo, con las otras constantes

```typescript
// URLs de los backends
const AUTH_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const MCP_BASE_URL = import.meta.env.VITE_MCP_URL || 'https://mcp-promps.onrender.com';
```

### 1.2. Actualizar archivo .env

**Archivo:** `.env`

```env
# Backend de autenticación
VITE_API_URL=https://loggin-mcp.onrender.com

# MCP Server
VITE_MCP_URL=https://mcp-promps.onrender.com

# OAuth callback (ya existente)
VITE_MCP_CALLBACK=https://mcp-promps.onrender.com/oauth/callback
```

### 1.3. Añadir Método logout (Backend de Login)

**Ubicación:** Dentro del objeto `authService`

```typescript
export const authService = {
  // ... métodos existentes (login, register, etc.) ...
  
  /**
   * Logout del Backend de Login
   * Revoca el JWT del usuario registrando su jti en la blacklist
   * 
   * @param token - El JWT a revocar
   * @returns Promise con el resultado
   */
  async logout(token: string): Promise<{ status: 'success' } | { status: 'error'; message: string }> {
    try {
      console.log('🔐 Revocando JWT en Backend de Login...');
      
      const response = await fetch(`${AUTH_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        console.log('✅ JWT revocado en Backend de Login');
        return { status: 'success' };
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Error revocando JWT:', errorData);
        return {
          status: 'error',
          message: errorData.message || 'Error al revocar token'
        };
      }
    } catch (error) {
      console.error('❌ Error de red revocando JWT:', error);
      return {
        status: 'error',
        message: 'Error de red al cerrar sesión'
      };
    }
  },
```

### 1.4. Añadir Método revokeMCPToken

**Ubicación:** Dentro del objeto `authService`, después de `logout`

```typescript
  /**
   * Revocar access_token de MCP Server
   * Esto invalidará el acceso de VSCode al MCP
   * 
   * @param mcpAccessToken - El access_token OAuth a revocar
   * @returns Promise con el resultado
   */
  async revokeMCPToken(mcpAccessToken: string): Promise<{ status: 'success' } | { status: 'error'; message: string }> {
    try {
      console.log('🔐 Revocando access_token en MCP Server...');
      
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
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Error revocando token de MCP:', errorData);
        return {
          status: 'error',
          message: errorData.message || 'Error al revocar token de MCP'
        };
      }
    } catch (error) {
      console.error('❌ Error de red revocando token de MCP:', error);
      return {
        status: 'error',
        message: 'Error de red al revocar token de MCP'
      };
    }
  },

  /**
   * Revocar refresh_token de MCP Server (si existe)
   * 
   * @param mcpRefreshToken - El refresh_token a revocar
   * @param mcpAccessToken - Access token para autenticación
   */
  async revokeMCPRefreshToken(
    mcpRefreshToken: string, 
    mcpAccessToken: string
  ): Promise<{ status: 'success' } | { status: 'error'; message: string }> {
    try {
      console.log('🔐 Revocando refresh_token en MCP Server...');
      
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
        message: 'Error de red'
      };
    }
  },
  
  // ... resto de métodos existentes ...
}
```

### ✅ Checklist FASE 1

- [ ] Constantes `AUTH_BASE_URL` y `MCP_BASE_URL` añadidas
- [ ] Archivo `.env` actualizado con URLs
- [ ] Método `logout()` implementado
- [ ] Método `revokeMCPToken()` implementado
- [ ] Método `revokeMCPRefreshToken()` implementado
- [ ] Compilación sin errores (`npm run build`)

---

## FASE 2: Implementar Logout Dual

**Duración:** 1.5 horas  
**Archivo:** `src/pages/Dashboard.tsx` (o donde esté el botón de logout)

### 2.1. Añadir Imports

**Ubicación:** Al inicio del archivo

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { clearAuth, getToken } from '../lib/api';
```

### 2.2. Añadir Estado de Loading

**Ubicación:** Dentro del componente, al inicio

```typescript
const [isLoggingOut, setIsLoggingOut] = useState(false);
```

### 2.3. Implementar Función de Logout Completo

**Ubicación:** Reemplazar la función `handleLogout` existente

```typescript
/**
 * Logout completo: revoca tokens en AMBOS sistemas
 * 1. Backend de Login (Loggin-MCP) - revoca JWT
 * 2. MCP Server - revoca access_token OAuth
 * 
 * Al completar, VSCode pierde acceso al MCP inmediatamente.
 */
const handleLogout = async () => {
  setIsLoggingOut(true);
  
  console.log('🚪 ===== INICIANDO LOGOUT COMPLETO =====');
  
  // 1. Obtener todos los tokens almacenados
  const loginToken = localStorage.getItem('authToken');
  const mcpAccessToken = localStorage.getItem('mcp_access_token');
  const mcpRefreshToken = localStorage.getItem('mcp_refresh_token');
  
  let loginRevoked = false;
  let mcpRevoked = false;
  
  // 2. Revocar JWT del Backend de Login
  if (loginToken) {
    try {
      console.log('📡 Paso 1/3: Revocando JWT en Backend de Login...');
      const result = await withTimeout(
        authService.logout(loginToken),
        5000 // 5 segundos de timeout
      );
      
      if (result.status === 'success') {
        console.log('✅ JWT revocado correctamente');
        loginRevoked = true;
      } else {
        console.warn('⚠️ No se pudo revocar JWT:', result.message);
      }
    } catch (error) {
      console.error('❌ Error/Timeout revocando JWT:', error);
      // Continuar con el logout aunque falle
    }
  } else {
    console.log('ℹ️ No hay JWT del Backend de Login para revocar');
  }
  
  // 3. Revocar tokens de MCP Server
  if (mcpAccessToken) {
    try {
      // 3.1. Revocar refresh_token primero (más importante para seguridad)
      if (mcpRefreshToken) {
        console.log('📡 Paso 2/3: Revocando refresh_token de MCP...');
        await withTimeout(
          authService.revokeMCPRefreshToken(mcpRefreshToken, mcpAccessToken),
          5000
        ).catch(err => console.warn('⚠️ Error revocando refresh_token:', err));
      }
      
      // 3.2. Revocar access_token
      console.log('📡 Paso 3/3: Revocando access_token de MCP...');
      const result = await withTimeout(
        authService.revokeMCPToken(mcpAccessToken),
        5000
      );
      
      if (result.status === 'success') {
        console.log('✅ Access token de MCP revocado correctamente');
        mcpRevoked = true;
      } else {
        console.warn('⚠️ No se pudo revocar access_token de MCP:', result.message);
      }
    } catch (error) {
      console.error('❌ Error/Timeout revocando tokens de MCP:', error);
      // Continuar con el logout aunque falle
    }
  } else {
    console.log('ℹ️ No hay access_token de MCP para revocar');
  }
  
  // 4. Limpiar TODOS los datos del localStorage
  console.log('🧹 Limpiando almacenamiento local...');
  localStorage.removeItem('authToken');
  localStorage.removeItem('token_expires_at');
  localStorage.removeItem('user');
  localStorage.removeItem('mcp_access_token');
  localStorage.removeItem('mcp_refresh_token');
  localStorage.removeItem('mcp_token_expires_at');
  sessionStorage.removeItem('oauth_request');
  
  // También limpiar memoria (clearAuth de api.ts)
  clearAuth();
  
  // 5. Log del resultado
  if (loginRevoked && mcpRevoked) {
    console.log('✅ ===== LOGOUT COMPLETO EXITOSO =====');
    console.log('   JWT revocado: ✓');
    console.log('   MCP token revocado: ✓');
    console.log('   VSCode perderá acceso al MCP');
  } else if (loginRevoked || mcpRevoked) {
    console.log('🔶 ===== LOGOUT PARCIAL =====');
    console.log(`   JWT revocado: ${loginRevoked ? '✓' : '✗'}`);
    console.log(`   MCP token revocado: ${mcpRevoked ? '✓' : '✗'}`);
  } else {
    console.log('⚠️ ===== LOGOUT LOCAL SOLAMENTE =====');
    console.log('   No se pudieron revocar tokens remotos');
    console.log('   Tokens expirarán naturalmente');
  }
  
  setIsLoggingOut(false);
  
  // 6. Redirigir a login
  navigate('/login');
};

/**
 * Ejecutar promesa con timeout
 * Evita que el logout se bloquee indefinidamente
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeoutMs)
    )
  ]);
}
```

### 2.4. Actualizar Botón de Logout

**Ubicación:** En el JSX del componente, reemplazar el botón existente

```tsx
<button
  onClick={handleLogout}
  disabled={isLoggingOut}
  className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
>
  {isLoggingOut ? (
    <>
      {/* Spinner SVG */}
      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      <span>Cerrando sesión...</span>
    </>
  ) : (
    <>
      {/* Logout Icon SVG */}
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      <span>Cerrar sesión</span>
    </>
  )}
</button>
```

### ✅ Checklist FASE 2

- [ ] Imports añadidos
- [ ] Estado `isLoggingOut` creado
- [ ] Función `handleLogout` completa implementada
- [ ] Función `withTimeout` implementada
- [ ] Revocación de JWT del Backend de Login
- [ ] Revocación de access_token de MCP
- [ ] Revocación de refresh_token de MCP
- [ ] Limpieza de localStorage
- [ ] Limpieza de sessionStorage
- [ ] Llamada a `clearAuth()`
- [ ] Logging completo
- [ ] Botón actualizado con loading state
- [ ] Compilación sin errores

---

## FASE 3: Mejorar UX y Feedback

**Duración:** 30 minutos

### 3.1. Añadir Toast/Notificación (Opcional)

Si usas una librería de toast como `react-hot-toast`:

```typescript
import toast from 'react-hot-toast';

// Al final de handleLogout, antes de navigate:
if (loginRevoked && mcpRevoked) {
  toast.success('Sesión cerrada correctamente');
} else if (loginRevoked || mcpRevoked) {
  toast.success('Sesión cerrada', { 
    icon: '⚠️',
    duration: 4000 
  });
} else {
  toast('Sesión cerrada localmente', { icon: 'ℹ️' });
}
```

### 3.2. Confirmación de Logout (Opcional)

```typescript
const handleLogout = async () => {
  // Opcional: pedir confirmación
  const confirmed = window.confirm('¿Estás seguro de que quieres cerrar sesión?');
  if (!confirmed) return;
  
  setIsLoggingOut(true);
  // ... resto del código
};
```

### 3.3. Indicador Visual en Navbar

Si tienes un Navbar, mostrar estado de conexión:

```tsx
// En Navbar.tsx
const hasVSCodeConnection = !!localStorage.getItem('mcp_access_token');

<div className="flex items-center gap-2">
  {hasVSCodeConnection && (
    <span className="flex items-center gap-1 text-xs text-green-600">
      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      VSCode conectado
    </span>
  )}
</div>
```

### ✅ Checklist FASE 3

- [ ] Toast/notificación implementada (opcional)
- [ ] Confirmación de logout (opcional)
- [ ] Indicador de conexión VSCode (opcional)
- [ ] UX fluida sin bloqueos

---

## FASE 4: Testing

**Duración:** 1 hora

### 4.1. Test Manual del Flujo Completo

#### Preparación:
1. Abrir DevTools (F12) → Console
2. Tener VSCode con MCP configurado
3. Estar logueado en el frontend

#### Pasos:

```markdown
## Test: Flujo de Logout Completo

### Paso 1: Verificar Estado Inicial
- [ ] Abrir frontend en navegador
- [ ] Verificar que estás en /dashboard
- [ ] Abrir DevTools → Application → Local Storage
- [ ] Confirmar que existen:
      - authToken (JWT del backend)
      - mcp_access_token (token de MCP)
      - user (datos del usuario)

### Paso 2: Verificar VSCode
- [ ] Abrir VSCode
- [ ] Usar Copilot con un prompt de MCP: `@mis-prompts revisar-codigo`
- [ ] Confirmar que funciona ✅

### Paso 3: Ejecutar Logout
- [ ] Hacer clic en "Cerrar sesión"
- [ ] Ver spinner de loading
- [ ] Ver en consola:
      ```
      🚪 ===== INICIANDO LOGOUT COMPLETO =====
      📡 Paso 1/3: Revocando JWT en Backend de Login...
      ✅ JWT revocado correctamente
      📡 Paso 2/3: Revocando refresh_token de MCP...
      📡 Paso 3/3: Revocando access_token de MCP...
      ✅ Access token de MCP revocado correctamente
      🧹 Limpiando almacenamiento local...
      ✅ ===== LOGOUT COMPLETO EXITOSO =====
      ```
- [ ] Ser redirigido a /login

### Paso 4: Verificar Limpieza
- [ ] En DevTools → Local Storage
- [ ] Confirmar que NO existen:
      - authToken
      - mcp_access_token
      - mcp_refresh_token
      - user

### Paso 5: Verificar Revocación en VSCode
- [ ] Volver a VSCode
- [ ] Intentar usar `@mis-prompts revisar-codigo`
- [ ] Debería fallar o pedir re-autenticación ✅

### Resultado Esperado
✅ PASS: Logout revoca todos los tokens
✅ PASS: VSCode pierde acceso al MCP
✅ PASS: Usuario redirigido a /login
```

### 4.2. Test de Resilencia (Errores de Red)

1. Desactivar conexión de red
2. Hacer logout
3. Verificar que:
   - El logout local funciona (localStorage limpio)
   - Se muestra mensaje apropiado
   - Usuario es redirigido a /login

### 4.3. Test de Timeout

1. Simular servidor lento (ej: con DevTools Network Throttling)
2. Hacer logout
3. Verificar que:
   - El timeout de 5s funciona
   - El logout continúa aunque falle una revocación
   - No se bloquea indefinidamente

### ✅ Checklist FASE 4

- [ ] Test manual del flujo completo pasado
- [ ] Console logs correctos
- [ ] LocalStorage limpio después de logout
- [ ] VSCode pierde acceso
- [ ] Test de resilencia (sin red) pasado
- [ ] Test de timeout pasado
- [ ] Redirección a /login funciona

---

## 📡 Coordinación con Otros Equipos

### Lo que NECESITAS del MCP Server:

1. **Endpoint `/oauth/revoke` disponible**
   - Preguntarles cuándo estará listo
   - URL: `POST https://mcp-promps.onrender.com/oauth/revoke`

2. **Formato de Request:**
   ```http
   POST /oauth/revoke
   Content-Type: application/x-www-form-urlencoded
   Authorization: Bearer <access_token>
   
   token=<token_a_revocar>&token_type_hint=access_token
   ```

3. **Respuesta esperada:**
   ```json
   {
     "status": "ok",
     "message": "Token revoked successfully"
   }
   ```

### Lo que NECESITAS del Backend de Login:

1. **Endpoint `/auth/logout` ya existe** ✅
   - URL: `POST https://loggin-mcp.onrender.com/auth/logout`

2. **Formato de Request:**
   ```http
   POST /auth/logout
   Authorization: Bearer <jwt>
   ```

3. **Respuesta esperada:**
   ```json
   {
     "status": "success",
     "message": "Logged out"
   }
   ```

### Comunicación:

- **Al comenzar:** Notificar que vas a implementar logout dual
- **Durante:** Coordinar testing cuando MCP Server tenga el endpoint listo
- **Al finalizar:** Confirmar que pruebas end-to-end pasan

---

## 📊 Resumen de Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/services/authService.ts` | + `logout()`, + `revokeMCPToken()`, + `revokeMCPRefreshToken()` |
| `src/pages/Dashboard.tsx` | + `handleLogout()` completo, + loading state, + UI |
| `.env` | + `VITE_MCP_URL` |

---

## 🗂️ Almacenamiento de Tokens

### Keys de localStorage que usas:

| Key | Descripción | Limpieza |
|-----|-------------|----------|
| `authToken` | JWT del Backend de Login | ✅ Limpiar |
| `token_expires_at` | Expiración del JWT | ✅ Limpiar |
| `user` | Datos del usuario | ✅ Limpiar |
| `mcp_access_token` | OAuth access_token de MCP | ✅ Limpiar |
| `mcp_refresh_token` | OAuth refresh_token de MCP | ✅ Limpiar |
| `mcp_token_expires_at` | Expiración del token MCP | ✅ Limpiar |

### Keys de sessionStorage:

| Key | Descripción | Limpieza |
|-----|-------------|----------|
| `oauth_request` | OAuth request ID temporal | ✅ Limpiar |

---

## ✅ Checklist Final

### FASE 1: Servicios
- [ ] `AUTH_BASE_URL` configurada
- [ ] `MCP_BASE_URL` configurada
- [ ] `.env` actualizado
- [ ] `logout()` implementado
- [ ] `revokeMCPToken()` implementado
- [ ] `revokeMCPRefreshToken()` implementado

### FASE 2: Logout Dual
- [ ] Estado `isLoggingOut`
- [ ] `handleLogout()` completo
- [ ] `withTimeout()` implementado
- [ ] Revocación JWT
- [ ] Revocación MCP access_token
- [ ] Revocación MCP refresh_token
- [ ] Limpieza localStorage
- [ ] Limpieza sessionStorage
- [ ] Logging completo
- [ ] Botón con loading state

### FASE 3: UX
- [ ] Toast/notificación (opcional)
- [ ] Confirmación (opcional)
- [ ] Indicador VSCode (opcional)

### FASE 4: Testing
- [ ] Test manual pasado
- [ ] Console logs correctos
- [ ] LocalStorage limpio
- [ ] VSCode pierde acceso
- [ ] Resilencia ante errores
- [ ] Timeout funciona

### Despliegue
- [ ] Código commiteado
- [ ] Variables de entorno en Vercel
- [ ] Deploy a producción
- [ ] Testing en producción
- [ ] Notificar a otros equipos

---

## 🚨 Notas Importantes

### 1. Orden de Revocación

```
1. JWT del Backend de Login (más importante)
2. Refresh token de MCP (si existe)
3. Access token de MCP
4. Limpiar localStorage
5. Redirigir
```

### 2. Resilencia

El logout DEBE funcionar aunque fallen las revocaciones remotas:
- Usar timeouts de 5 segundos
- Continuar aunque falle una revocación
- Siempre limpiar localStorage
- Siempre redirigir

### 3. No Bloquear UI

- Usar loading state
- Deshabilitar botón durante logout
- Mostrar feedback visual

### 4. Seguridad

- NO loguear tokens completos en consola
- Limpiar TODO el localStorage relacionado con auth

---

**Tiempo Total Estimado:** 4 horas  
**Prioridad:** 🔴 CRÍTICA  
**Fecha Límite Sugerida:** [Coordinar con equipo MCP Server]

---

*Plan de trabajo generado el 17 de marzo de 2026*
