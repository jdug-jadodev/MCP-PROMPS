const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = 'cambios-registro.md';
const PROJECT_PATH = process.cwd();
let lastChanges = '';
let lastCommitHash = '';
let debounceTimer = null;
let commitCheckTimer = null;
let checkInProgress = false;
let pendingCheck = false;

console.log('🔍 Monitoreando proyecto (incluye archivos nuevos)...');
console.log(`📝 Registro: ${OUTPUT_FILE}`);
console.log('🛑 Ctrl+C para detener\n');
console.log('📌 El registro se actualizará con el estado actual (sin historial)\n');

// Función para obtener el último commit hash
function getLastCommitHash(callback) {
    exec('git rev-parse HEAD', (err, stdout) => {
        if (err) {
            callback('');
            return;
        }
        callback(stdout.trim());
    });
}

// Función para verificar si hubo un nuevo commit
function checkForNewCommit() {
    getLastCommitHash((currentHash) => {
        if (currentHash && currentHash !== lastCommitHash) {
            if (lastCommitHash !== '') {
                console.log('\n📦 Nuevo commit detectado! Actualizando archivo de registro...\n');

                exec('git log -1 --pretty=format:"%h - %s (%cr)"', (err, commitInfo) => {
                    const commitMessage = err ? 'Commit realizado' : commitInfo;

                    lastChanges = '';

                    // Después de un commit, actualizar para mostrar que no hay cambios
                    updateOutputFile([], commitMessage);

                    console.log(`✅ Archivo actualizado con información del commit: ${commitMessage}`);
                    console.log('📝 Registro muestra estado limpio después del commit\n');
                });
            }
            lastCommitHash = currentHash;
        }
    });
}

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

