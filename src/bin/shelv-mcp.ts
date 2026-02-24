#!/usr/bin/env node
import { createShelvMcpRuntime } from "../server";
import { runHttpTransport } from "../transports/http";
import { runStdioTransport } from "../transports/stdio";

async function main(): Promise<void> {
  const runtime = createShelvMcpRuntime();

  if (runtime.config.transport === "stdio") {
    if (!runtime.config.apiKey) {
      throw new Error("SHELV_API_KEY is required in stdio mode");
    }

    await runStdioTransport(runtime.server);
    return;
  }

  const http = await runHttpTransport(runtime.server, runtime.config);
  console.error(`shelv-mcp listening at ${http.url}`);
  console.error(
    runtime.config.enableWriteTools
      ? "write tools enabled"
      : "write tools disabled (set SHELV_MCP_ENABLE_WRITE_TOOLS=true to enable)",
  );
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Failed to start shelv-mcp",
  );
  process.exit(1);
});
