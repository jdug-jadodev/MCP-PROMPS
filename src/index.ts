declare global {
  var __forcePromptReload: (() => void) | undefined;
}

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { tools } from "./tools/index.js";
import path from 'path';
import fs from 'fs';

let promptsCache: any[] = [];
let templatesCache: Record<string, string> = {};

function reloadModules() {
  try {
    const promptsPath = path.join(__dirname, 'prompts.js');
    const templatesPath = path.join(__dirname, 'templates', 'index.js');
    
    delete require.cache[require.resolve(promptsPath)];
    delete require.cache[require.resolve(templatesPath)];
    
    const templatesDir = path.join(__dirname, 'templates');
    if (fs.existsSync(templatesDir)) {
      const templateFiles = fs.readdirSync(templatesDir);
      templateFiles.forEach(file => {
        if (file.endsWith('.js') || file.endsWith('.ts')) {
          const templatePath = path.join(templatesDir, file);
          delete require.cache[require.resolve(templatePath)];
        }
      });
    }
    
    const promptsModule = require(promptsPath);
    const templatesModule = require(templatesPath);
    
    promptsCache = promptsModule.prompts || [];
    templatesCache = templatesModule.templates || {};
    
    console.error(`🔄 Módulos recargados: ${promptsCache.length} prompts disponibles`);
  } catch (error) {
    console.error('❌ Error recargando módulos:', error);
  }
}

reloadModules();

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
    prompts: promptsCache.map(p => ({
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

  const promptDefinition = promptsCache.find(p => p.name === promptName);
  if (!promptDefinition) {
    throw new Error(`Prompt no encontrado: ${promptName}`);
  }

  const template = templatesCache[promptName];
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
    tools: tools.map((tool: any) => tool.metadata),
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = tools.find((t: any) => t.metadata?.name === request.params.name);
  if (!tool) {
    throw new Error(`Herramienta no encontrada: ${request.params.name}`);
  }
  return tool(request, {});
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("🚀 Servidor MCP de prompts iniciado (versión con recarga en caliente)");
  console.error("📋 Prompts disponibles:", promptsCache.map(p => p.name).join(", "));
  
  if (process.env.NODE_ENV === 'development') {
    const watchPrompts = path.join(__dirname, 'prompts.js');
    const watchTemplates = path.join(__dirname, 'templates');
    
    let timeout: NodeJS.Timeout;
    
    fs.watch(watchPrompts, (eventType) => {
      if (eventType === 'change') {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          console.error('📝 Detectado cambio en prompts.js, recargando...');
          reloadModules();
          console.error('✅ Prompts recargados');
        }, 100);
      }
    });
    
    fs.watch(watchTemplates, { recursive: true }, (eventType, filename) => {
      if (eventType === 'change' && filename?.endsWith('.js')) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          console.error(`📝 Detectado cambio en ${filename}, recargando...`);
          reloadModules();
          console.error('✅ Templates recargados');
        }, 100);
      }
    });
  }
}

main().catch(console.error);

global.__forcePromptReload = reloadModules;