import * as fs from "fs";
import * as path from "path";
import { prompts } from "../prompts.js";
import { templates } from "../templates/index.js";
import type { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";

declare const global: {
  __forcePromptReload?: () => void;
};

const srcDir = path.join(__dirname, "..", "..");
const templatesDir = path.join(srcDir, "src", "templates");

const guardarPromptToolImpl = async (request: CallToolRequest, context: any) => {
  const args = request.params.arguments as {
    name: string;
    description: string;
    templateContent: string;
  };
  const { name, description, templateContent } = args;

  if (!/^[a-z0-9-]+$/.test(name)) {
    return {
      content: [
        {
          type: "text",
          text: `❌ Error de validación: El nombre "${name}" no es válido. Solo se permiten letras minúsculas (a-z), números (0-9) y guiones (-).`,
        },
      ],
      isError: true,
    };
  }

  if (prompts.find((p) => p.name === name)) {
    return {
      content: [
        {
          type: "text",
          text: `❌ Error de duplicado: Ya existe un prompt con el nombre "${name}". Solo se permite crear prompts nuevos.`,
        },
      ],
      isError: true,
    };
  }

  const camelCaseName = name.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
  const templateVarName = `${camelCaseName}Template`;
  const templateFileName = `${name}.template.ts`;
  const templateFilePath = path.join(templatesDir, templateFileName);
  const promptsFilePath = path.join(srcDir, "src", "prompts.ts");
  const templatesIndexPath = path.join(templatesDir, "index.ts");

  let promptsFileContent: string;
  let templatesIndexContent: string;
  
  try {
    promptsFileContent = fs.readFileSync(promptsFilePath, "utf-8");
    templatesIndexContent = fs.readFileSync(templatesIndexPath, "utf-8");
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: `❌ Error al leer archivos del servidor: ${(err as Error).message}`,
        },
      ],
      isError: true,
    };
  }

  const templateFileContent = `export const ${templateVarName} = ${JSON.stringify(templateContent)};\n`;
  
  const newPromptEntry = `  {\n    name: ${JSON.stringify(name)},\n    description: ${JSON.stringify(description)}\n  }`;
  const updatedPromptsContent = promptsFileContent.replace(
    /(\];)/,
    `,\n${newPromptEntry}\n$1`
  );

  const importStatement = `import { ${templateVarName} } from './${name}.template.js';`;
  let updatedTemplatesIndex = templatesIndexContent
    .replace(
      /(\nexport const templates)/,
      `\n${importStatement}\n$1`
    )
    .replace(
      /(\n\};)/,
      `,\n  ${JSON.stringify(name)}: ${templateVarName}$1`
    );

  try {
    fs.writeFileSync(templateFilePath, templateFileContent, "utf-8");
    
    try {
      fs.writeFileSync(promptsFilePath, updatedPromptsContent, "utf-8");
      
      try {
        fs.writeFileSync(templatesIndexPath, updatedTemplatesIndex, "utf-8");
        
        prompts.push({ name, description });
        (templates as Record<string, string>)[name] = templateContent;
        
        if (global.__forcePromptReload) {
          global.__forcePromptReload();
        }
        
      } catch (err) {
        fs.writeFileSync(promptsFilePath, promptsFileContent, "utf-8");
        fs.unlinkSync(templateFilePath);
        throw err;
      }
    } catch (err) {
      try { fs.unlinkSync(templateFilePath); } catch {}
      throw err;
    }
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: `❌ Error al persistir el prompt en disco: ${(err as Error).message}`,
        },
      ],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: "text",
        text:
          `✅ Prompt "${name}" guardado exitosamente.\n\n` +
          `📁 Archivos actualizados:\n` +
          `  • src/templates/${templateFileName}\n` +
          `  • src/prompts.ts\n` +
          `  • src/templates/index.ts\n\n` +
          `🚀 El prompt está disponible inmediatamente (recarga automática activada).`,
      },
    ],
  };
};

export const guardarPromptTool = Object.assign(guardarPromptToolImpl, {
  metadata: {
    name: "guardar-prompt",
    description:
      "Guarda un nuevo prompt personalizado en el servidor MCP de forma persistente y lo hace disponible inmediatamente sin reiniciar.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description:
            "Nombre único del prompt (solo letras minúsculas, números y guiones). Ejemplo: mi-nuevo-prompt",
        },
        description: {
          type: "string",
          description: "Descripción corta del propósito del prompt.",
        },
        templateContent: {
          type: "string",
          description:
            "Contenido completo de la plantilla del prompt (Markdown o texto plano).",
        },
      },
      required: ["name", "description", "templateContent"],
    },
  }
});