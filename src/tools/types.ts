import type { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";

export type Tool = ((request: CallToolRequest, context: any) => Promise<any>) & {
  metadata: {
    name: string;
    description: string;
    inputSchema: any;
  };
};
