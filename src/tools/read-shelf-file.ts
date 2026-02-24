import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  ensureRelativePath,
  errorResult,
  inferContentType,
  successResult,
  truncateUtf8,
} from "./common";
import type { ToolContext } from "./context";

const inputSchema = {
  shelf_id: z.string().min(1),
  path: z.string().min(1),
};

const outputSchema = {
  shelf_id: z.string(),
  path: z.string(),
  content_type: z.string(),
  content: z.string(),
  bytes: z.number(),
  truncated: z.boolean(),
};

export function registerReadShelfFileTool(
  server: McpServer,
  context: ToolContext,
): void {
  server.registerTool(
    "read_shelf_file",
    {
      title: "Read Shelf File",
      description: "Read a single file from a shelf",
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: true },
    },
    async (input, extra) => {
      try {
        const normalizedPath = ensureRelativePath(input.path);
        const apiKey = context.getApiKey(extra);
        const client = context.createShelvClient(apiKey);
        const raw = await client.getFile(input.shelf_id, normalizedPath);

        const truncated = truncateUtf8(raw, context.config.readMaxBytes);

        return successResult(
          truncated.truncated
            ? `Read ${normalizedPath} (truncated to ${truncated.bytes} bytes)`
            : `Read ${normalizedPath}`,
          {
            shelf_id: input.shelf_id,
            path: normalizedPath,
            content_type: inferContentType(normalizedPath),
            content: truncated.value,
            bytes: truncated.bytes,
            truncated: truncated.truncated,
          },
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
