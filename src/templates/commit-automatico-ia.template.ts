export const commitAutomaticoIaTemplate = `# Commit Automático 

## Objetivo
Analizar los cambios, generar mensaje de commit y ejecutar git add . + git commit -am "mensaje generado". NUNCA hacer push.

## Flujo

#EJECUTA EN LA TERMINAL LOS COMANDOS PARA HACER COMMIT 

git add .
git commit -am "<mensaje_generado_basado_en_cambios>"

## Mostrar resultado y dejar push listo
\`\`\`
✅ Commit realizado: <mensaje>

🚀 Para subir los cambios deja en la terminal el:
git push
\`\`\`

## Si no hay cambios
\`\`\`
ℹ️ No hay cambios para commitear
\`\`\`
`;