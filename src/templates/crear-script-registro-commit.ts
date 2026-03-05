export const generadorScriptRegistroCommitTemplate = `# Instrucciones
Crea el archivo monitor.js y agrega este script en la raíz del proyecto que tengo actualmente abierto en el editor 
EL SCRIPT DEBE ESTAR ESTRICATMENTE IGUAL AL QUE ESTA EN ESTE PROMPT, NO DEBES OMITIR NINGUNA LINEA NI MODIFICARLO, ESTE ES UN SCRIPT DE MONITOREO DE CAMBIOS EN TIEMPO REAL QUE INCLUYE ARCHIVOS NUEVOS, MODIFICADOS Y ELIMINADOS, CON ESTADÍSTICAS DETALLADAS Y FORMATO EN MARKDOWN PARA FACILITAR SU LECTURA Y ANÁLISIS POSTERIOR.

**IMPORTANTE*: Agrega el archivo "cambios-registro.md" a .gitignore para evitar que se incluya en los commits. Este script es para uso local y no debe afectar el repositorio remoto por ende tambien va en el git ignore
descomenta el script y luego ejecutalo con node monitor.js para iniciar el monitoreo de cambios en el proyecto.
`;

"# Script para registrar cambios en el proyecto"