"# Script para registrar cambios en el proyecto"

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = 'cambios-registro.md';
const PROJECT_PATH = process.cwd();
let lastChanges = '';
let lastUntracked = '';
let debounceTimer = null;

// Inicializar archivo
fs.writeFileSync(OUTPUT_FILE, `# 📊 Registro de Cambios con Estadísticas
**Iniciado:** ${new Date().toLocaleString()}
**Proyecto:** ${PROJECT_PATH}
**Formato:** Archivos nuevos, modificados y eliminados

`);

console.log('🔍 Monitoreando proyecto (incluye archivos nuevos)...');
console.log(`📝 Registro: ${OUTPUT_FILE}`);
console.log('🛑 Ctrl+C para detener\n');

// Función para obtener archivos nuevos (untracked)
function getUntrackedFiles(callback) {
    exec('git ls-files --others --exclude-standard', (err, stdout) => {
        if (err) {
            callback([]);
            return;
        }

        const files = stdout.split('\n')
            .filter(f => f.trim() && !f.includes('cambios-registro.md'))
            .filter((f, i, self) => self.indexOf(f) === i);

        callback(files);
    });
}

// Función para obtener estadísticas detalladas de cambios (archivos modificados/eliminados)
function getGitStats(callback) {
    // Comando para obtener estadísticas por archivo (incluye modificados y eliminados)
    exec('git diff --numstat && git diff --staged --numstat',
        { maxBuffer: 1024 * 1024 },
        (err, stdout) => {
            if (err) {
                callback([]);
                return;
            }

            const files = [];
            const lines = stdout.split('\n').filter(line => line.trim());

            lines.forEach(line => {
                const parts = line.split('\t');
                if (parts.length >= 3) {
                    const added = parts[0] === '-' ? 0 : parseInt(parts[0]) || 0;
                    const deleted = parts[1] === '-' ? 0 : parseInt(parts[1]) || 0;
                    const filename = parts[2];

                    if (filename && !filename.includes('cambios-registro.md')) {
                        files.push({
                            nombre: filename,
                            añadidas: added,
                            eliminadas: deleted,
                            estado: added === 0 && deleted === 0 ? 'modificado' : 'modificado',
                            extension: path.extname(filename)
                        });
                    }
                }
            });

            callback(files);
        });
}

// Función para obtener archivos eliminados
function getDeletedFiles(callback) {
    exec('git ls-files --deleted', (err, stdout) => {
        if (err) {
            callback([]);
            return;
        }

        const files = stdout.split('\n')
            .filter(f => f.trim() && !f.includes('cambios-registro.md'));

        callback(files);
    });
}

