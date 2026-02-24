import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { errorResult, successResult } from "./common";
import type { ToolContext } from "./context";

const inputSchema = {
  shelf_id: z.string().min(1),
};

const outputSchema = {
  shelf_id: z.string(),
  name: z.string(),
  file_count: z.number(),
  files: z.record(z.string()),
};

export function registerGetShelfTreeTool(
  server: McpServer,
  context: ToolContext,
): void {
  server.registerTool(
    "get_shelf_tree",
    {
      title: "Get Shelf Tree",
      description: "Get the full file tree and file contents for a shelf",
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: true },
    },
    async (input, extra) => {
      try {
        const apiKey = context.getApiKey(extra);
        const client = context.createShelvClient(apiKey);
        const tree = await client.getTree(input.shelf_id);

        return successResult(
          `Loaded ${tree.fileCount} files for shelf ${tree.shelfPublicId}`,
          {
            shelf_id: tree.shelfPublicId,
            name: tree.name,
            file_count: tree.fileCount,
            files: tree.files,
          },
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
