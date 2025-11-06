import { getEnv } from '../utils/env';

interface McpConfig {
    id: string;
    name: string;
    start_command: string;
    install_path: string;
}

export class RoleManager {
    private mcpJungleUrl: string;

    constructor() {
        // We'll use the base URL for jungle and append the specific API paths
        this.mcpJungleUrl = getEnv('MCP_JUNGLE_URL') || 'http://localhost:3033';
    }

    private async makeApiRequest(endpoint: string, method: 'GET' | 'POST' | 'DELETE', body?: any): Promise<any> {
        const url = `${this.mcpJungleUrl}${endpoint}`;
        const options: RequestInit = {
            method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`MCPJungle API request failed to ${url}: ${response.status} ${response.statusText} - ${errorText}`);
        }
        return response.json();
    }

    // --- MCP Tools for Self-Management (API-driven) ---

    public async registerMcpServer(args: { id: string, name: string, start_command: string, install_path?: string }): Promise<{ success: boolean; message: string }> {
        if (!args.id || !args.name || !args.start_command) {
            return { success: false, message: "Missing required fields: id, name, start_command" };
        }

        try {
            await this.makeApiRequest('/registry/add', 'POST', args);
            return { success: true, message: `Server '${args.name}' registered successfully with MCPJungle.` };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    public async disableMcpServer(args: { id: string }): Promise<{ success: boolean; message: string }> {
        if (!args.id) {
            return { success: false, message: "Missing required field: id" };
        }

        try {
            await this.makeApiRequest('/registry/remove', 'POST', { id: args.id }); // Assuming a POST endpoint for removal
            return { success: true, message: `Server with id '${args.id}' disabled successfully in MCPJungle.` };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    public async listMcpServers(): Promise<McpConfig[]> {
        return this.makeApiRequest('/registry/list', 'GET');
    }
}
