import path from "node:path";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { McpToolError, serializeToolError, toMcpToolError } from "../errors";

export function successResult(
  text: string,
  structuredContent: Record<string, unknown>,
): CallToolResult {
  return {
    content: [{ type: "text", text }],
    structuredContent,
  };
}

export function errorResult(error: unknown): CallToolResult {
  const normalized = toMcpToolError(error, "Tool execution failed");

  return {
    isError: true,
    content: [{ type: "text", text: normalized.message }],
    structuredContent: {
      error: serializeToolError(normalized),
    },
  };
}

export function ensureRelativePath(inputPath: string): string {
  const trimmed = inputPath.trim();

  if (!trimmed) {
    throw new McpToolError({
      code: "INPUT_ERROR",
      message: "Path is required",
      status: 400,
      retryable: false,
    });
  }

  if (trimmed.includes("\\") || trimmed.includes("\0")) {
    throw new McpToolError({
      code: "INPUT_ERROR",
      message: "Path contains unsupported characters",
      status: 400,
      retryable: false,
    });
  }

  const normalized = path.posix.normalize(trimmed);
  if (normalized === "." || normalized === "") {
    throw new McpToolError({
      code: "INPUT_ERROR",
      message: "Path must reference a file under the shelf root",
      status: 400,
      retryable: false,
    });
  }

  if (
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.startsWith("/")
  ) {
    throw new McpToolError({
      code: "INPUT_ERROR",
      message: "Path traversal is not allowed",
      status: 400,
      retryable: false,
    });
  }

  return normalized;
}

export function safeJoin(baseDir: string, relativePath: string): string {
  const resolvedBase = path.resolve(baseDir);
  const candidate = path.resolve(resolvedBase, relativePath);

  if (
    candidate !== resolvedBase &&
    !candidate.startsWith(`${resolvedBase}${path.sep}`)
  ) {
    throw new McpToolError({
      code: "LOCAL_IO_ERROR",
      message: `Unsafe output path: ${relativePath}`,
      retryable: false,
    });
  }

  return candidate;
}

export function truncateUtf8(
  content: string,
  maxBytes: number,
): { value: string; truncated: boolean; bytes: number } {
  const totalBytes = Buffer.byteLength(content, "utf8");
  if (totalBytes <= maxBytes) {
    return { value: content, truncated: false, bytes: totalBytes };
  }

  let low = 0;
  let high = content.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const candidateBytes = Buffer.byteLength(content.slice(0, mid), "utf8");
    if (candidateBytes <= maxBytes) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  const value = content.slice(0, low);
  return {
    value,
    truncated: true,
    bytes: Buffer.byteLength(value, "utf8"),
  };
}

export function inferContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".md") return "text/markdown";
  if (ext === ".json") return "application/json";
  if (ext === ".txt") return "text/plain";

  return "text/plain";
}
