import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  GetPromptRequestSchema,
  InitializeRequestSchema,
  ListPromptsRequestSchema,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import path from 'path';

// Lootbox RPC client types (from /client.ts)
interface LootboxTool {
  name: string;
  description: string;
  inputSchema: any;
  roles?: string[];
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
  public baseUrl: string;

  constructor(baseUrl?: string) {
    // Allow overriding from environment for container networking (e.g. LOOTBOX_URL)
    this.baseUrl =
      baseUrl ||
      (process.env.LOOTBOX_URL as string) ||
      'http://host.docker.internal:3005';
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

  // Generic invoke helper used by CallTool handler so we don't rely on
  // per-namespace client getters. This forwards to the same HTTP RPC path.
  public async invoke(namespace: string, method: string, args: any = {}) {
    return this.call(namespace, method, args);
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

  constructor(lootboxUrl?: string) {
    // Default to LOOTBOX_URL env var or localhost for host-run adapter
    this.lootboxClient = new LootboxRpcClient(
      lootboxUrl || process.env.LOOTBOX_URL || 'http://localhost:3005'
    );
    console.error(
      'Lootbox MCP Adapter initialized with URL:',
      this.lootboxClient.baseUrl
    );

    this.server = new Server(
      {
        name: 'lootbox-mcp-adapter',
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
    // Remove the async loadNamespaces call that was causing issues
    console.error('Lootbox MCP Adapter constructor completed');
  }

  /**
   * Load manifests from a manifests directory (mounted into container at /host/manifests)
   * Expected manifest files: <name>-manifest.json
   */
  private async loadManifests(): Promise<void> {
    const manifestDir =
      process.env.MCP_MANIFEST_DIR ||
      '/host/manifests' ||
      path.join(__dirname, '..', '..', 'manifests');
    try {
      const entries = await fs.readdir(manifestDir);
      const namespacesMap: Record<string, LootboxTool[]> = {};
      const prompts: any[] = [];
      for (const ent of entries) {
        if (!ent.endsWith('.json')) continue;
        try {
          const raw = await fs.readFile(path.join(manifestDir, ent), 'utf8');
          const m = JSON.parse(raw) as any;
          if (Array.isArray(m.tools)) {
            for (const t of m.tools) {
              const ns = t.namespace || 'default';
              namespacesMap[ns] = namespacesMap[ns] || [];
              namespacesMap[ns].push({
                name: `${t.namespace}_${t.method}`,
                description: t.description || t.name,
                inputSchema: t.inputSchema || {},
                // keep roles so ListTools can return them for UI/ACL mapping
                roles: t.roles || [],
              });
            }
          }
          if (Array.isArray(m.prompts)) {
            for (const p of m.prompts) prompts.push(p);
          }
        } catch (err) {
          console.warn(
            'Failed to parse manifest',
            ent,
            err instanceof Error ? err.message : String(err)
          );
        }
      }

      this.namespaces = Object.keys(namespacesMap).map(ns => ({
        name: ns,
        functions: namespacesMap[ns],
      }));

      // attach prompts into a simple in-memory map for GetPrompt/ListPrompts
      (this as any)._manifestPrompts = prompts;
      if (this.namespaces.length === 0) {
        // fallback to hardcoded list when no manifests found
        this.initializeHardcodedNamespaces();
      } else {
        console.error(
          'Loaded manifests, namespaces:',
          this.namespaces.map(n => n.name).join(',')
        );
      }
    } catch (err) {
      console.warn(
        'Could not read manifest directory',
        manifestDir,
        err instanceof Error ? err.message : String(err)
      );
      // fallback
      this.initializeHardcodedNamespaces();
    }
  }

  private initializeHardcodedNamespaces(): void {
    // Hardcoded namespaces based on Lootbox API
    this.namespaces = [
      {
        name: 'code',
        functions: [
          {
            name: 'code_generate',
            description: 'Generate code from a prompt',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: { type: 'string' },
                language: { type: 'string' },
                maxTokens: { type: 'number' },
              },
              required: ['prompt'],
            },
          },
        ],
      },
      {
        name: 'fs',
        functions: [
          {
            name: 'fs_readFile',
            description: 'Read file contents',
            inputSchema: {
              type: 'object',
              properties: { path: { type: 'string' } },
              required: ['path'],
            },
          },
          {
            name: 'fs_writeFile',
            description: 'Write content to file',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string' },
                content: { type: 'string' },
              },
              required: ['path', 'content'],
            },
          },
          {
            name: 'fs_listDirectory',
            description: 'List directory contents',
            inputSchema: {
              type: 'object',
              properties: { path: { type: 'string' } },
              required: ['path'],
            },
          },
          {
            name: 'fs_createDirectory',
            description: 'Create a directory',
            inputSchema: {
              type: 'object',
              properties: { path: { type: 'string' } },
              required: ['path'],
            },
          },
          {
            name: 'fs_deleteFile',
            description: 'Delete a file',
            inputSchema: {
              type: 'object',
              properties: { path: { type: 'string' } },
              required: ['path'],
            },
          },
        ],
      },
      {
        name: 'kv',
        functions: [
          {
            name: 'kv_get',
            description: 'Get value from key-value store',
            inputSchema: {
              type: 'object',
              properties: { key: { type: 'string' } },
              required: ['key'],
            },
          },
          {
            name: 'kv_set',
            description: 'Set value in key-value store',
            inputSchema: {
              type: 'object',
              properties: {
                key: { type: 'string' },
                value: { type: 'string' },
              },
              required: ['key', 'value'],
            },
          },
          {
            name: 'kv_delete',
            description: 'Delete key from key-value store',
            inputSchema: {
              type: 'object',
              properties: { key: { type: 'string' } },
              required: ['key'],
            },
          },
        ],
      },
      {
        name: 'memory',
        functions: [
          {
            name: 'memory_createEntities',
            description: 'Create entities in memory',
            inputSchema: {
              type: 'object',
              properties: { entities: { type: 'array' } },
              required: ['entities'],
            },
          },
          {
            name: 'memory_getEntity',
            description: 'Get entity from memory',
            inputSchema: {
              type: 'object',
              properties: { id: { type: 'string' } },
              required: ['id'],
            },
          },
          {
            name: 'memory_search',
            description: 'Search entities in memory',
            inputSchema: {
              type: 'object',
              properties: { query: { type: 'string' } },
              required: ['query'],
            },
          },
        ],
      },
      {
        name: 'sqlite',
        functions: [
          {
            name: 'sqlite_execute',
            description: 'Execute SQL query',
            inputSchema: {
              type: 'object',
              properties: { sql: { type: 'string' } },
              required: ['sql'],
            },
          },
          {
            name: 'sqlite_query',
            description: 'Query SQLite database',
            inputSchema: {
              type: 'object',
              properties: { sql: { type: 'string' } },
              required: ['sql'],
            },
          },
        ],
      },
      {
        name: 'graphql',
        functions: [
          {
            name: 'graphql_query',
            description: 'Execute GraphQL query',
            inputSchema: {
              type: 'object',
              properties: { query: { type: 'string' } },
              required: ['query'],
            },
          },
          {
            name: 'graphql_mutate',
            description: 'Execute GraphQL mutation',
            inputSchema: {
              type: 'object',
              properties: { mutation: { type: 'string' } },
              required: ['mutation'],
            },
          },
        ],
      },
    ];
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
      async (request: any) => {
        console.error(
          'Received initialize request:',
          JSON.stringify(request.params)
        );
        const response = {
          protocolVersion: request.params.protocolVersion,
          capabilities: {
            tools: {},
            // advertise that we support prompts so MCPJungle will call prompts/list
            prompts: {},
          },
          serverInfo: {
            name: 'lootbox-mcp-adapter',
            version: '0.1.0',
          },
        };
        console.error('Sending initialize response:', JSON.stringify(response));
        return response;
      }
    );

    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = [];

      for (const namespace of this.namespaces) {
        for (const func of namespace.functions) {
          const tool: any = {
            name: func.name,
            description: func.description,
            inputSchema: func.inputSchema,
          };
          if ((func as any).roles) tool.roles = (func as any).roles;
          tools.push(tool);
        }
      }

      return { tools };
    });

    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request: any) => {
        const { name, arguments: args = {} } = request.params;

        try {
          // Parse namespace and method from tool name (format: namespace_method)
          const [namespace, method] = name.split('_', 2);
          if (!namespace || !method) {
            throw new Error(`Invalid tool name format: ${name}`);
          }

          // Use the generic invoke helper which forwards to Lootbox RPC
          const result = await this.lootboxClient.invoke(
            namespace,
            method,
            args
          );

          // If this is the code_generate tool return cleaner code content
          if (namespace === 'code' && method === 'generate') {
            // Expecting result.code or result.text
            const codeText =
              result?.code ?? result?.text ?? JSON.stringify(result, null, 2);
            return {
              content: [
                {
                  type: 'text',
                  text: codeText,
                  _meta: { language: args.language || 'text' },
                },
              ],
            };
          }

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
