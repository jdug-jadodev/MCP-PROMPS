# One Spec - Generador Automático de Commits con IA

## Objetivo

Implementar un prompt MCP que permita a la IA analizar los cambios del repositorio Git, generar mensajes de commit contextuales y automáticos basados en las modificaciones detectadas, y ejecutar `git add .` y `git commit` de manera segura, **sin realizar push al repositorio remoto**.

---

## Alcance / No alcance

### **Alcance:**
1. ✅ Detectar la rama Git actual del repositorio
2. ✅ Analizar cambios con `git status` y `git diff`
3. ✅ Generar mensaje de commit inteligente basado en:
   - Archivos modificados/agregados/eliminados
   - Tipo de cambios (feature, fix, refactor, docs, etc.)
   - Contexto del código modificado
4. ✅ Ejecutar `git add .` para staging de cambios
5. ✅ Ejecutar `git commit -m "mensaje generado"` con el mensaje de la IA
6. ✅ Seguir convenciones de commits (Conventional Commits)
7. ✅ Validar que existan cambios antes de intentar commit
8. ✅ Informar al usuario sobre la rama, archivos afectados y mensaje generado

### **No alcance:**
1. ❌ **PROHIBIDO:** Ejecutar `git push` en cualquier circunstancia
2. ❌ **PROHIBIDO:** Modificar configuraciones de Git (.gitconfig, .git/config)
3. ❌ **PROHIBIDO:** Cambiar de rama automáticamente
4. ❌ **PROHIBIDO:** Crear, eliminar o mergear ramas
5. ❌ **PROHIBIDO:** Hacer rebase, reset, revert u operaciones destructivas
6. ❌ **PROHIBIDO:** Modificar commits anteriores (amend, squash)
7. ❌ **PROHIBIDO:** Interactuar con repositorios remotos (fetch, pull, push)

---

## Definiciones (lenguaje de dominio)

- **Commit Contextual:** Mensaje de commit generado por IA que refleja fielmente los cambios realizados
- **Staging Area:** Área temporal de Git donde se preparan los archivos antes del commit (`git add`)
- **Conventional Commits:** Especificación para mensajes de commit estructurados (tipo: descripción)
  - Ejemplos: `feat: agregar login`, `fix: corregir validación`, `refactor: mejorar performance`
- **Working Directory:** Directorio de trabajo con archivos modificados sin staging
- **Rama actual:** Branch de Git en el que está posicionado el usuario (`git branch --show-current`)
- **Diff:** Diferencias entre archivos modificados y su versión en el repositorio

---

## Principios / Reglas no negociables

### 🔒 Seguridad
1. **NUNCA ejecutar `git push`** bajo ninguna circunstancia
2. **NUNCA modificar el historial de commits** existente
3. **NUNCA ejecutar comandos destructivos** (reset --hard, clean -fd, etc.)
4. **VALIDAR existencia de cambios** antes de intentar commit
5. **INFORMAR claramente** al usuario qué se va a hacer antes de ejecutar

### 📝 Calidad de Mensajes
1. **Seguir Conventional Commits:** Usar prefijos estándar
   - `feat:` nueva funcionalidad
   - `fix:` corrección de bug
   - `refactor:` refactorización sin cambios funcionales
   - `docs:` documentación
   - `test:` pruebas
   - `chore:` tareas de mantenimiento
   - `style:` formateo, estilos
2. **Mensajes descriptivos:** Máximo 72 caracteres en primera línea
3. **Idioma consistente:** Español o inglés según el proyecto
4. **Contexto específico:** Mencionar archivos/módulos afectados

### 🎯 Comportamiento
1. **Detectar rama actual** antes de hacer commit
2. **Analizar diff completo** para entender cambios
3. **Proponer mensaje** antes de ejecutar (modo interactivo opcional)
4. **Abortar si no hay cambios** para evitar commits vacíos
5. **Logging claro:** Mostrar rama, archivos modificados, mensaje generado

---

## Límites

