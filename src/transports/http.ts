import {
  createServer,
  type IncomingMessage,
  type Server as HttpServer,
  type ServerResponse,
} from "node:http";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { McpConfig } from "../config";

const MCP_PATH = "/mcp";
type IncomingAuthenticatedRequest = IncomingMessage & { auth?: AuthInfo };

function stripPort(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("[")) {
    const end = trimmed.indexOf("]");
    if (end >= 0) return trimmed.slice(1, end).toLowerCase();
  }

  const [host] = trimmed.split(":");
  return (host || "").toLowerCase();
}

function getAllowedHosts(config: McpConfig): Set<string> {
  const configuredHost = stripPort(config.httpHost);
  const hosts = new Set(["localhost", "127.0.0.1", "::1", configuredHost]);
  return hosts;
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    req.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    req.on("error", reject);

    req.on("end", () => {
      if (chunks.length === 0) {
        resolve(undefined);
        return;
      }

      const raw = Buffer.concat(chunks).toString("utf8");
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON request body"));
      }
    });
  });
}

function respondJson(
  res: ServerResponse,
  status: number,
  payload: Record<string, unknown>,
): void {
  if (res.writableEnded) return;

  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(body);
}

function validateHostAndOrigin(
  req: IncomingMessage,
  config: McpConfig,
): { ok: true } | { ok: false; reason: string } {
  const allowedHosts = getAllowedHosts(config);

  const hostHeader = req.headers.host;
  if (hostHeader) {
    const host = stripPort(hostHeader);
    if (!allowedHosts.has(host)) {
      return { ok: false, reason: "Host header is not allowed" };
    }
  }

  const origin = req.headers.origin;
  if (origin) {
    try {
      const originHost = stripPort(new URL(origin).host);
      if (!allowedHosts.has(originHost)) {
        return { ok: false, reason: "Origin is not allowed" };
      }
    } catch {
      return { ok: false, reason: "Invalid Origin header" };
    }
  }

  return { ok: true };
}

function parseAuth(
  req: IncomingMessage,
  config: McpConfig,
): { ok: true; auth?: AuthInfo } | { ok: false; reason: string } {
  const header = req.headers.authorization;
  if (header === undefined || header.trim() === "") {
    if (config.apiKey) {
      return {
        ok: true,
        auth: {
          token: config.apiKey,
          clientId: "env-fallback",
          scopes: [],
          expiresAt: undefined,
        },
      };
    }

    return {
      ok: false,
      reason: "Missing Authorization header",
    };
  }

  if (!header.startsWith("Bearer ")) {
    return {
      ok: false,
      reason: "Authorization must use Bearer token",
    };
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token.startsWith("sk_")) {
    return {
      ok: false,
      reason: "Shelv API key must use sk_ prefix",
    };
  }

  return {
    ok: true,
    auth: {
      token,
      clientId: "request-bearer",
      scopes: [],
      expiresAt: undefined,
    },
  };
}

export interface HttpTransportHandle {
  server: HttpServer;
  url: string;
  close(): Promise<void>;
}

export async function runHttpTransport(
  server: McpServer,
  config: McpConfig,
): Promise<HttpTransportHandle> {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);

  const httpServer = createServer(async (req, res) => {
    try {
      const requestPath = req.url
        ? new URL(req.url, "http://localhost").pathname
        : "/";
      if (requestPath !== MCP_PATH) {
        respondJson(res, 404, { error: "Not found" });
        return;
      }

      const method = req.method || "GET";
      if (!["GET", "POST", "DELETE"].includes(method)) {
        respondJson(res, 405, { error: "Method not allowed" });
        return;
      }

      const security = validateHostAndOrigin(req, config);
      if (!security.ok) {
        respondJson(res, 403, { error: security.reason });
        return;
      }

      const auth = parseAuth(req, config);
      if (!auth.ok) {
        respondJson(res, 401, { error: auth.reason });
        return;
      }

      const authenticatedRequest = req as IncomingAuthenticatedRequest;
      authenticatedRequest.auth = auth.auth;

      const body = method === "POST" ? await readJsonBody(req) : undefined;
      await transport.handleRequest(authenticatedRequest, res, body);
    } catch (error) {
      respondJson(res, 500, {
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  });

  await new Promise<void>((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(config.httpPort, config.httpHost, () => {
      httpServer.off("error", reject);
      resolve();
    });
  });

  const host = config.httpHost.includes(":")
    ? `[${config.httpHost}]`
    : config.httpHost;
  const url = `http://${host}:${config.httpPort}${MCP_PATH}`;

  return {
    server: httpServer,
    url,
    close() {
      return new Promise((resolve, reject) => {
        httpServer.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}
