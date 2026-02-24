import type { ShelvClient } from "@shelv/adapters";
import type { McpConfig } from "../config";
import type { ShelvHttpClient } from "../http-client";

export interface ToolExtra {
  authInfo?: {
    token?: string;
  };
}

export interface ToolContext {
  config: McpConfig;
  getApiKey(extra?: ToolExtra): string;
  createShelvClient(apiKey: string): ShelvClient;
  createHttpClient(apiKey: string): ShelvHttpClient;
}
