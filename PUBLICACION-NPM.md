# 📦 Guía de Publicación en npm

Esta guía explica cómo publicar y mantener el paquete `mcp-prompts-server` en npm.

---

## 📋 Pre-requisitos

1. **Cuenta en npm**: Crea una cuenta en [npmjs.com](https://www.npmjs.com)
2. **npm CLI configurado**: Debes estar autenticado localmente

---

## 🔐 Configuración Inicial

### 1. Autenticarse en npm

```bash
npm login
```

Ingresa tus credenciales:
- Username
- Password
- Email
- One-Time Password (si tienes 2FA activado)

### 2. Verificar sesión

```bash
npm whoami
```

Esto debe mostrar tu nombre de usuario.

---

## 📝 Preparación del Paquete

### 1. Actualizar información del package.json

Antes de publicar, asegúrate de actualizar estos campos:

```json
{
  "name": "mcp-prompts-server",
  "version": "1.0.0",
  "description": "Servidor MCP con 17 prompts especializados...",
  "author": "Tu Nombre <tu@email.com>",
  "repository": {
    "type": "git",
    "url": "https://github.com/tu-usuario/mcp-prompts-server.git"
  },
  "bugs": {
    "url": "https://github.com/tu-usuario/mcp-prompts-server/issues"
  },
  "homepage": "https://github.com/tu-usuario/mcp-prompts-server#readme"
}
```

### 2. Verificar que el nombre esté disponible

```bash
npm search mcp-prompts-server
```

Si el nombre ya existe, necesitarás usar un scope o cambiar el nombre:
```json
{
  "name": "@tu-usuario/mcp-prompts-server"
}
```

### 3. Verificar archivos a incluir

```bash
npm pack --dry-run
```

Esto mostrará qué archivos se incluirán en el paquete sin crearlo realmente.

---

## 🚀 Proceso de Publicación

### Publicación Inicial (versión 1.0.0)

```bash
# 1. Asegurarse de que todo está compilado
npm run build

# 2. Verificar que todo funciona
node dist/index.js --help

# 3. Publicar
npm publish
```

### Publicación con Scope (si el nombre está ocupado)

```bash
# Publicar como paquete público con scope
npm publish --access public
```

---

## 🔄 Actualizaciones y Versionado

Sigue [Semantic Versioning](https://semver.org/):
- **MAJOR** (1.x.x): Cambios incompatibles
- **MINOR** (x.1.x): Nueva funcionalidad compatible
- **PATCH** (x.x.1): Bug fixes

### Actualizar versión PATCH (bug fix)

```bash
npm version patch
npm publish
```

Ejemplo: 1.0.0 → 1.0.1

### Actualizar versión MINOR (nueva funcionalidad)

```bash
npm version minor
npm publish
```

Ejemplo: 1.0.1 → 1.1.0

### Actualizar versión MAJOR (breaking changes)

```bash
npm version major
npm publish
```

Ejemplo: 1.1.0 → 2.0.0

---

## ✅ Checklist antes de Publicar

- [ ] `npm run build` ejecutado sin errores
- [ ] Versión actualizada en `package.json`
- [ ] README.md actualizado con cambios
- [ ] `.npmignore` configurado correctamente
- [ ] Probado localmente con `npm pack` + instalación manual
- [ ] Git commit de los cambios
- [ ] Git tag de la versión (opcional pero recomendado)

```bash
# Crear tag de versión
git tag v1.0.0
git push origin v1.0.0
```

---

## 🧪 Probar antes de Publicar

### Opción 1: Instalación local desde archivo

```bash
# Crear paquete
npm pack

# Instalar globalmente desde el archivo .tgz generado
npm install -g ./mcp-prompts-server-1.0.0.tgz

# Probar
mcp-prompts-server

# Limpiar
npm uninstall -g mcp-prompts-server
```

### Opción 2: Link local

```bash
# En el directorio del proyecto
npm link

# Probar el comando
mcp-prompts-server

# Deshacer el link
npm unlink -g mcp-prompts-server
```

---

## 📊 Después de Publicar

### Verificar la publicación

```bash
npm view mcp-prompts-server
```

Esto mostrará toda la información del paquete publicado.

### Ver en el navegador

Visita: `https://www.npmjs.com/package/mcp-prompts-server`

### Instalar y probar

```bash
npm install -g mcp-prompts-server
mcp-prompts-server
```

---

## 🔧 Gestión del Paquete

### Ver estadísticas de descargas

```bash
npm view mcp-prompts-server downloads
```

O visita: [npm-stat.com](https://npm-stat.com)

### Deprecar una versión

```bash
npm deprecate mcp-prompts-server@1.0.0 "Por favor actualiza a 1.0.1"
```

### Eliminar una versión (solo dentro de 72h)

```bash
npm unpublish mcp-prompts-server@1.0.0
```

⚠️ **Advertencia**: Solo se puede hacer dentro de las 72 horas posteriores a la publicación.

### Eliminar el paquete completo

```bash
npm unpublish mcp-prompts-server --force
```

⚠️ **Advertencia**: 
- Solo si tiene menos de 72 horas publicado
- No recomendado si hay usuarios
- El nombre quedará bloqueado por 24 horas

---

## 🐛 Solución de Problemas

### Error: "You do not have permission to publish"

1. Verifica que estés autenticado: `npm whoami`
2. Si el paquete tiene scope, usa: `npm publish --access public`

### Error: "Package name already exists"

Opciones:
1. Usar un scope: `@tu-usuario/mcp-prompts-server`
2. Cambiar el nombre del paquete

### Error: "prepublishOnly failed"

El script `prepublishOnly` (que ejecuta `npm run build`) falló. Revisa:
```bash
npm run build
```

Y corrige los errores de compilación.

### Publicación accidental

Si publicaste por error:
```bash
npm unpublish mcp-prompts-server@1.x.x
```

Solo funciona dentro de 72 horas.

---

## 📝 Mejores Prácticas

1. **Siempre probar localmente** antes de publicar
2. **Usar tags de git** para cada versión
3. **Mantener un CHANGELOG.md** con los cambios de cada versión
4. **Usar `.npmignore`** para excluir archivos innecesarios
5. **README.md completo** con instrucciones de instalación y uso
6. **Versionado semántico** estricto
7. **No publicar secretos** (revisar `.npmignore`)

---

## 🔒 Seguridad

### Habilitar 2FA

```bash
npm profile enable-2fa auth-and-writes
```

Esto requerirá un código 2FA para:
- Autenticación
- Publicación de paquetes

### Ver tokens de acceso

```bash
npm token list
```

### Revocar tokens

```bash
npm token revoke <token-id>
```

---

## 📚 Recursos Adicionales

- [npm Docs - Publishing](https://docs.npmjs.com/cli/v10/commands/npm-publish)
- [Semantic Versioning](https://semver.org/)
- [npm Package Best Practices](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)

---

## 🎯 Resumen Rápido

```bash
# Primera vez
npm login
npm run build
npm publish

# Actualizaciones
npm run build
npm version patch  # o minor, o major
npm publish
git push && git push --tags
```

---

**Última actualización**: Abril 2026
