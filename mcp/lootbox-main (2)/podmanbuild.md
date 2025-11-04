cd mcp/jungle && docker-compose exec mcpjungle mkdir -p /src/core && cat > /src/core/LootboxMcpAdapter.ts << 'EOF'
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
CallToolRequestSchema,
ErrorCode,
ListToolsRequestSchema,
McpError,
} from "@modelcontextprotocol/sdk/types.js";

interface LootboxRpcClientInterface {
call(method: string, params: any): Promise<any>;
}

class LootboxRpcClient implements LootboxRpcClientInterface {
private baseUrl: string;

constructor(baseUrl: string) {
this.baseUrl = baseUrl;
}

async call(method: string, params: any): Promise<any> {
const response = await fetch(`${this.baseUrl}/rpc`, {
method: 'POST',
headers: {
'Content-Type': 'application/json',
},
body: JSON.stringify({
method,
params,
}),
});

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();

}
}

class LootboxMcpAdapter {
private server: Server;
private lootboxClient: LootboxRpcClient;
private namespaces: string[] = [];
private namespaceFunctions: Map<string, any[]> = new Map();

constructor(lootboxUrl: string = 'http://localhost:3005') {
this.lootboxClient = new LootboxRpcClient(lootboxUrl);

    this.server = new Server(
      {
        name: "lootbox-mcp-adapter",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();

}

private async loadNamespaces(): Promise<void> {
try {
const response = await fetch(`${this.lootboxClient.baseUrl}/namespaces`);
if (!response.ok) {
throw new Error(`Failed to fetch namespaces: ${response.status}`);
}
const xmlText = await response.text();

      // Parse XML to extract namespace names
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      const namespaceElements = xmlDoc.getElementsByTagName("namespace");

      this.namespaces = [];
      for (let i = 0; i < namespaceElements.length; i++) {
        const name = namespaceElements[i].getAttribute("name");
        if (name) {
          this.namespaces.push(name);
        }
      }
    } catch (error) {
      console.error("Failed to load namespaces:", error);
      this.namespaces = [];
    }

}

private async loadNamespaceFunctions(namespace: string): Promise<any[]> {
try {
const response = await fetch(`${this.lootboxClient.baseUrl}/types`);
if (!response.ok) {
throw new Error(`Failed to fetch types: ${response.status}`);
}
const tsCode = await response.text();

      // Parse TypeScript interfaces to extract function signatures
      const functions = this.parseTypeScriptInterfaces(tsCode, namespace);
      this.namespaceFunctions.set(namespace, functions);
      return functions;
    } catch (error) {
      console.error(`Failed to load functions for namespace ${namespace}:`, error);
      return [];
    }

}

private parseTypeScriptInterfaces(tsCode: string, namespace: string): any[] {
const functions: any[] = [];

    // Simple regex to find interface definitions for the namespace
    const interfaceRegex = new RegExp(`interface ${namespace}_([A-Z][a-zA-Z0-9]*)Args`, 'g');
    let match;

    while ((match = interfaceRegex.exec(tsCode)) !== null) {
      const functionName = match[1].toLowerCase();
      const interfaceName = match[0].replace('interface ', '').replace(' {', '');

      // Extract properties from the interface
      const interfaceStart = match.index;
      const braceStart = tsCode.indexOf('{', interfaceStart);
      const braceEnd = this.findMatchingBrace(tsCode, braceStart);

      if (braceEnd !== -1) {
        const interfaceBody = tsCode.substring(braceStart + 1, braceEnd);
        const properties = this.parseInterfaceProperties(interfaceBody);

        functions.push({
          name: `${namespace}_${functionName}`,
          description: `Execute ${functionName} in ${namespace} namespace`,
          inputSchema: {
            type: "object",
            properties: properties,
            required: Object.keys(properties).filter(key => !properties[key].optional),
          },
        });
      }
    }

    return functions;

}

private findMatchingBrace(str: string, startIndex: number): number {
let braceCount = 0;
for (let i = startIndex; i < str.length; i++) {
if (str[i] === '{') {
braceCount++;
} else if (str[i] === '}') {
braceCount--;
if (braceCount === 0) {
return i;
}
}
}
return -1;
}

private parseInterfaceProperties(interfaceBody: string): any {
const properties: any = {};
const lines = interfaceBody.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('//'));

    for (const line of lines) {
      if (line.includes(':')) {
        const [namePart, typePart] = line.split(':');
        const name = namePart.trim().replace('?', '');
        const isOptional = namePart.includes('?');
        const type = typePart.trim().replace(';', '');

        properties[name] = {
          type: this.mapTypeScriptTypeToJsonSchema(type),
          optional: isOptional,
        };
      }
    }

    return properties;

}

private mapTypeScriptTypeToJsonSchema(tsType: string): string {
if (tsType.includes('string')) return 'string';
if (tsType.includes('number')) return 'number';
if (tsType.includes('boolean')) return 'boolean';
if (tsType.includes('[]')) return 'array';
return 'string'; // default
}

private setupHandlers(): void {
this.server.setRequestHandler(ListToolsRequestSchema, async () => {
await this.loadNamespaces();

      const tools = [];
      for (const namespace of this.namespaces) {
        const functions = await this.loadNamespaceFunctions(namespace);
        tools.push(...functions);
      }

      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        const result = await this.lootboxClient.call(name, args || {});
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });

}

async start(): Promise<void> {
const transport = new StdioServerTransport();
await this.server.connect(transport);
console.error("Lootbox MCP Adapter started");
}
}

// Start the adapter if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
const lootboxUrl = process.env.LOOTBOX_URL || 'http://localhost:3005';
const adapter = new LootboxMcpAdapter(lootboxUrl);
adapter.start().catch(console.error);
}
EOF
