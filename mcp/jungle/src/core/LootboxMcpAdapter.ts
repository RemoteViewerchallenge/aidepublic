import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  InitializeRequestSchema,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import path from 'path';

interface LootboxTool {
  name: string;
  description: string;
  inputSchema: any;
  roles?: string[];
  invoke: {
    type: 'http-post';
    url: string;
  };
}

export class LootboxMcpAdapter {
  private server: Server;
  private tools: LootboxTool[] = [];
  private adapterName: string;

  constructor() {
    this.adapterName = process.env.MCP_ADAPTER_NAME || 'unknown';
    console.error(`Generic MCP Adapter starting for: ${this.adapterName}`);

    this.server = new Server(
      {
        name: `${this.adapterName}-mcp-adapter`,
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
        },
      }
    );

    this.setupHandlers();
  }

  private async loadNamespaceFunctions(
    namespace: LootboxNamespace
  ): Promise<void> {
    try {
      // Get types for this namespace
      const response = await fetch(
        `${this.lootboxClient.baseUrl}/types/${namespace.name}`
      );
      if (!response.ok) {
        console.warn(`Failed to load types for namespace ${namespace.name}`);
        return;
      }

      const typesContent = await response.text();

      // Parse TypeScript interfaces to extract function signatures
      const functionRegex = /export interface (\w+)_(\w+)Args \{([\s\S]*?)\}/g;
      const resultRegex = /export interface (\w+)_(\w+)Result \{([\s\S]*?)\}/g;

      const functions: LootboxTool[] = [];
      let match;

      while ((match = functionRegex.exec(typesContent)) !== null) {
        const [, ns, methodName, argsContent] = match;

        if (ns.toLowerCase() === namespace.name) {
          // Find corresponding result interface
          const resultMatch = typesContent.match(
            new RegExp(
              `export interface ${ns}_${methodName}Result \\{([\\s\\S]*?)\\}`
            )
          );
          const resultDescription = resultMatch
            ? resultMatch[1].trim()
            : 'No description available';

          functions.push({
            name: `${namespace.name}_${methodName}`,
            description: `Execute ${methodName} operation in ${namespace.name} namespace`,
            inputSchema: this.parseArgsToSchema(argsContent),
          });
        }
      }

      namespace.functions = functions;
    } catch (error) {
      console.error(
        `Failed to load functions for namespace ${namespace.name}:`,
        error
      );
    }
  }

  private parseArgsToSchema(argsContent: string): any {
    // Simple parser for TypeScript interface to JSON schema
    const properties: any = {};
    const required: string[] = [];

    const lines = argsContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line);
    for (const line of lines) {
      if (line.includes('?')) continue; // Optional field

      const match = line.match(/(\w+): (.+);/);
      if (match) {
        const [, name, type] = match;
        properties[name] = this.typeToSchema(type);
        required.push(name);
      }
    }

    return {
      type: 'object',
      properties,
      required,
    };
  }

  private typeToSchema(type: string): any {
    if (type === 'string') return { type: 'string' };
    if (type === 'number') return { type: 'number' };
    if (type === 'boolean') return { type: 'boolean' };
    if (type.includes('[]'))
      return {
        type: 'array',
        items: this.typeToSchema(type.replace('[]', '')),
      };
    if (type.includes('|')) {
      const types = type.split('|').map(t => t.trim());
      return { enum: types };
    }
    // Default to string for complex types
    return { type: 'string' };
  }

  private setupHandlers(): void {
    // Handle MCP Initialize handshake
    this.server.setRequestHandler(
      InitializeRequestSchema,
      async request => {
        console.error(
          'Received initialize request:',
          JSON.stringify(request.params, null, 2)
        );
        const response = {
          protocolVersion: request.params.protocolVersion,
          capabilities: {
            tools: {},
            // advertise that we support prompts so MCPJungle will call prompts/list
            prompts: {},
          },
          serverInfo: {
            name: `${this.adapterName}-mcp-adapter`,
            version: '0.1.0',
          },
        };
        console.error('Sending initialize response:', JSON.stringify(response));
        return response;
      }
    );

    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.tools.map(t => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
          roles: t.roles,
        })),
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      const { name, arguments: args = {} } = request.params;

      const tool = this.tools.find(t => t.name === name);
      if (!tool) {
        throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${name}`);
      }

      try {
        const response = await fetch(tool.invoke.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(
            `Backend for tool ${name} failed with status ${response.status}: ${errorBody}`
          );
        }

        const result = await response.json();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    });
  }

  async start(): Promise<void> {
    console.error(`Starting Generic MCP Adapter for '${this.adapterName}'...`);
    const manifestPath = path.join('/host/manifests', `${this.adapterName}-manifest.json`);
    try {
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent);
      this.tools = manifest.tools || [];
      console.error(`Loaded ${this.tools.length} tools from ${manifestPath}`);
    } catch (error) {
      console.error(`FATAL: Could not load manifest file at ${manifestPath}.`, error);
      // Fallback to empty tools if manifest fails, but log as fatal.
      this.tools = [];
    }

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Generic MCP Adapter started and connected.');
  }
}

// CLI runner
// Entry point for stdio transport
const adapter = new LootboxMcpAdapter();
adapter.start().catch(console.error);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          throw new McpError(
            ErrorCode.InternalError,
            `Lootbox tool execution failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    );

    // Implement minimal prompts handlers so MCPJungle can register prompts without error.
    // ListPrompts: return an empty paginated list for now.
    // Register prompts/list to return an empty paginated list (no prompts yet)
    this.server.setRequestHandler(
      ListPromptsRequestSchema,
      async (_request: any) => {
        // reference the parameter to avoid "declared but its value is never read"
        void _request;
        const prompts = (this as any)._manifestPrompts || [];
        return {
          prompts,
          page: 1,
          pageSize: prompts.length,
          total: prompts.length,
        };
      }
    );

    // Register prompts/get to indicate the prompt isn't available (method supported but no data)
    this.server.setRequestHandler(
      GetPromptRequestSchema,
      async (request: any) => {
        const prompts = (this as any)._manifestPrompts || [];
        const name = request.params?.name || request.params?.id;
        const found = prompts.find(
          (p: any) => p.id === name || p.title === name
        );
        if (!found) {
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Prompt not found: ${name}`
          );
        }
        return found;
      }
    );
  }

  async start(): Promise<void> {
    console.error('Starting Lootbox MCP Adapter...');
    // Load manifests (if any) before connecting so ListTools/Prompts are available
    await this.loadManifests();
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Lootbox MCP Adapter started and connected');
  }
}

// CLI runner
// Entry point for stdio transport
const adapter = new LootboxMcpAdapter();
adapter.start().catch(console.error);
