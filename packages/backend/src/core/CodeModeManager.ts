import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk';
import type { ChildProcess } from 'child_process';
import { spawn } from 'child_process';

import { getEnv } from '../utils/env';
import { CommanderServer } from './CommanderServer';
import { RoleManager } from './RoleManager';

interface McpConfig {
    id: string;
    name: string;
    start_command: string;
    install_path: string;
}

export class CodeModeManager {
    private runningServers: Map<string, ChildProcess> = new Map();
    private serverPorts: Map<string, number> = new Map();
    private nextPort = 8080;
    private serverTimers: Map<string, NodeJS.Timeout> = new Map();
    private mcpRegistry: McpConfig[] = [];
    private readonly INACTIVITY_TIMEOUT = 300000; // 5 minutes
    private initializationPromise: Promise<void>;
    private roleManager: RoleManager;
    private commanderServer: CommanderServer;

    constructor() {
        this.roleManager = new RoleManager();
        this.commanderServer = new CommanderServer();
        this.initializationPromise = this.initialize();
    }

    private async initialize(): Promise<void> {
        try {
            console.log('Initializing CodeModeManager: Fetching MCP registry...');
            this.mcpRegistry = await this.roleManager.listMcpServers();
            console.log('MCP registry loaded for CodeModeManager:', this.mcpRegistry);
        } catch (error) {
            console.error('Failed to initialize CodeModeManager with MCP registry:', error);
            this.mcpRegistry = [];
        }
    }

    public async getTool(toolName: string): Promise<any> {
        await this.initializationPromise;

        const [mcpId, ...methodParts] = toolName.split('_');
        const methodName = methodParts.join('_');

        if (!mcpId) {
            throw new Error(`Invalid tool name format: ${toolName}`);
        }

        if (mcpId === 'role') {
            const roleMethod = (this.roleManager as any)[methodName];
            if (typeof roleMethod === 'function') {
                return {
                    execute: (args: any) => roleMethod.call(this.roleManager, args),
                };
            } else {
                throw new Error(`RoleManager method not found: ${methodName}`);
            }
        }

        this.ensureServerRunning(mcpId);
        this.resetInactivityTimer(mcpId);

        const port = this.serverPorts.get(mcpId);
        if (!port) {
            throw new Error(`Could not find port for running MCP server ${mcpId}`);
        }

        const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/mcp`));
        const client = new Client({ transport });

        return {
            execute: async (args: any) => {
                const permission = this.commanderServer.isAllowed(toolName, args);
                if (!permission.allowed) {
                    throw new Error(`Access denied: ${permission.reason}`);
                }

                console.log(`Executing tool ${toolName} via mcp-proxy on port ${port} with args:`, args);
                this.resetInactivityTimer(mcpId);

                const response = await client.callTool(toolName, args);

                if (response.content && response.content[0] && response.content[0].type === 'text') {
                    try {
                        return JSON.parse(response.content[0].text);
                    } catch (e) {
                        return response.content[0].text;
                    }
                }
                return response;
            }
        };
    }

    private ensureServerRunning(mcpId: string): void {
        if (this.runningServers.has(mcpId)) {
            console.log(`Proxy for ${mcpId} is already running.`);
            return;
        }

        const mcpConfig = this.mcpRegistry.find(mcp => mcp.id === mcpId);
        if (!mcpConfig) {
            throw new Error(`MCP server with id '${mcpId}' not found in registry.`);
        }

        const port = this.nextPort++;
        this.serverPorts.set(mcpId, port);

        console.log(`Starting mcp-proxy for ${mcpConfig.name} on port ${port}...`);

        const proxyArgs = [
            'mcp-proxy',
            '--port',
            port.toString(),
            '--',
            ...mcpConfig.start_command.split(' ')
        ];

        const serverProcess = spawn('npx', proxyArgs, {
            cwd: process.cwd(),
            stdio: 'pipe',
        });

        serverProcess.stdout.on('data', (data) => console.log(`[${mcpId}-proxy] stdout: ${data}`));
        serverProcess.stderr.on('data', (data) => console.error(`[${mcpId}-proxy] stderr: ${data}`));
        serverProcess.on('error', (err) => {
            console.error(`Failed to start proxy for ${mcpConfig.name}:`, err);
            this.runningServers.delete(mcpId);
        });
        serverProcess.on('exit', (code) => {
            console.log(`${mcpConfig.name} proxy exited with code ${code}.`);
            this.runningServers.delete(mcpId);
            this.clearInactivityTimer(mcpId);
        });

        this.runningServers.set(mcpId, serverProcess);
    }

    private resetInactivityTimer(mcpId: string): void {
        this.clearInactivityTimer(mcpId);

        const timer = setTimeout(() => {
            console.log(`Server for ${mcpId} has been inactive. Shutting down.`);
            this.stopServer(mcpId);
        }, this.INACTIVITY_TIMEOUT);

        this.serverTimers.set(mcpId, timer);
    }

    private clearInactivityTimer(mcpId: string): void {
        if (this.serverTimers.has(mcpId)) {
            clearTimeout(this.serverTimers.get(mcpId)!);
            this.serverTimers.delete(mcpId);
        }
    }

    private stopServer(mcpId: string): void {
        const serverProcess = this.runningServers.get(mcpId);
        if (serverProcess) {
            console.log(`Stopping proxy for ${mcpId}...`);
            serverProcess.kill();
            this.runningServers.delete(mcpId);
            this.clearInactivityTimer(mcpId);
            this.serverPorts.delete(mcpId);
        }
    }

    public shutdownAll(): void {
        console.log('Shutting down all running MCP servers...');
        for (const mcpId of this.runningServers.keys()) {
            this.stopServer(mcpId);
        }
    }
}
