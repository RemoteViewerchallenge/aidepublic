import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { mcp } from 'volcano-sdk';

interface McpConfig {
    id: string;
    name: string;
    description: string;
    version: string;
    protocol_version: string;
    install_path: string;
    start_command: string;
}

export class McpRouter {
    private runningServers: { [key: string]: ChildProcess } = {};
    private mcpRegistry: McpConfig[] = [];
    private gatewayConfig: { host: string; port: number };

    constructor() {
        const registryPath = path.join(process.env.HOME || '', '.mcp', 'mcp_registry.json');
        if (fs.existsSync(registryPath)) {
            const rawData = fs.readFileSync(registryPath, 'utf-8');
            this.mcpRegistry = JSON.parse(rawData);
            console.log('MCP registry loaded:', this.mcpRegistry);
        } else {
            console.error('MCP registry not found at', registryPath);
        }

        const gatewayConfigPath = path.join(process.env.HOME || '', '.mcp', 'gateway.config.json');
        if (fs.existsSync(gatewayConfigPath)) {
            const rawData = fs.readFileSync(gatewayConfigPath, 'utf-8');
            this.gatewayConfig = JSON.parse(rawData);
        } else {
            console.error('Gateway config not found at', gatewayConfigPath);
            this.gatewayConfig = { host: 'localhost', port: 5000 }; // Default fallback
        }
    }

    public ensureServersRunning(mcpIds: string[]): void {
        mcpIds.forEach(id => {
            if (!this.runningServers[id]) {
                const mcpConfig = this.mcpRegistry.find(mcp => mcp.id === id);
                if (mcpConfig) {
                    // Placeholder for the actual start command
                    console.log(`Starting server for ${mcpConfig.name} with command: ${mcpConfig.start_command}`);
                    const [command, ...args] = mcpConfig.start_command.split(' ');
                    const child = spawn(command, args, {
                        cwd: path.join(process.env.HOME || '', '.mcp', mcpConfig.install_path),
                        stdio: 'inherit', // Or 'pipe' to capture output
                    });
                    this.runningServers[id] = child;

                    child.on('error', (err) => {
                        console.error(`Failed to start server for ${mcpConfig.name}:`, err);
                        delete this.runningServers[id];
                    });

                    child.on('exit', (code) => {
                        console.log(`${mcpConfig.name} server exited with code ${code}`);
                        delete this.runningServers[id];
                    });

                } else {
                    console.warn(`MCP with id ${id} not found in registry.`);
                }
            }
        });
    }

    public stopUnusedServers(activeMcpIds: string[]): void {
        Object.keys(this.runningServers).forEach(id => {
            if (!activeMcpIds.includes(id)) {
                console.log(`Stopping server for MCP ${id}...`);
                this.runningServers[id].kill();
                delete this.runningServers[id];
            }
        });
    }

    public getMcpHandles(mcpIds: string[]): any[] {
        const { host, port } = this.gatewayConfig;
        return mcpIds.map(id => mcp(`http://${host}:${port}/mcp/${id}`));
    }
}