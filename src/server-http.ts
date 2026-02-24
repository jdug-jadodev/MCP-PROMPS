import express, { Request, Response } from 'express';
import { prompts } from './prompts';
import { tools } from './tools';

const app = express();
app.use(express.json());

app.get('/prompts', (req: Request, res: Response) => {
  res.json({ prompts });
});

app.get('/prompts/:name', (req: Request, res: Response) => {
  const prompt = prompts.find(p => p.name === req.params.name);
  if (!prompt) return res.status(404).json({ error: 'Prompt not found' });
  res.json(prompt);
});

app.post('/tools/:name', async (req: Request, res: Response) => {
  const tool = tools.find(t => t.metadata?.name === req.params.name);
  if (!tool) return res.status(404).json({ error: 'Tool not found' });
  try {
    const callToolRequest = {
      method: "tools/call",
      params: {
        name: req.params.name,
        arguments: req.body
      }
    };
    const result = await tool(callToolRequest as any, {});
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/health', (_req: Request, res: Response) => res.send('OK'));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 MCP Prompts Server HTTP listening on port ${port}`);
});
