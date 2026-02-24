import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "./context";
import { registerCreateShelfTool } from "./create-shelf";
import { registerGetShelfTreeTool } from "./get-shelf-tree";
import { registerHydrateShelfTool } from "./hydrate-shelf";
import { registerListShelvesTool } from "./list-shelves";
import { registerReadShelfFileTool } from "./read-shelf-file";
import { registerSearchShelfTool } from "./search-shelf";

export function registerShelvTools(
  server: McpServer,
  context: ToolContext,
): void {
  registerListShelvesTool(server, context);
  registerGetShelfTreeTool(server, context);
  registerReadShelfFileTool(server, context);
  registerSearchShelfTool(server, context);

  if (context.config.enableWriteTools) {
    registerCreateShelfTool(server, context);
    registerHydrateShelfTool(server, context);
  }
}