// Función para obtener estadísticas detalladas de cambios
function getGitStats(callback) {
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
                            estado: 'modificado',
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

// Función para obtener archivos en staging
function getStagedFiles(callback) {
    exec('git diff --staged --name-only', (err, stdout) => {
        if (err) {
            callback([]);
            return;
        }

        const files = stdout.split('\n')
            .filter(f => f.trim() && !f.includes('cambios-registro.md'));

        callback(files);
    });
}

// Función para actualizar el archivo de salida (sobrescribe completamente)
function updateOutputFile(allFiles, commitMessage = null) {
    const timestamp = new Date().toLocaleString('es-CO', {
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    // Obtener mensaje del último commit si no se proporcionó
    if (!commitMessage) {
        exec('git log -1 --pretty=format:"%h - %s (%cr)"', (err, msg) => {
            const finalCommitMsg = err ? 'No hay commits' : msg;
            writeFile(allFiles, timestamp, finalCommitMsg);
        });
    } else {
        writeFile(allFiles, timestamp, commitMessage);
    }
}

function writeFile(allFiles, timestamp, commitMessage) {
    let content = `# 📊 ESTADO ACTUAL DE CAMBIOS
**Actualizado:** ${timestamp}
**Proyecto:** ${PROJECT_PATH}
**Último commit:** ${commitMessage}

`;

    if (allFiles.length === 0) {
        content += `## ✅ Repositorio limpio\n\n`;
        content += `No hay cambios sin commitear. Todos los archivos están sincronizados con git.\n\n`;
        content += `---\n`;
        content += `*Última actualización: ${timestamp}*`;
    } else {
        // Calcular estadísticas
        const totalAñadidas = allFiles.reduce((sum, f) => sum + f.añadidas, 0);
        const totalEliminadas = allFiles.reduce((sum, f) => sum + f.eliminadas, 0);
        const totalNeto = totalAñadidas - totalEliminadas;

        const nuevos = allFiles.filter(f => f.estado.includes('nuevo')).length;
        const modificados = allFiles.filter(f => f.estado.includes('modificado')).length;
        const eliminados = allFiles.filter(f => f.estado === 'eliminado').length;
        const staged = allFiles.filter(f => f.estado.includes('staged')).length;

        content += `## 📊 RESUMEN DE CAMBIOS PENDIENTES\n\n`;
        content += `- **Total archivos:** ${allFiles.length}\n`;
        content += `- **📝 Nuevos:** ${nuevos}\n`;
        content += `- **✏️ Modificados:** ${modificados}\n`;
        content += `- **🗑️ Eliminados:** ${eliminados}\n`;
        if (staged > 0) {
            content += `- **✅ En staging:** ${staged} (listos para commit)\n`;
        }
        content += `- **Líneas añadidas:** +${totalAñadidas}\n`;
        content += `- **Líneas eliminadas:** -${totalEliminadas}\n`;
        content += `- **Balance neto:** ${totalNeto > 0 ? '+' : ''}${totalNeto} líneas\n\n`;

        content += `### 📝 DETALLE POR ARCHIVO\n\n`;
        content += `| Estado | Archivo | Añadidas | Eliminadas | Neto |\n`;
        content += `|--------|---------|----------|------------|------|\n`;

        allFiles.sort((a, b) => {
            const estadoOrder = {
                'nuevo (staged)': 0,
                'nuevo': 1,
                'modificado (staged)': 2,
                'modificado': 3,
                'eliminado': 4
            };
            return (estadoOrder[a.estado] || 99) - (estadoOrder[b.estado] || 99) ||
                   (b.añadidas + b.eliminadas) - (a.añadidas + a.eliminadas);
        });

        allFiles.forEach(f => {
            const neto = f.añadidas - f.eliminadas;
            const netoStr = neto > 0 ? `+${neto}` : neto.toString();

            // Emoji según estado
            let estadoEmoji = '✏️';
            if (f.estado.includes('nuevo')) estadoEmoji = '🆕';
            if (f.estado.includes('eliminado')) estadoEmoji = '🗑️';
            if (f.estado.includes('staged')) estadoEmoji = '✅ ' + estadoEmoji;

            // Truncar nombre
            let nombreDisplay = f.nombre;
            if (nombreDisplay.length > 50) {
                const parts = nombreDisplay.split(path.sep);
                if (parts.length > 3) {
                    nombreDisplay = `.../${parts.slice(-3).join('/')}`;
                }
            }

            const añadidasDisplay = f.estado.includes('nuevo') ? 'nuevo' : `+${f.añadidas}`;
            const eliminadasDisplay = f.estado === 'eliminado' ? 'eliminado' : `-${f.eliminadas}`;

            content += `| ${estadoEmoji} | \`${nombreDisplay}\` | ${añadidasDisplay} | ${eliminadasDisplay} | ${netoStr} |\n`;
        });

        content += `\n### 📁 LISTA COMPLETA\n\n`;
        content += `<details>\n`;
        content += `<summary>Ver todos los archivos (${allFiles.length})</summary>\n\n`;

        // Separar por tipo
        const tipos = {
            '🆕 Nuevos (staged)': allFiles.filter(f => f.estado === 'nuevo (staged)'),
            '🆕 Nuevos': allFiles.filter(f => f.estado === 'nuevo'),
            '✅ Modificados (staged)': allFiles.filter(f => f.estado === 'modificado (staged)'),
            '✏️ Modificados': allFiles.filter(f => f.estado === 'modificado'),
            '🗑️ Eliminados': allFiles.filter(f => f.estado === 'eliminado')
        };

        for (const [titulo, archivos] of Object.entries(tipos)) {
            if (archivos.length > 0) {
                content += `**${titulo}:**\n\`\`\`\n`;
                archivos.forEach(f => {
                    content += `${f.nombre}\n`;
                });
                content += '```\n\n';
            }
        }

        content += `</details>\n\n`;
        content += `---\n`;
        content += `*Última actualización: ${timestamp}*`;
    }

    // Escribir el archivo completo (sobrescribir)
    fs.writeFileSync(OUTPUT_FILE, content);
    fs.fsyncSync(fs.openSync(OUTPUT_FILE, 'r+'));
}

// Función optimizada para verificar cambios
function checkAllChanges() {
    if (checkInProgress) {
        pendingCheck = true;
        return;
    }

    checkInProgress = true;

    Promise.all([
        new Promise(resolve => getGitStats(resolve)),
        new Promise(resolve => getUntrackedFiles(resolve)),
        new Promise(resolve => getDeletedFiles(resolve)),
        new Promise(resolve => getStagedFiles(resolve))
    ]).then(([modifiedFiles, untrackedFiles, deletedFiles, stagedFiles]) => {

        // Convertir archivos
        const newFiles = untrackedFiles.map(f => ({
            nombre: f,
            añadidas: 0,
            eliminadas: 0,
            estado: 'nuevo',
            extension: path.extname(f)
        }));

        const deletedFilesFormatted = deletedFiles.map(f => ({
            nombre: f,
            añadidas: 0,
            eliminadas: 0,
            estado: 'eliminado',
            extension: path.extname(f)
        }));

        // Marcar archivos en staging
        const stagedSet = new Set(stagedFiles);
        const allFiles = [...modifiedFiles, ...newFiles, ...deletedFilesFormatted].map(f => {
            if (stagedSet.has(f.nombre)) {
                return { ...f, estado: f.estado === 'nuevo' ? 'nuevo (staged)' : 'modificado (staged)' };
            }
            return f;
        });

        // Crear identificador único basado en los archivos
        const changesId = allFiles.map(f =>
            `${f.nombre}:${f.estado}:${f.añadidas}:${f.eliminadas}`
        ).join('|');

        // Si hay cambios y son diferentes a los últimos registrados, o si no hay cambios pero antes había
        if (changesId !== lastChanges) {
            // Actualizar el archivo con el estado actual
            updateOutputFile(allFiles);

            // Mostrar en consola
            const timestamp = new Date().toLocaleString('es-CO', {
                hour12: false,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });

            if (allFiles.length === 0) {
                console.log(`\n🕐 ${timestamp}`);
                console.log(`✅ Repositorio limpio - No hay cambios pendientes`);
            } else {
                const totalAñadidas = allFiles.reduce((sum, f) => sum + f.añadidas, 0);
                const totalEliminadas = allFiles.reduce((sum, f) => sum + f.eliminadas, 0);
                const totalNeto = totalAñadidas - totalEliminadas;
                const nuevos = allFiles.filter(f => f.estado.includes('nuevo')).length;
                const modificados = allFiles.filter(f => f.estado.includes('modificado')).length;
                const eliminados = allFiles.filter(f => f.estado === 'eliminado').length;
                const staged = allFiles.filter(f => f.estado.includes('staged')).length;

                console.log(`\n🕐 ${timestamp}`);
                console.log(`📊 Total: ${allFiles.length} archivos (🆕 ${nuevos}, ✏️ ${modificados}, 🗑️ ${eliminados})`);
                if (staged > 0) {
                    console.log(`   ✅ ${staged} archivos en staging (listos para commit)`);
                }
                console.log(`   Líneas: +${totalAñadidas} / -${totalEliminadas} (${totalNeto > 0 ? '+' : ''}${totalNeto})`);
            }

            lastChanges = changesId;
        }

        checkInProgress = false;
        if (pendingCheck) {
            pendingCheck = false;
            setTimeout(checkAllChanges, 50);
        }
    }).catch(() => {
        checkInProgress = false;
        if (pendingCheck) {
            pendingCheck = false;
            setTimeout(checkAllChanges, 50);
        }
    });
}

// Usar debounce con tiempo muy reducido
function debouncedCheck() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(checkAllChanges, 50); // Reducido a 50ms
}

// Inicializar último commit hash
getLastCommitHash((hash) => {
    lastCommitHash = hash;
    console.log(`📌 Último commit: ${hash ? hash.substring(0, 7) : 'Ninguno'}`);
});

// Verificar commits cada 2 segundos
commitCheckTimer = setInterval(checkForNewCommit, 2000);

// Verificación rápida con polling agresivo
let lastQuickCheck = 0;
function quickPollingCheck() {
    const now = Date.now();
    if (now - lastQuickCheck > 200) { // Cada 200ms
        lastQuickCheck = now;
        checkAllChanges();
    }
}

// Usar múltiples estrategias para detectar cambios rápidamente
try {
    const ignoredDirs = ['node_modules', '.git', 'target', 'build', 'dist', 'out', 'idea', '.idea'];

    // Estrategia 1: fs.watch (rápido pero a veces no confiable en IntelliJ)
    const watcher = fs.watch(PROJECT_PATH, { recursive: true }, (eventType, filename) => {
        if (!filename) return;

        // Ignorar archivos temporales y directorios ignorados
        const shouldIgnore = ignoredDirs.some(dir =>
            filename.includes(dir) ||
            filename.includes('\\' + dir + '\\') ||
            filename.includes('/' + dir + '/') ||
            filename.startsWith('.') ||
            filename.endsWith('.tmp') ||
            filename.includes('___')
        );

        if (!shouldIgnore && !filename.includes(OUTPUT_FILE)) {
            debouncedCheck();
        }
    });

    // Estrategia 2: Polling agresivo para detectar cambios rápidamente
    setInterval(quickPollingCheck, 200);

    console.log('⚡ Modo ultra rápido activado');
    console.log('📦 Detectando commits automáticamente...\n');

    // Check inicial inmediato
    setTimeout(checkAllChanges, 10);

} catch (err) {
    console.log('⚠️ Usando modo polling de emergencia');
    setInterval(checkAllChanges, 200);
}

// Manejar cierre
process.on('SIGINT', () => {
    console.log('\n\n👋 Monitoreo detenido');
    console.log(`📝 Registro guardado en: ${OUTPUT_FILE}`);

    if (commitCheckTimer) clearInterval(commitCheckTimer);

    process.exit();
});