# 🚀 Guía de Instalación - MCP Prompts Server

## 📋 Descripción del Proyecto

**MCP Prompts Server** es un servidor del Model Context Protocol (MCP) que proporciona 17 prompts especializados para tareas de desarrollo, análisis de código, generación de tests, refactorización y más.

### ✨ Características Principales
- 17 prompts personalizados para desarrollo
- Compatible con VS Code y IntelliJ IDEA
- Instalación global vía npm
- Sin configuración compleja
- Sin necesidad de variables de entorno

---

## 🔧 Requisitos Previos

- **Node.js**: versión 18 o superior
- **npm**: versión 8 o superior
- **VS Code** o **IntelliJ IDEA** con soporte MCP

---

## 📦 Instalación

### Instalación Global (Recomendada)

```bash
npm install -g mcp-daemon-prompts-server-jdug
```

Esto instalará el servidor globalmente y estará disponible desde cualquier ubicación.

### Verificar instalación

```bash
# En Windows (PowerShell)
Get-Command mcp-daemon-prompts-server-jdug

# En Linux/Mac
which mcp-daemon-prompts-server-jdug
```

---

## 🖥️ Configuración para VS Code

### 1. Ubicar el archivo de configuración

Edita el archivo de configuración de VS Code:
- **Windows**: `%APPDATA%\Code\User\settings.json`
- **Linux**: `~/.config/Code/User/settings.json`
- **Mac**: `~/Library/Application Support/Code/User/settings.json`

O desde VS Code: `Ctrl+Shift+P` → "Preferences: Open User Settings (JSON)"

### 2. Agregar la configuración MCP

Añade o actualiza la sección `mcpServers` en tu `settings.json`:

```json
{
  "mcpServers": {
    "mcp-prompts-server": {
      "command": "mcp-daemon-prompts-server-jdug",
      "disabled": false
    }
  }
}
```

⚠️ **Importante**: 
- No necesitas especificar rutas absolutas, npm maneja esto automáticamente
- Si instalaste localmente (sin -g), usa `"command": "npx"` y `"args": ["mcp-daemon-prompts-server-jdug"]`

### 3. Reiniciar VS Code

Cierra y vuelve a abrir VS Code para que se cargue la configuración.

### 4. Verificar instalación

1. Abre GitHub Copilot Chat en VS Code
2. Escribe `@` y deberías ver tus prompts disponibles
3. O busca en la paleta de MCP los prompts registrados

---

## 🧠 Configuración para IntelliJ IDEA

### 1. Ubicar el archivo de configuración MCP

IntelliJ IDEA busca la configuración MCP en:
- **Windows**: `%APPDATA%\JetBrains\<Producto>\<Versión>\mcp-settings.xml`
- **Linux**: `~/.config/JetBrains/<Producto>/<Versión>/mcp-settings.xml`
- **Mac**: `~/Library/Application Support/JetBrains/<Producto>/<Versión>/mcp-settings.xml`

Ejemplo Windows: `C:\Users\Usuario\AppData\Roaming\JetBrains\IntelliJIdea2024.1\mcp-settings.xml`

### 2. Crear o editar el archivo de configuración

Crea el archivo `mcp-settings.xml` con el siguiente contenido:

```json
    "mcp-daemon-prompts-server": {
      "command": "mcp-daemon-prompts-server-jdug",
      "disabled": false
    }
```

### 3. Reiniciar IntelliJ IDEA

Cierra y vuelve a abrir IntelliJ para cargar la configuración.

### 4. Verificar instalación

1. Abre el panel de AI Assistant o MCP Tools
2. Deberías ver los prompts del servidor disponibles

---

## 📚 Prompts Disponibles

El servidor proporciona los siguientes prompts:

