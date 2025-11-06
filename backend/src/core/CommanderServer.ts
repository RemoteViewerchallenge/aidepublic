import * as path from 'path';

// A simple representation of an access control rule
interface AccessControlRule {
    tool_prefix: string; // e.g., "lootbox_fs"
    allowed_paths?: string[];
    // We could add more complex rules here later, like 'allowed_args' or 'user_roles'
}

// In a real application, this would come from a database or a secure config file.
const DEFAULT_RULES: AccessControlRule[] = [
    {
        tool_prefix: "lootbox_fs",
        allowed_paths: ["/workspace", "/tmp"]
    },
    {
        tool_prefix: "firecrawl"
        // No path restrictions for firecrawl tools
    }
];

export class CommanderServer {
    private rules: AccessControlRule[];

    constructor(rules: AccessControlRule[] = DEFAULT_RULES) {
        this.rules = rules;
    }

    public isAllowed(toolName: string, args: any): { allowed: boolean; reason?: string } {
        const rule = this.rules.find(r => toolName.startsWith(r.tool_prefix));

        if (!rule) {
            // By default, if no specific rule is found, we deny access for safety.
            return { allowed: false, reason: `No access rule found for tool prefix of '${toolName}'.` };
        }

        if (rule.allowed_paths) {
            // This is a simplified check. A real implementation would need to handle
            // different argument names for paths (e.g., 'path', 'filePath', 'directory').
            const pathArg = args?.path || args?.filePath || args?.directory;
            if (pathArg) {
                const normalizedPath = path.normalize(pathArg);
                const isPathAllowed = rule.allowed_paths.some(allowedPath => normalizedPath.startsWith(path.normalize(allowedPath)));
                if (!isPathAllowed) {
                    return { allowed: false, reason: `Access to path '${pathArg}' is not allowed for tool '${toolName}'.` };
                }
            }
        }

        return { allowed: true };
    }
}