### Límites Técnicos
- ✅ **Solo repositorios Git:** No funciona con SVN, Mercurial u otros VCS
- ✅ **Solo commits locales:** No interactúa con repositorios remotos
- ✅ **Requiere permisos:** Usuario debe tener permisos de escritura en .git/
- ✅ **Workspace detectado:** Debe ejecutarse dentro de un repositorio Git válido

### Límites de Responsabilidad
- ⚠️ **Usuario responsable del push:** La IA hace commit, el usuario decide push
- ⚠️ **Revisión recomendada:** Usuario debería revisar el mensaje generado
- ⚠️ **No reemplaza code review:** El commit es solo documentación, no validación

---

## Eventos y estados (visión raíz)

### Flujo de Ejecución

```
┌─────────────────────────────────────┐
│ Usuario invoca prompt MCP           │
│ "commit-automatico-ia"              │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Estado 1: VALIDACIÓN                │
│ - Verificar si es repositorio Git   │
│ - Verificar si hay cambios          │
└──────────────┬──────────────────────┘
               │
               ├─ No hay cambios ───> ❌ ABORTAR (mensaje: "No hay cambios")
               │
               ▼
┌─────────────────────────────────────┐
│ Estado 2: DETECCIÓN CONTEXTO        │
│ - Detectar rama actual              │
│ - Ejecutar `git status`             │
│ - Ejecutar `git diff`               │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Estado 3: ANÁLISIS IA               │
│ - Analizar archivos modificados     │
│ - Identificar tipo de cambios       │
│ - Generar mensaje Conventional      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Estado 4: STAGING                   │
│ - Ejecutar `git add .`              │
│ - Confirmar archivos en staging     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Estado 5: COMMIT                    │
│ - Ejecutar `git commit -m "..."`    │
│ - Capturar hash del commit          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Estado 6: REPORTE                   │
│ ✅ Mostrar:                          │
│ - Rama actual                       │
│ - Archivos modificados (resumen)    │
│ - Mensaje de commit generado        │
│ - Hash del commit                   │
│ - Recordatorio: "NO se hizo push"   │
└─────────────────────────────────────┘
```

---

## Criterios de aceptación (root)

### ✅ Criterio 1: Detección de Repositorio
**DADO** que el usuario invoca el prompt  
**CUANDO** se ejecuta en un directorio sin `.git/`  
**ENTONCES** debe abortar con mensaje: *"Error: No se detectó un repositorio Git en este directorio"*

---

### ✅ Criterio 2: Validación de Cambios
**DADO** que es un repositorio Git válido  
**CUANDO** no hay cambios en working directory ni staging area  
**ENTONCES** debe abortar con mensaje: *"No hay cambios para hacer commit"*

---

### ✅ Criterio 3: Detección de Rama
**DADO** que hay cambios pendientes  
**CUANDO** se analiza el contexto  
**ENTONCES** debe detectar y mostrar la rama actual (ej: `main`, `develop`, `feature/nueva-funcion`)

---

### ✅ Criterio 4: Análisis de Cambios
**DADO** que hay archivos modificados  
**CUANDO** se ejecuta `git diff` y `git status`  
**ENTONCES** debe:
- Listar archivos modificados (M), agregados (A), eliminados (D)
- Analizar el contenido del diff
- Identificar el tipo de cambio predominante

---

### ✅ Criterio 5: Generación de Mensaje Conventional
**DADO** el análisis de cambios completado  
**CUANDO** se genera el mensaje de commit  
**ENTONCES** debe seguir formato:
```
<tipo>: <descripción corta>

[opcional] <cuerpo explicativo>
```

**Ejemplos válidos:**
- `feat: agregar endpoint de autenticación con JWT`
- `fix: corregir validación de email en formulario registro`
- `refactor: mejorar performance de consultas en base de datos`
- `docs: actualizar README con instrucciones de instalación`

---

### ✅ Criterio 6: Ejecución de Git Add
**DADO** el mensaje generado  
**CUANDO** se ejecuta `git add .`  
**ENTONCES** debe:
- Agregar todos los archivos modificados/nuevos al staging
- Confirmar éxito de la operación
- Capturar cualquier error (permisos, archivos bloqueados)