1. **explicador-codigo-mcp** - 🔍 Análisis automático del proyecto con explicaciones didácticas
2. **actualizador-readme-principal** - 📝 Actualiza el README principal del proyecto
3. **revisor-de-codigo-autonomo-mcp** - ✅ Revisión exhaustiva de código con estándares de calidad
4. **detector-de-brechas-de-seguridad-mcp** - 🔒 Análisis de vulnerabilidades
5. **analizador-de-mensajes-sonar-mcp** - 📊 Interpreta y soluciona reportes de SonarQube
6. **plantilla-generar-y-analizar-soluciones-mcp** - 💡 Genera soluciones técnicas detalladas
7. **analizador-de-test-unitarios** - Evalúa test unitarios y su covertura
8. **limpiar-one-spec** - Limpia el ONE_SPEC.md
9. **refactorizacion-codigo** - Asiste en refactorización de componentes
10. **solucion-en-one_spec** - Proporciona solución completa usando ONE_SPEC.md
11. **correccion-test-unitarios** - Corrige test unitarios fallidos
12. **probador-flujos-completos** - 🧪 Análisis estático de flujos completos
13. **generador-test-unitarios** - Genera test unitarios
14. **generador-commit-automatico** - 🤖 Genera commits automáticos
15. **crear-script-registro-commit** - Crea script para monitorear cambios
16. **generador-plan-trabajo** - Genera planes de trabajo detallados
17. **generador-indice-proyecto** - Genera índice del proyecto

---

## 🔄 Actualización

Para actualizar a la última versión:

```bash
npm update -g mcp-daemon-prompts-server-jdug
```

O reinstalar:

```bash
npm uninstall -g mcp-daemon-prompts-server-jdug
npm install -g mcp-daemon-prompts-server-jdug
```

---

## 🗑️ Desinstalación

```bash
npm uninstall -g mcp-daemon-prompts-server-jdug
```

Luego, elimina la configuración de tu IDE (settings.json o mcp-settings.xml).

---

## ❓ Troubleshooting

### El servidor no aparece en VS Code

1. Verifica que esté instalado: `npm list -g mcp-daemon-prompts-server-jdug`
2. Asegúrate de que `settings.json` tenga la configuración correcta
3. Revisa la consola de desarrollador: `Help` → `Toggle Developer Tools`
4. Reinicia VS Code completamente

### El servidor no aparece en IntelliJ

1. Verifica que esté instalado globalmente
2. Asegúrate de que `mcp-settings.xml` esté en la ubicación correcta
3. Revisa los logs de IntelliJ: `Help` → `Show Log in Explorer`
4. Reinicia IntelliJ IDEA

### Error: "command not found" o "mcp-daemon-prompts-server-jdug no se reconoce"

Esto indica que npm global no está en el PATH:

**Windows (PowerShell como Administrador):**
```powershell
$env:Path += ";$env:APPDATA\npm"
[Environment]::SetEnvironmentVariable("Path", $env:Path, [System.EnvironmentVariableTarget]::User)
```

**Linux/Mac:**
```bash
# Añadir a ~/.bashrc o ~/.zshrc
export PATH="$PATH:$(npm config get prefix)/bin"
source ~/.bashrc  # o ~/.zshrc
```

### Permisos en Linux/Mac

Si tienes problemas de permisos:

```bash
sudo npm install -g mcp-daemon-prompts-server-jdug
```

O configura npm para usar un directorio sin sudo:
```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
npm install -g mcp-daemon-prompts-server-jdug
```

---

## 🏗️ Cómo Funciona

### Arquitectura MCP

1. **Cliente (VS Code/IntelliJ)** inicia el servidor MCP cuando lo necesita
2. **Servidor MCP** se ejecuta mediante comunicación stdio (entrada/salida estándar)
3. El servidor **no necesita estar en ejecución continua** como daemon
4. Cada IDE **inicia y detiene** el servidor automáticamente según demanda

### Flujo de Comunicación

```
IDE → Ejecuta comando npm → Carga servidor MCP → Solicita prompts → Recibe respuesta → Cierra proceso
```

Por esta razón, **no necesitas PM2, systemd ni ningún gestor de procesos**. El IDE maneja todo el ciclo de vida.

---

## 📝 Notas Adicionales

- **Instalación global**: Disponible desde cualquier proyecto
- **Sin configuración**: No requiere variables de entorno
- **Sin daemon**: El IDE maneja el ciclo de vida automáticamente
- **Actualizaciones**: Fáciles con `npm update -g`
- **Portabilidad**: Funciona en Windows, Linux y Mac

---

## 📄 Licencia

ISC

---

## 👥 Soporte

Para problemas o preguntas:
1. Verifica que Node.js esté instalado: `node --version` (debe ser >= 18)
2. Verifica que npm global funcione: `npm list -g mcp-daemon-prompts-server-jdug`
3. Revisa los logs de tu IDE
4. Asegúrate de reiniciar el IDE después de cambios en configuración

---

**Última actualización**: Abril 2026
