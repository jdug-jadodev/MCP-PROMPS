export const commitAutomaticoIaTemplate = `# Commit Automático con IA

## Objetivo
Analizar los cambios, generar mensaje de commit y ejecutar git add + git commit.

## Flujo

### 1. Ver cambios
\`\`\`bash
git status --porcelain
git diff
\`\`\`

### 2. Generar mensaje
Basado en los cambios, crear mensaje en formato:
\`<tipo>: <descripción breve>\`

**Tipos:**
- feat: nueva funcionalidad
- fix: corrección
- refactor: mejora de código
- docs: documentación
- test: pruebas
- chore: mantenimiento

### 3. Ejecutar commit
\`\`\`bash
git add .
git commit -m "<mensaje_generado>"
\`\`\`

### 4. Mostrar resultado y dejar push listo
\`\`\`
✅ Commit realizado: <mensaje>
📁 Archivos: <lista_archivos>

🚀 Para subir los cambios:
git push
\`\`\`

## Si no hay cambios
\`\`\`
ℹ️ No hay cambios para commitear
\`\`\`

## Ejemplo

**Cambios detectados:**
- src/auth/login.js modificado
- src/auth/validation.js agregado

**Mensaje generado:**
feat: implementar validación en login de usuarios

**Salida final:**
✅ Commit realizado: feat: implementar validación en login de usuarios
📁 Archivos: src/auth/login.js, src/auth/validation.js

🚀 Para subir los cambios:
git push`;