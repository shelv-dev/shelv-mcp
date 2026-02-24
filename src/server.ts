import { createShelvClient } from "@shelv/adapters";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadConfig, type McpConfig } from "./config";
import { McpToolError } from "./errors";
import { ShelvHttpClient } from "./http-client";
import { registerShelvTools } from "./tools";
import type { ToolContext, ToolExtra } from "./tools/context";

export interface ShelvMcpRuntime {
  server: McpServer;
  config: McpConfig;
}

function validateApiKey(token: string): string {
  const trimmed = token.trim();
  if (!trimmed.startsWith("sk_")) {
    throw new McpToolError({
      code: "AUTH_ERROR",
      message: "Shelv API key must use sk_ prefix",
      status: 401,
      retryable: false,
    });
  }

  return trimmed;
}

function createContext(config: McpConfig): ToolContext {
  return {
    config,
    getApiKey(extra?: ToolExtra) {
      const authToken = extra?.authInfo?.token;
      if (typeof authToken === "string" && authToken.trim().length > 0) {
        return validateApiKey(authToken);
      }

      if (config.apiKey) {
        return validateApiKey(config.apiKey);
      }

      throw new McpToolError({
        code: "AUTH_ERROR",
        message:
          "Missing Shelv API key. Set SHELV_API_KEY or provide Authorization bearer token.",
        status: 401,
        retryable: false,
      });
    },
    createShelvClient(apiKey: string) {
      return createShelvClient({
        apiKey,
        apiBaseUrl: config.apiBaseUrl,
      });
    },
    createHttpClient(apiKey: string) {
      return new ShelvHttpClient({
        apiKey,
        apiBaseUrl: config.apiBaseUrl,
      });
    },
  };
}

export function createShelvMcpRuntime(
  env: NodeJS.ProcessEnv = process.env,
): ShelvMcpRuntime {
  const config = loadConfig(env);
  const context = createContext(config);

  const server = new McpServer(
    {
      name: "shelv-mcp",
      version: "0.1.0",
    },
    {
      instructions:
        "Shelv MCP server for creating, listing, reading, searching, and hydrating document shelves.",
    },
  );

  registerShelvTools(server, context);

  return { server, config };
}
