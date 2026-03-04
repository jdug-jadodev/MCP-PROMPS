export const generadorCommitAutomaticoTemplate = `
#Instrucciones

Ejecuta el comando git add . y git commit -am "[Mensaje generado por IA]" para generar un commit automático con un mensaje contextual basado en el análisis de los cambios realizados en el proyecto, para eso analiza el archivo #cambios-registro.md. NUNCA hagas push, solo genera el commit localmente.
`;