---

### ✅ Criterio 7: Ejecución de Git Commit
**DADO** los archivos en staging  
**CUANDO** se ejecuta `git commit -m "<mensaje>"`  
**ENTONCES** debe:
- Crear el commit con el mensaje generado
- Capturar el hash del commit (primeros 7 caracteres)
- Confirmar éxito del commit

---

### ✅ Criterio 8: Prohibición de Push
**DADO** cualquier estado de la ejecución  
**CUANDO** se evalúan los comandos a ejecutar  
**ENTONCES** NUNCA debe ejecutar:
- `git push`
- `git push origin <rama>`
- `git push --force`
- Ninguna variante de push

---

### ✅ Criterio 9: Reporte Final
**DADO** el commit exitoso  
**CUANDO** se completa la operación  
**ENTONCES** debe mostrar:

```markdown
✅ Commit exitoso

📍 Rama: feature/nueva-funcion
📝 Archivos modificados: 3 archivos (2M, 1A)
💬 Mensaje: feat: agregar sistema de autenticación con JWT

🔒 Hash: a3b2c1d

⚠️ RECORDATORIO: Los cambios están committeados localmente.
   Para subir al repositorio remoto, ejecuta manualmente:
   git push origin feature/nueva-funcion
```

---

### ✅ Criterio 10: Manejo de Errores
**DADO** que ocurre un error en cualquier paso  
**CUANDO** falla la operación  
**ENTONCES** debe:
- Mostrar mensaje de error específico
- NO ejecutar pasos posteriores
- Dejar el repositorio en estado consistente
- Sugerir solución al usuario

**Ejemplos de errores:**
- Error permisos: *"No tienes permisos de escritura en .git/"*
- Error conflicts: *"Hay conflictos sin resolver. Por favor resuélvelos primero."*
- Error hooks: *"El pre-commit hook falló. Revisa los errores."*

---

## Implementación Técnica

### Archivos a Crear

#### 1. Template del Prompt: `src/templates/commit-automatico-ia.template.ts`

```typescript
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
```

#### 2. Registro del Prompt: Agregar a `src/prompts.ts`

```typescript
{
  name: "commit-automatico-ia",
  description: "Genera commits automáticos con mensajes contextuales basados en análisis de cambios Git. NUNCA hace push.",
  templateName: "commitAutomaticoIaTemplate",
}
```

#### 3. Exportar Template: Agregar a `src/templates/index.ts`

```typescript
export { commitAutomaticoIaTemplate } from './commit-automatico-ia.template.js';
```

---

## Trazabilidad

### Referencias
- **Conventional Commits Spec:** https://www.conventionalcommits.org/
- **Git Documentation:** https://git-scm.com/doc
- **MCP Protocol:** https://spec.modelcontextprotocol.io/

### Relacionado con
- Prompt: `revisor-de-codigo-autonomo-mcp` - Para revisión antes de commit
- Prompt: `detector-de-brechas-de-seguridad-mcp` - Para validar seguridad antes de commit

### Historial de Cambios
- **v1.0** (2026-02-24): Especificación inicial del prompt commit-automatico-ia

---

## Checklist de Implementación

- [ ] Crear archivo `src/templates/commit-automatico-ia.template.ts`
- [ ] Exportar template en `src/templates/index.ts`
- [ ] Registrar prompt en `src/prompts.ts`
- [ ] Probar detección de repositorio Git
- [ ] Probar análisis de cambios con `git diff`
- [ ] Validar generación de mensajes Conventional Commits
- [ ] Verificar ejecución de `git add .`
- [ ] Verificar ejecución de `git commit`
- [ ] **CRÍTICO:** Confirmar que NUNCA ejecuta `git push`
- [ ] Probar manejo de errores (no repo, no cambios, conflictos)
- [ ] Probar en ramas con diferentes nombres
- [ ] Validar formato del reporte final
- [ ] Documentar en README.md
- [ ] Actualizar informe de exploración con nuevo prompt