function checkAllChanges() {
    Promise.all([
        new Promise(resolve => getGitStats(resolve)),
        new Promise(resolve => getUntrackedFiles(resolve)),
        new Promise(resolve => getDeletedFiles(resolve))
    ]).then(([modifiedFiles, untrackedFiles, deletedFiles]) => {

        // Convertir archivos nuevos a formato de estadísticas
        const newFiles = untrackedFiles.map(f => ({
            nombre: f,
            añadidas: 0,
            eliminadas: 0,
            estado: 'nuevo',
            extension: path.extname(f)
        }));

        // Convertir archivos eliminados
        const deletedFilesFormatted = deletedFiles.map(f => ({
            nombre: f,
            añadidas: 0,
            eliminadas: 0,
            estado: 'eliminado',
            extension: path.extname(f)
        }));

        // Combinar todos los archivos
        const allFiles = [...modifiedFiles, ...newFiles, ...deletedFilesFormatted];

        if (allFiles.length === 0) return;

        // Crear identificador único
        const changesId = allFiles.map(f =>
            `${f.nombre}:${f.estado}:${f.añadidas}:${f.eliminadas}`
        ).join('|');

        if (changesId !== lastChanges) {
            const timestamp = new Date().toLocaleString('es-CO', {
                hour12: false,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });

            // Calcular estadísticas
            const totalAñadidas = allFiles.reduce((sum, f) => sum + f.añadidas, 0);
            const totalEliminadas = allFiles.reduce((sum, f) => sum + f.eliminadas, 0);
            const totalNeto = totalAñadidas - totalEliminadas;

            const nuevos = allFiles.filter(f => f.estado === 'nuevo').length;
            const modificados = allFiles.filter(f => f.estado === 'modificado').length;
            const eliminados = allFiles.filter(f => f.estado === 'eliminado').length;

            // Crear entrada en Markdown
            let logEntry = `\n## 🕐 ${timestamp}\n\n`;
            logEntry += `### 📊 Resumen\n`;
            logEntry += `- **Total archivos:** ${allFiles.length}\n`;
            logEntry += `- **📝 Nuevos:** ${nuevos}\n`;
            logEntry += `- **✏️ Modificados:** ${modificados}\n`;
            logEntry += `- **🗑️ Eliminados:** ${eliminados}\n`;
            logEntry += `- **Líneas añadidas:** +${totalAñadidas}\n`;
            logEntry += `- **Líneas eliminadas:** -${totalEliminadas}\n`;
            logEntry += `- **Balance neto:** ${totalNeto > 0 ? '+' : ''}${totalNeto} líneas\n\n`;

            logEntry += `### 📝 Detalle por archivo\n\n`;
            logEntry += `| Estado | Archivo | Añadidas | Eliminadas | Neto |\n`;
            logEntry += `|--------|---------|----------|------------|------|\n`;

            // Ordenar: nuevos primero, luego modificados, luego eliminados
            allFiles.sort((a, b) => {
                const estadoOrder = { 'nuevo': 0, 'modificado': 1, 'eliminado': 2 };
                return estadoOrder[a.estado] - estadoOrder[b.estado] ||
                       (b.añadidas + b.eliminadas) - (a.añadidas + a.eliminadas);
            });

            allFiles.forEach(f => {
                const neto = f.añadidas - f.eliminadas;
                const netoStr = neto > 0 ? `+${neto}` : neto.toString();

                // Emoji según estado
                let estadoEmoji = '✏️';
                if (f.estado === 'nuevo') estadoEmoji = '🆕';
                if (f.estado === 'eliminado') estadoEmoji = '🗑️';

                // Truncar nombre si es muy largo
                let nombreDisplay = f.nombre;
                if (nombreDisplay.length > 50) {
                    const parts = nombreDisplay.split(path.sep);
                    if (parts.length > 3) {
                        nombreDisplay = `.../${parts.slice(-3).join('/')}`;
                    }
                }

                const añadidasDisplay = f.estado === 'nuevo' ? 'nuevo' : `+${f.añadidas}`;
                const eliminadasDisplay = f.estado === 'eliminado' ? 'eliminado' : `-${f.eliminadas}`;

                logEntry += `| ${estadoEmoji} | \`${nombreDisplay}\` | ${añadidasDisplay} | ${eliminadasDisplay} | ${netoStr} |\n`;
            });

            logEntry += `\n### 📁 Lista completa\n\n`;
            logEntry += `<details>\n`;
            logEntry += `<summary>Ver todos los archivos (${allFiles.length})</summary>\n\n`;

            // Separar por tipo
            if (nuevos > 0) {
                logEntry += `**🆕 Archivos nuevos:**\n\`\`\`\n`;
                allFiles.filter(f => f.estado === 'nuevo').forEach(f => {
                    logEntry += `${f.nombre}\n`;
                });
                logEntry += '```\n\n';
            }

            if (modificados > 0) {
                logEntry += `**✏️ Archivos modificados:**\n\`\`\`\n`;
                allFiles.filter(f => f.estado === 'modificado').forEach(f => {
                    logEntry += `${f.nombre}\n`;
                });
                logEntry += '```\n\n';
            }

            if (eliminados > 0) {
                logEntry += `**🗑️ Archivos eliminados:**\n\`\`\`\n`;
                allFiles.filter(f => f.estado === 'eliminado').forEach(f => {
                    logEntry += `${f.nombre}\n`;
                });
                logEntry += '```\n\n';
            }

            logEntry += `</details>\n\n`;
            logEntry += `---\n`;

            // Guardar en archivo
            fs.appendFileSync(OUTPUT_FILE, logEntry);

            // Mostrar en consola
            console.log(`\n🕐 ${timestamp}`);
            console.log(`📊 Total: ${allFiles.length} archivos (🆕 ${nuevos} nuevos, ✏️ ${modificados} mod, 🗑️ ${eliminados} del)`);
            console.log(`   Líneas: +${totalAñadidas} / -${totalEliminadas} (${totalNeto > 0 ? '+' : ''}${totalNeto})`);

            // Mostrar archivos nuevos
            if (nuevos > 0) {
                console.log(`\n   🆕 Nuevos:`);
                allFiles.filter(f => f.estado === 'nuevo').slice(0, 3).forEach(f => {
                    console.log(`      ${path.basename(f.nombre)}`);
                });
            }

            // Mostrar top modificados
            const topModificados = allFiles
                .filter(f => f.estado === 'modificado')
                .sort((a, b) => (b.añadidas + b.eliminadas) - (a.añadidas + a.eliminadas))
                .slice(0, 2);

            if (topModificados.length > 0) {
                console.log(`\n   ✏️ Más modificados:`);
                topModificados.forEach(f => {
                    console.log(`      ${path.basename(f.nombre)}: +${f.añadidas} -${f.eliminadas}`);
                });
            }

            lastChanges = changesId;
        }
    });
}

// Usar debounce
function debouncedCheck() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(checkAllChanges, 500);
}

// Monitorear cambios en el sistema de archivos
try {
    const ignoredDirs = ['node_modules', '.git', 'target', 'build', 'dist'];

    const watcher = fs.watch(PROJECT_PATH, { recursive: true }, (eventType, filename) => {
        if (!filename) return;

        const shouldIgnore = ignoredDirs.some(dir =>
            filename.includes(dir) || filename.includes('\\' + dir + '\\')
        );

        if (!shouldIgnore && !filename.includes(OUTPUT_FILE)) {
            debouncedCheck();
        }
    });

    console.log('⚡ Modo tiempo real con detección de archivos nuevos activado');

    // Check inicial
    setTimeout(checkAllChanges, 1000);

    // Backup cada 2 segundos
    setInterval(checkAllChanges, 2000);

} catch (err) {
    console.log('⚠️  Usando modo intervalo');
    setInterval(checkAllChanges, 1000);
}

// Manejar cierre
process.on('SIGINT', () => {
    console.log('\n\n👋 Monitoreo detenido');
    console.log(`📝 Registro guardado en: ${OUTPUT_FILE}`);
    fs.appendFileSync(OUTPUT_FILE, `\n*Monitor detenido: ${new Date().toLocaleString()}*\n`);
    process.exit();
});