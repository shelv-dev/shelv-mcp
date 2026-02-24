const API_BASE_URL = "https://api.shelv.dev";

export type TransportMode = "stdio" | "http";

export interface McpConfig {
  apiBaseUrl: string;
  apiKey?: string;
  transport: TransportMode;
  httpHost: string;
  httpPort: number;
  enableWriteTools: boolean;
  searchMaxFiles: number;
  searchMaxBytes: number;
  searchMaxMatches: number;
  readMaxBytes: number;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }
  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }
  throw new Error(`Invalid boolean value: ${value}`);
}

function parseInteger(
  value: string | undefined,
  fallback: number,
  label: string,
): number {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }

  return parsed;
}

function parseTransport(value: string | undefined): TransportMode {
  if (!value || value.trim() === "") {
    return "stdio";
  }

  if (value === "stdio" || value === "http") {
    return value;
  }

  throw new Error("SHELV_MCP_TRANSPORT must be either 'stdio' or 'http'");
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): McpConfig {
  return {
    apiBaseUrl: API_BASE_URL,
    apiKey: env.SHELV_API_KEY?.trim() || undefined,
    transport: parseTransport(env.SHELV_MCP_TRANSPORT),
    httpHost: env.SHELV_MCP_HTTP_HOST?.trim() || "127.0.0.1",
    httpPort: parseInteger(
      env.SHELV_MCP_HTTP_PORT,
      3334,
      "SHELV_MCP_HTTP_PORT",
    ),
    enableWriteTools: parseBoolean(env.SHELV_MCP_ENABLE_WRITE_TOOLS, false),
    searchMaxFiles: parseInteger(
      env.SHELV_MCP_SEARCH_MAX_FILES,
      500,
      "SHELV_MCP_SEARCH_MAX_FILES",
    ),
    searchMaxBytes: parseInteger(
      env.SHELV_MCP_SEARCH_MAX_BYTES,
      5_000_000,
      "SHELV_MCP_SEARCH_MAX_BYTES",
    ),
    searchMaxMatches: parseInteger(
      env.SHELV_MCP_SEARCH_MAX_MATCHES,
      200,
      "SHELV_MCP_SEARCH_MAX_MATCHES",
    ),
    readMaxBytes: parseInteger(
      env.SHELV_MCP_READ_MAX_BYTES,
      250_000,
      "SHELV_MCP_READ_MAX_BYTES",
    ),
  };
}
