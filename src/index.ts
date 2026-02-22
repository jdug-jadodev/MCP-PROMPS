import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { prompts } from "./prompts.js";
import { templates } from "./templates/index.js";
import * as fs from "fs";
import * as path from "path";

const srcDir = path.join(__dirname, "..", "src");
const templatesDir = path.join(srcDir, "templates");

const server = new Server(
  {
    name: "mis-prompts-personalizados",
    version: "1.0.0",
  },
  {
    capabilities: {
      prompts: {},
      tools: {},
    },
  }
);

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: prompts.map(p => ({
      name: p.name,
      description: p.description,
    })),
  };
});

const fillTemplate = (template: any, args: any) => {
  return template.replace(/\{\{(\w+)\}\}/g, (_: any, key: any) => {
    return args[key] !== undefined && args[key] !== '' 
      ? args[key] 
      : `[${key} no proporcionado - valor opcional]`;
  });
};

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const promptName = request.params.name;
  const args = request.params.arguments || {};

  const promptDefinition = prompts.find(p => p.name === promptName);
  if (!promptDefinition) {
    throw new Error(`Prompt no encontrado: ${promptName}`);
  }

  const template = templates[promptName as keyof typeof templates];
  if (!template) {
    throw new Error(`Template no encontrado para: ${promptName}`);
  }

  const promptText = fillTemplate(template, args);

  return {
    description: promptDefinition.description,
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: promptText,
        },
      },
    ],
  };
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
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
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "guardar-prompt") {
    throw new Error(`Herramienta no encontrada: ${request.params.name}`);
  }

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

  const camelCaseName = name.replace(/-([a-z0-9])/g, (_, c: string) =>
    c.toUpperCase()
  );
  const templateVarName = `${camelCaseName}Template`;
  const templateFileName = `${name}.template.ts`;
  const templateFilePath = path.join(templatesDir, templateFileName);
  const promptsFilePath = path.join(srcDir, "prompts.ts");
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

  const templateFileContent =
    `export const ${templateVarName} = ${JSON.stringify(templateContent)};\n`;

  const newPromptEntry =
    `  {\n    name: ${JSON.stringify(name)},\n    description: ${JSON.stringify(description)}\n  }`;
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
      } catch (err) {
        fs.writeFileSync(promptsFilePath, promptsFileContent, "utf-8");
        fs.unlinkSync(templateFilePath);
        throw err;
      }
    } catch (err) {
      try { fs.unlinkSync(templateFilePath); } catch { /* ignorar */ }
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

  prompts.push({ name, description });
  (templates as Record<string, string>)[name] = templateContent;

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
          `🚀 El prompt está disponible inmediatamente. Puedes usarlo ahora con GetPrompt.`,
      },
    ],
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("🚀 Servidor MCP de prompts iniciado (versión modular)");
  console.error("📋 Prompts disponibles:", prompts.map(p => p.name).join(", "));
}

main().catch(console.error);