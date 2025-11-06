import { z } from 'zod';
import { router, publicProcedure } from './trpc';
import { TRPCError } from '@trpc/server';

export const mcpRouter = router({
  getTools: publicProcedure
    .input(
      z.object({
        url: z.string().url(),
      })
    )
    .query(async ({ input }) => {
      try {
        const response = await fetch(input.url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Assuming the MCP server returns a list of tools in the format { id, name, description }
        return data.tools;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch tools from MCP server at ${input.url}`,
          cause: error,
        });
      }
    }),
});