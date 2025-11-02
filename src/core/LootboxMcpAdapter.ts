import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

// Lootbox RPC client types (from /client.ts)
interface LootboxTool {
  name: string;
  description: string;
  inputSchema: any;
}

interface LootboxNamespace {
  name: string;
  functions: LootboxTool[];
}

interface LootboxRpcClientInterface {
  fs: any;
  kv: any;
  memory: any;
  sqlite: any;
  graphql: any;
}

class LootboxRpcClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3005') {
    this.baseUrl = baseUrl;
  }

  // Expose baseUrl safely via a public getter
  public getBaseUrl(): string {
    return this.baseUrl;
  }

  private async call(
    namespace: string,
    method: string,
    args: any = {}
  ): Promise<any> {
    const response = await fetch(`${this.baseUrl}/rpc/${namespace}/${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    });

    if (!response.ok) {
      throw new Error(
        `Lootbox RPC call failed: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  get fs() {
    return {
      readFile: (args: any) => this.call('fs', 'readFile', args),
      writeFile: (args: any) => this.call('fs', 'writeFile', args),
      listDirectory: (args: any) => this.call('fs', 'listDirectory', args),
      createDirectory: (args: any) => this.call('fs', 'createDirectory', args),
      deleteFile: (args: any) => this.call('fs', 'deleteFile', args),
      moveFile: (args: any) => this.call('fs', 'moveFile', args),
      copyFile: (args: any) => this.call('fs', 'copyFile', args),
      getFileInfo: (args: any) => this.call('fs', 'getFileInfo', args),
      searchReplace: (args: any) => this.call('fs', 'searchReplace', args),
      appendFile: (args: any) => this.call('fs', 'appendFile', args),
    };
  }

  get kv() {
    return {
      get: (args: any) => this.call('kv', 'get', args),
      set: (args: any) => this.call('kv', 'set', args),
      delete: (args: any) => this.call('kv', 'delete', args),
      list: (args: any) => this.call('kv', 'list', args),
      getMany: (args: any) => this.call('kv', 'getMany', args),
      setMany: (args: any) => this.call('kv', 'setMany', args),
      deleteMany: (args: any) => this.call('kv', 'deleteMany', args),
      deletePrefix: (args: any) => this.call('kv', 'deletePrefix', args),
      has: (args: any) => this.call('kv', 'has', args),
      count: (args: any) => this.call('kv', 'count', args),
      clear: (args: any) => this.call('kv', 'clear', args),
      info: (args: any) => this.call('kv', 'info', args),
      reload: (args: any) => this.call('kv', 'reload', args),
    };
  }

  get memory() {
    return {
      createEntities: (args: any) =>
        this.call('memory', 'createEntities', args),
      createRelations: (args: any) =>
        this.call('memory', 'createRelations', args),
      getEntity: (args: any) => this.call('memory', 'getEntity', args),
      search: (args: any) => this.call('memory', 'search', args),
      listTypes: (args: any) => this.call('memory', 'listTypes', args),
      listRelationTypes: (args: any) =>
        this.call('memory', 'listRelationTypes', args),
      deleteEntity: (args: any) => this.call('memory', 'deleteEntity', args),
      deleteRelation: (args: any) =>
        this.call('memory', 'deleteRelation', args),
      getGraph: (args: any) => this.call('memory', 'getGraph', args),
      clear: (args: any) => this.call('memory', 'clear', args),
      stats: (args: any) => this.call('memory', 'stats', args),
    };
  }

  get sqlite() {
    return {
      execute: (args: any) => this.call('sqlite', 'execute', args),
      query: (args: any) => this.call('sqlite', 'query', args),
      transaction: (args: any) => this.call('sqlite', 'transaction', args),
      queryOne: (args: any) => this.call('sqlite', 'queryOne', args),
      listTables: (args: any) => this.call('sqlite', 'listTables', args),
      getSchema: (args: any) => this.call('sqlite', 'getSchema', args),
      vacuum: (args: any) => this.call('sqlite', 'vacuum', args),
      info: (args: any) => this.call('sqlite', 'info', args),
      close: (args: any) => this.call('sqlite', 'close', args),
    };
  }

  get graphql() {
    return {
      query: (args: any) => this.call('graphql', 'query', args),
      mutate: (args: any) => this.call('graphql', 'mutate', args),
    };
  }
}

export class LootboxMcpAdapter {
  private server: Server;
  private lootboxClient: LootboxRpcClient;
  private namespaces: LootboxNamespace[] = [];

  constructor(lootboxUrl: string = 'http://localhost:3005') {
    this.lootboxClient = new LootboxRpcClient(lootboxUrl);

    this.server = new Server(
      {
        name: 'lootbox-mcp-adapter',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    (this as any).setupHandlers?.();

    // Kick off async namespace loading without making the constructor async
    void this.loadAllNamespaces().catch(error => {
      console.error('Failed to load Lootbox namespaces:', error);
    });
  }

  private async loadAllNamespaces(): Promise<void> {
    try {
      const resp = await fetch(`${this.lootboxClient.getBaseUrl()}/namespaces`);
      if (!resp.ok) {
        throw new Error(`Failed to fetch namespaces: ${resp.status}`);
      }

      const namespacesText = await resp.text();
      // Parse the XML-like response
      const namespaceMatches = namespacesText.match(
        /<namespaces>(.*?)<\/namespaces>/s
      );
      if (!namespaceMatches) {
        throw new Error('Invalid namespaces response format');
      }

      const namespacesContent = namespaceMatches[1];
      const namespaceLines = namespacesContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line);

      this.namespaces = namespaceLines
        .map(line => {
          const match = line.match(/- (\w+) \((\d+) functions\)/);
          if (!match) return null;

          const [, name] = match;
          return {
            name,
            functions: [], // We'll populate this when needed
          };
        })
        .filter(Boolean) as LootboxNamespace[];

      // Load function details for each namespace
      for (const namespace of this.namespaces) {
        await this.loadNamespaceFunctions(namespace);
      }
    } catch (error) {
      console.error('Failed to load Lootbox namespaces:', error);
    }
  }

  private async loadNamespaceFunctions(
    namespace: LootboxNamespace
  ): Promise<void> {
    try {
      const resp = await fetch(
        `${this.lootboxClient.getBaseUrl()}/types/${namespace.name}`
      );
      if (!resp.ok) {
        console.warn(`Failed to load types for namespace ${namespace.name}`);
        return;
      }

      const typesContent = await resp.text();

      // Parse TypeScript interfaces to extract function signatures
      const functionRegex = /export interface (\w+)_(\w+)Args \{([\s\S]*?)\}/g;

      const functions: LootboxTool[] = [];
      let match: RegExpExecArray | null;

      while ((match = functionRegex.exec(typesContent)) !== null) {
        const [, ns, methodName, argsContent] = match;

        if (ns.toLowerCase() === namespace.name) {
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
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = [];

      for (const namespace of this.namespaces) {
        for (const func of namespace.functions) {
          tools.push({
            name: func.name,
            description: func.description,
            inputSchema: func.inputSchema,
          });
        }
      }

      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      const { name, arguments: args = {} } = request.params;

      try {
        // Parse namespace and method from tool name (format: namespace_method)
        const [namespace, method] = name.split('_', 2);
        if (!namespace || !method) {
          throw new Error(`Invalid tool name format: ${name}`);
        }

        // Get the appropriate namespace client
        const nsClient = (this.lootboxClient as any)[namespace];
        if (!nsClient) {
          throw new Error(`Unknown namespace: ${namespace}`);
        }

        // Call the method
        const methodFunc = nsClient[method];
        if (!methodFunc) {
          throw new Error(
            `Unknown method: ${method} in namespace ${namespace}`
          );
        }

        const result = await methodFunc(args);

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
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Lootbox MCP Adapter started');
  }
}

// CLI runner
if ((import.meta as any).main) {
  const adapter = new LootboxMcpAdapter();
  adapter.start().catch(console.error);
}
