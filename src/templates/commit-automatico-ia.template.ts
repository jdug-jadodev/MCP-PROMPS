export const commitAutomaticoIaTemplate = `# Commit Automático con IA

## Objetivo
Analizar los cambios del repositorio Git, generar un mensaje de commit contextual siguiendo Conventional Commits, y ejecutar \`git add .\` y \`git commit\` de manera segura.

## ⚠️ REGLAS CRÍTICAS DE SEGURIDAD

### 🔒 PROHIBICIONES ABSOLUTAS
- ❌ **NUNCA ejecutar \`git push\`** bajo ninguna circunstancia
- ❌ **NUNCA modificar historial** (amend, rebase, reset --hard)
- ❌ **NUNCA cambiar de rama** automáticamente
- ❌ **NUNCA ejecutar comandos destructivos**

## Flujo de Ejecución

### Paso 1: Validación Inicial
\`\`\`bash
# Verificar si es repositorio Git
git rev-parse --is-inside-work-tree

# Verificar si hay cambios
git status --porcelain
\`\`\`

**Si no hay cambios:** Abortar con mensaje "No hay cambios para hacer commit"

### Paso 2: Detección de Contexto
\`\`\`bash
# Detectar rama actual
git branch --show-current

# Obtener status detallado
git status

# Obtener diff completo
git diff
git diff --staged
\`\`\`

### Paso 3: Análisis Inteligente
Analiza los cambios y determina:

1. **Tipo de cambio predominante:**
   - \`feat\`: Nueva funcionalidad
   - \`fix\`: Corrección de bug
   - \`refactor\`: Refactorización
   - \`docs\`: Documentación
   - \`test\`: Pruebas
   - \`chore\`: Tareas de mantenimiento
   - \`style\`: Formateo/estilos

2. **Archivos afectados:**
   - Cuenta archivos modificados (M), agregados (A), eliminados (D)
   - Identifica módulos/componentes principales

3. **Contexto del cambio:**
   - Lee el contenido del diff
   - Identifica funciones/clases modificadas
   - Detecta patrones (nuevo endpoint, fix de validación, etc.)

### Paso 4: Generación de Mensaje
Genera mensaje siguiendo este formato:

\`\`\`
<tipo>: <descripción concisa en español>

[Opcional] Detalles adicionales si el cambio es complejo
- Detalle 1
- Detalle 2
\`\`\`

**Reglas para el mensaje:**
- Primera línea máximo 72 caracteres
- Descripción clara y específica
- Mencionar componentes/módulos afectados
- Usar infinitivo: "agregar", "corregir", "refactorizar"

### Paso 5: Ejecución de Comandos
\`\`\`bash
# Staging de todos los cambios
git add .

# Commit con mensaje generado
git commit -m "<mensaje_generado>"
\`\`\`

### Paso 6: Reporte Final
Muestra al usuario:

\`\`\`markdown
✅ **Commit exitoso**

📍 **Rama:** <nombre_rama>
📂 **Archivos modificados:** <cantidad> archivos (<desglose>)
💬 **Mensaje:** <mensaje_commit>
🔒 **Hash:** <primeros_7_caracteres>

⚠️ **RECORDATORIO:** Los cambios están committeados localmente.
   Para subir al repositorio remoto, ejecuta manualmente:
   \`git push origin <nombre_rama>\`
\`\`\`

## Manejo de Errores

### Error: No es repositorio Git
\`\`\`
❌ Error: No se detectó un repositorio Git en este directorio.
   
   Solución: Ejecuta \`git init\` o navega a un directorio con repositorio Git.
\`\`\`

### Error: No hay cambios
\`\`\`
ℹ️ No hay cambios para hacer commit.
   El working directory está limpio.
\`\`\`

### Error: Conflictos sin resolver
\`\`\`
❌ Error: Hay conflictos sin resolver.
   
   Solución: Resuelve los conflictos manualmente y ejecuta:
   git add <archivos_resueltos>
   git commit
\`\`\`

### Error: Pre-commit hook falló
\`\`\`
❌ Error: El pre-commit hook falló.
   
   Revisa los errores mostrados arriba y corrígelos antes de commitear.
\`\`\`

## Ejemplos de Mensajes Generados

### Ejemplo 1: Nueva Feature
\`\`\`
Cambios detectados:
- src/auth/login.ts (A)
- src/auth/jwt.service.ts (A)
- src/routes/auth.routes.ts (M)

Mensaje generado:
feat: agregar sistema de autenticación con JWT

- Implementar servicio de generación de tokens
- Crear endpoint POST /auth/login
- Agregar middleware de validación de tokens
\`\`\`

### Ejemplo 2: Bug Fix
\`\`\`
Cambios detectados:
- src/validators/email.validator.ts (M)
- tests/validators/email.test.ts (M)

Mensaje generado:
fix: corregir validación de emails con dominios especiales

Soporta ahora emails con subdominios y caracteres especiales
permitidos por RFC 5322
\`\`\`

### Ejemplo 3: Refactor
\`\`\`
Cambios detectados:
- src/database/queries.ts (M)
- src/database/connection.ts (M)

Mensaje generado:
refactor: optimizar consultas de base de datos con índices

Reduce tiempo de respuesta de consultas complejas en 60%
\`\`\`

### Ejemplo 4: Documentación
\`\`\`
Cambios detectados:
- README.md (M)
- docs/installation.md (A)

Mensaje generado:
docs: actualizar README con guía de instalación detallada

Agrega sección de requisitos previos y troubleshooting
\`\`\`

## Validaciones Pre-Commit

Antes de ejecutar el commit, verifica:
- ✅ Hay al menos un archivo modificado
- ✅ Los cambios tienen sentido (no son accidentales)
- ✅ El mensaje generado es descriptivo
- ✅ El tipo de commit es correcto

## Notas Importantes

1. **Revisión recomendada:** Aunque la IA genera el mensaje, el usuario puede revisarlo antes de confirmar
2. **No reemplaza code review:** Este commit es solo documentación
3. **Usuario controla el push:** La IA nunca hará push, eso queda a criterio del usuario
4. **Hooks respetados:** Si hay pre-commit hooks, se ejecutarán normalmente

## Comandos que NUNCA se deben ejecutar

\`\`\`bash
# ❌ PROHIBIDO - PUSH
git push
git push origin <rama>
git push --force
git push --force-with-lease

# ❌ PROHIBIDO - MODIFICAR HISTORIAL
git commit --amend
git rebase
git reset --hard
git reset --soft HEAD~1

# ❌ PROHIBIDO - CAMBIOS DE RAMA
git checkout <rama>
git switch <rama>
git merge <rama>

# ❌ PROHIBIDO - COMANDOS DESTRUCTIVOS
git clean -fd
git rm -rf
\`\`\`

---

**Recordatorio Final:** Este prompt SOLO hace commit local. El push es responsabilidad del usuario.
`;
