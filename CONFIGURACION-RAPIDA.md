# ⚡ Configuración Rápida - MCP Prompts Server

## ✅ Ya instalado

Si ejecutaste:
```bash
npm install -g mcp-daemon-prompts-server-jdug
```

El servidor ya está instalado y listo. Ahora solo necesitas configurar tu IDE.

---

## 🖥️ VS Code - Configuración

### Opción 1: Manual

1. Presiona `Ctrl+Shift+P`
2. Busca: **"Preferences: Open User Settings (JSON)"**
3. Añade esta configuración:

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

### Opción 2: Archivo de ejemplo

Copia el contenido de `vscode-settings-example.json` incluido en este proyecto.

### Ubicación del archivo

- **Windows**: `C:\Users\TuUsuario\AppData\Roaming\Code\User\settings.json`
- **Linux**: `~/.config/Code/User/settings.json`
- **Mac**: `~/Library/Application Support/Code/User/settings.json`

### Reiniciar VS Code

Cierra y vuelve a abrir VS Code completamente.

---

## 🧠 IntelliJ IDEA - Configuración

### Crear el archivo de configuración

1. Crea el archivo `mcp-settings.xml` en la ubicación correspondiente:

**Windows:**
```
C:\Users\TuUsuario\AppData\Roaming\JetBrains\IntelliJIdea2024.1\mcp-settings.xml
```

**Linux:**
```
~/.config/JetBrains/IntelliJIdea2024.1/mcp-settings.xml
```

**Mac:**
```
~/Library/Application Support/JetBrains/IntelliJIdea2024.1/mcp-settings.xml
```

2. Copia este contenido (también disponible en `intellij-mcp-settings-example.xml`):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<mcpSettings>
    <servers>
        <server>
            <name>mcp-prompts-server</name>
            <command>mcp-daemon-prompts-server-jdug</command>
            <disabled>false</disabled>
        </server>
    </servers>
</mcpSettings>
```

### Reiniciar IntelliJ

Cierra y vuelve a abrir IntelliJ IDEA completamente.

---

## ✅ Verificar que funciona

### En VS Code

1. Abre GitHub Copilot Chat
2. Escribe `@`
3. Deberías ver los prompts disponibles

### En IntelliJ

1. Abre AI Assistant o el panel de MCP
2. Busca los prompts del servidor
3. Deberían estar disponibles para usar

---

## 🐛 Si no funciona

### Verifica la instalación

```bash
# Windows (PowerShell)
Get-Command mcp-daemon-prompts-server-jdug

# Linux/Mac
which mcp-daemon-prompts-server-jdug
```

Debería mostrar la ruta del comando instalado.

### Verifica la versión

```bash
npm list -g mcp-daemon-prompts-server-jdug
```

### Reinicia el IDE

Asegúrate de cerrar **completamente** el IDE (no solo la ventana) y volver a abrirlo.

### Revisa los logs

**VS Code:**
- `Help` → `Toggle Developer Tools`
- Busca errores en la consola

**IntelliJ:**
- `Help` → `Show Log in Explorer`
- Busca errores relacionados con MCP

---

## 📚 Prompts disponibles

Una vez configurado, tendrás acceso a 17 prompts:

- `explicador-codigo-mcp`
- `actualizador-readme-principal`
- `revisor-de-codigo-autonomo-mcp`
- `detector-de-brechas-de-seguridad-mcp`
- `analizador-de-mensajes-sonar-mcp`
- Y 12 más...

Ver todos en [README.md](README.md)

---

## 🎯 Resumen

```bash
# 1. Ya instalado
npm install -g mcp-daemon-prompts-server-jdug ✅

# 2. Configurar IDE
# - VS Code: Añadir a settings.json
# - IntelliJ: Crear mcp-settings.xml

# 3. Reiniciar IDE

# 4. ¡Usar los prompts! 🚀
```

---

**¡Ya está listo para usar!** 🎉
