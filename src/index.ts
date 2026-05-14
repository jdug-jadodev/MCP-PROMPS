#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { tools } from "./tools/index.js";
import { prompts } from "./prompts.js";
import { templates } from "./templates/index.js";

const server = new Server(
  { name: "mcp-prompts-server", version: "1.0.0" },
  { capabilities: { prompts: {}, tools: {} } }
);

const fillTemplate = (template: string, args: Record<string, string>): string =>
  template.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) =>
    args[key] !== undefined && args[key] !== "" ? args[key] : `[${key} no proporcionado - valor opcional]`
  );

server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: prompts.map((p) => ({ name: p.name, description: p.description })),
}));

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const promptName = request.params.name;
  const args = (request.params.arguments || {}) as Record<string, string>;

  const promptDefinition = prompts.find((p) => p.name === promptName);
  if (!promptDefinition) throw new Error(`Prompt no encontrado: ${promptName}`);

  const template = templates[promptName as keyof typeof templates];
  if (!template) throw new Error(`Template no encontrado para: ${promptName}`);

  const promptText = fillTemplate(template, args);

  return {
    description: promptDefinition.description,
    messages: [
      { role: "user", content: { type: "text", text: promptText } },
    ],
  };
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map((t) => t.metadata),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = tools.find((t) => t.metadata?.name === request.params.name);
  if (!tool) throw new Error(`Herramienta no encontrada: ${request.params.name}`);
  return tool(request, {});
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  process.stderr.write(`Error fatal: ${error.message}\n`);
  process.exit(1);
});