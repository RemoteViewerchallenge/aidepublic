import { z } from 'zod';
import { createRouter } from './trpc';

export const mcpRouter = createRouter()
  .query('getTools', {
    input: z.object({
      url: z.string().url(),
    }),
    async resolve({ input }) {
      // In a real application, you would connect to the MCP server at the given URL,
      // fetch its tool definitions, and return them.
      // For now, we'll return some mock data.
      if (input.url.includes('error')) {
        throw new Error('Failed to connect to MCP server');
      }

      return [
        { id: 'tool1', name: 'Calculator', description: 'Performs calculations.' },
        { id: 'tool2', name: 'Weather', description: 'Gets the weather forecast.' },
        { id: 'tool3', name: 'Stock Ticker', description: 'Gets the latest stock price.' },
      ];
    },
  });