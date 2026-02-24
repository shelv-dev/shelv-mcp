import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { errorResult, successResult } from "./common";
import type { ToolContext } from "./context";

const inputSchema = {
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
};

const outputSchema = {
  shelves: z.array(
    z.object({
      publicId: z.string(),
      name: z.string(),
      status: z.string(),
      template: z.string().nullable(),
      pageCount: z.number().nullable(),
      reviewMode: z.boolean(),
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
  ),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
};

export function registerListShelvesTool(
  server: McpServer,
  context: ToolContext,
): void {
  server.registerTool(
    "list_shelves",
    {
      title: "List Shelves",
      description: "List shelves available to the authenticated user",
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: true },
    },
    async (input, extra) => {
      try {
        const apiKey = context.getApiKey(extra);
        const client = context.createHttpClient(apiKey);
        const result = await client.listShelves({
          page: input.page,
          limit: input.limit,
        });

        return successResult(
          `Loaded ${result.data.length} shelves (page ${result.pagination.page}/${result.pagination.totalPages})`,
          {
            shelves: result.data,
            pagination: result.pagination,
          },
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
