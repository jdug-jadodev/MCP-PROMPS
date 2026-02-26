# One Spec (Root Spec)

## Objetivo
Implementar en este MCP una **tool de “quick commit”** que obtenga cambios locales de Git de forma rápida (sin depender de Copilot para el análisis), y permita generar el mensaje de commit con Copilot usando ese resumen, ejecutando luego `git add .` y `git commit -m` de manera directa.

## Alcance / No alcance
**Alcance**
- Nueva tool MCP para:
	1) Resumen local de cambios (status, diff stats, archivos, snippets limitados).
	2) Ejecución de commit rápido (`git add .` + `git commit -m`).
- Integración en el servidor actual (STDIO y HTTP) usando el sistema de tools existente.
- Documentación mínima en README.

**No alcance**
- No reemplaza ni “salta” permisos de Copilot o de VS Code.
- No genera el mensaje dentro del servidor; el mensaje lo genera Copilot a partir del resumen local.
- No incluye CI/CD ni validaciones avanzadas de Git (hooks, firmas, etc.).

## Definiciones (lenguaje de dominio)
- **Quick Commit**: Flujo en dos pasos: (1) resumen local rápido, (2) commit con mensaje generado por Copilot.
- **Resumen local**: Resultado de `git status --porcelain`, `git diff --stat`, `git diff --name-only` y snippets acotados.
- **Tool MCP**: Función registrada en `src/tools/` con `metadata` e interfaz MCP.

## Principios / Reglas no negociables
- **Seguridad**: Sanitizar el mensaje de commit antes de ejecutarlo.
- **Performance**: El resumen local debe ser rápido (limitar tamaño y número de archivos/snippets).
- **Compatibilidad**: No romper el flujo actual de tools (`guardar-prompt`).
- **Trazabilidad**: Toda acción de commit debe quedar en logs del servidor.

## Límites
- Máximo 5 archivos para snippets.
- Máximo 20 líneas por snippet.
- Sólo comandos Git básicos (`status`, `diff`, `add`, `commit`).
- No se ejecutan comandos arbitrarios.

## Eventos y estados (visión raíz)
1. **List Tools** → El cliente ve `quick-commit:get_changes` y `quick-commit:commit`.
2. **Call get_changes** → Se devuelve resumen local.
3. **Copilot genera mensaje** (fuera del servidor) → Usuario envía mensaje.
4. **Call commit** → Ejecuta `git add .` y `git commit -m`.

## Criterios de aceptación (root)
- Existe una nueva tool MCP en `src/tools/` registrada en `src/tools/index.ts`.
- `get_changes` devuelve: `files`, `stats`, `status`, `count`, `snippets`, `type`.
- `commit` ejecuta `git add .` y `git commit -m "..."` con sanitización.
- La tool funciona en modo STDIO y HTTP sin cambios de configuración adicionales.
- README actualizado con ejemplo de uso.

## Trazabilidad
- **Repositorio actual**: usa `@modelcontextprotocol/sdk`, `express`, `typescript` (ver README).
- **Archivos clave**:
	- `src/tools/` para nueva tool.
	- `src/tools/index.ts` para registro.
	- `README.md` para documentación.