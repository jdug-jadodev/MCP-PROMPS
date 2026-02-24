import express, { Request, Response } from 'express';
import { prompts } from './prompts';
import { tools } from './tools';
import { templates } from './templates';
import path from 'path';
import fs from 'fs';

const app = express();
app.use(express.json());

// Cache para los módulos recargables
let promptsCache: any[] = [];
let templatesCache: Record<string, string> = {};

// Función para recargar módulos desde disco
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
    
    console.log(`🔄 Módulos recargados: ${promptsCache.length} prompts disponibles`);
  } catch (error) {
    console.error('❌ Error recargando módulos:', error);
  }
}

// Carga inicial
reloadModules();

// Helper para rellenar templates
const fillTemplate = (template: any, args: any) => {
  return template.replace(/\{\{(\w+)\}\}/g, (_: any, key: any) => {
    return args[key] !== undefined && args[key] !== '' 
      ? args[key] 
      : `[${key} no proporcionado - valor opcional]`;
  });
};

// Endpoint SSE principal para el protocolo MCP
app.post('/mcp', async (req: Request, res: Response) => {
  const message = req.body;
  
  console.log('📨 Mensaje MCP recibido:', message.method);

  try {
    let response: any;

    switch (message.method) {
      case 'initialize':
        response = {
          jsonrpc: '2.0',
          id: message.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              prompts: {
                listChanged: true
              },
              tools: {
                listChanged: false
              }
            },
            serverInfo: {
              name: 'mis-prompts-personalizados',
              version: '1.0.0'
            }
          }
        };
        break;

      case 'prompts/list':
        response = {
          jsonrpc: '2.0',
          id: message.id,
          result: {
            prompts: promptsCache.map(p => ({
              name: p.name,
              description: p.description,
              arguments: []
            }))
          }
        };
        break;

      case 'prompts/get':
        const promptName = message.params.name;
        const args = message.params.arguments || {};
        
        const promptDefinition = promptsCache.find(p => p.name === promptName);
        if (!promptDefinition) {
          response = {
            jsonrpc: '2.0',
            id: message.id,
            error: {
              code: -32602,
              message: `Prompt no encontrado: ${promptName}`
            }
          };
          break;
        }

        const template = templatesCache[promptName];
        if (!template) {
          response = {
            jsonrpc: '2.0',
            id: message.id,
            error: {
              code: -32602,
              message: `Template no encontrado: ${promptName}`
            }
          };
          break;
        }

        const content = fillTemplate(template, args);
        response = {
          jsonrpc: '2.0',
          id: message.id,
          result: {
            description: promptDefinition.description,
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: content
                }
              }
            ]
          }
        };
        break;

      case 'tools/list':
        response = {
          jsonrpc: '2.0',
          id: message.id,
          result: {
            tools: tools.map(t => ({
              name: t.metadata?.name || 'unknown',
              description: t.metadata?.description || '',
              inputSchema: t.metadata?.inputSchema || { type: 'object', properties: {} }
            }))
          }
        };
        break;

      case 'tools/call':
        const toolName = message.params.name;
        const tool = tools.find(t => t.metadata?.name === toolName);
        
        if (!tool) {
          response = {
            jsonrpc: '2.0',
            id: message.id,
            error: {
              code: -32602,
              message: `Tool no encontrada: ${toolName}`
            }
          };
          break;
        }

        const toolResult = await tool(message, {});
        response = {
          jsonrpc: '2.0',
          id: message.id,
          result: toolResult
        };
        break;

      case 'notifications/initialized':
        // No requiere respuesta
        return res.status(200).send();

      default:
        response = {
          jsonrpc: '2.0',
          id: message.id,
          error: {
            code: -32601,
            message: `Método no soportado: ${message.method}`
          }
        };
    }

    res.json(response);
  } catch (error: any) {
    console.error('❌ Error procesando mensaje MCP:', error);
    res.json({
      jsonrpc: '2.0',
      id: message.id,
      error: {
        code: -32603,
        message: error.message || 'Error interno del servidor'
      }
    });
  }
});

// Endpoint de salud
app.get('/health', (_req: Request, res: Response) => res.send('OK'));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 MCP Prompts Server HTTP listening on port ${port}`);
  console.log(`📡 Endpoint MCP: http://localhost:${port}/mcp`);
});
