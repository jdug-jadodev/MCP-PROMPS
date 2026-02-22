import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { prompts } from "./prompts.js";

const server = new Server(
  {
    name: "mis-prompts-personalizados",
    version: "1.0.0",
  },
  {
    capabilities: {
      prompts: {},
    },
  }
);

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: prompts.map(p => ({
      name: p.name,
      description: p.description,
      arguments: p.arguments,
    })),
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const promptName = request.params.name;
  const args = request.params.arguments || {};

  const prompt = prompts.find(p => p.name === promptName);
  if (!prompt) {
    throw new Error(`Prompt no encontrado: ${promptName}`);
  }

  const fillTemplate = (template: string, values: Record<string, any>) => {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return values[key] !== undefined ? values[key] : `{{${key}}}`;
    });
  };

  const promptText = fillTemplate(prompt.template, args);

  return {
    description: prompt.description,
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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("🚀 Servidor MCP de prompts iniciado");
}

main().catch(console.error);