import { AdapterError } from "@shelv/adapters";

export type McpErrorCode =
  | "INPUT_ERROR"
  | "AUTH_ERROR"
  | "BILLING_REQUIRED"
  | "NOT_FOUND"
  | "NOT_READY"
  | "RATE_LIMITED"
  | "UPSTREAM_ERROR"
  | "LOCAL_IO_ERROR";

export interface McpToolErrorData {
  code: McpErrorCode;
  message: string;
  status?: number;
  details?: unknown;
  retryable?: boolean;
}

export class McpToolError extends Error {
  readonly code: McpErrorCode;
  readonly status?: number;
  readonly details?: unknown;
  readonly retryable?: boolean;

  constructor(data: McpToolErrorData, options?: { cause?: unknown }) {
    super(data.message, options);
    this.name = "McpToolError";
    this.code = data.code;
    this.status = data.status;
    this.details = data.details;
    this.retryable = data.retryable;
  }
}

export class ApiRequestError extends Error {
  readonly method: string;
  readonly path: string;
  readonly status: number;
  readonly body: unknown;

  constructor(
    method: string,
    path: string,
    status: number,
    body: unknown,
    options?: { cause?: unknown },
  ) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      typeof (body as { message: unknown }).message === "string"
        ? (body as { message: string }).message
        : `Shelv API request failed (${status})`;

    super(message, options);
    this.name = "ApiRequestError";
    this.method = method;
    this.path = path;
    this.status = status;
    this.body = body;
  }
}

function statusToCode(status: number): McpErrorCode {
  if (status === 400) return "INPUT_ERROR";
  if (status === 401 || status === 403) return "AUTH_ERROR";
  if (status === 402) return "BILLING_REQUIRED";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "NOT_READY";
  if (status === 429) return "RATE_LIMITED";
  return "UPSTREAM_ERROR";
}

function extractStatusFromMessage(message: string): number | undefined {
  const match = message.match(/\((\d{3})\)/);
  if (!match) return undefined;
  const status = Number.parseInt(match[1] ?? "", 10);
  return Number.isFinite(status) ? status : undefined;
}

export function toMcpToolError(
  error: unknown,
  fallbackMessage = "Request failed",
): McpToolError {
  if (error instanceof McpToolError) {
    return error;
  }

  if (error instanceof ApiRequestError) {
    return new McpToolError(
      {
        code: statusToCode(error.status),
        status: error.status,
        message: error.message,
        details: error.body,
        retryable: error.status >= 500 || error.status === 429,
      },
      { cause: error },
    );
  }

  if (error instanceof AdapterError) {
    if (error.code === "TREE_FETCH_FAILED") {
      const status = extractStatusFromMessage(error.message);
      return new McpToolError(
        {
          code: status ? statusToCode(status) : "UPSTREAM_ERROR",
          status,
          message: error.message,
          retryable: status ? status >= 500 || status === 429 : false,
        },
        { cause: error },
      );
    }

    if (error.code === "ARCHIVE_TIMEOUT") {
      return new McpToolError(
        {
          code: "UPSTREAM_ERROR",
          message: error.message,
          retryable: true,
        },
        { cause: error },
      );
    }

    if (error.code === "ARCHIVE_PARSE_FAILED") {
      return new McpToolError(
        {
          code: "UPSTREAM_ERROR",
          message: error.message,
          retryable: false,
        },
        { cause: error },
      );
    }

    return new McpToolError(
      {
        code: "UPSTREAM_ERROR",
        message: error.message,
        retryable: false,
      },
      { cause: error },
    );
  }

  if (error instanceof Error) {
    return new McpToolError(
      {
        code: "UPSTREAM_ERROR",
        message: error.message || fallbackMessage,
        retryable: false,
      },
      { cause: error },
    );
  }

  return new McpToolError({
    code: "UPSTREAM_ERROR",
    message: fallbackMessage,
    details: error,
    retryable: false,
  });
}

export function serializeToolError(error: McpToolError): {
  code: McpErrorCode;
  status?: number;
  details?: unknown;
  retryable?: boolean;
  message: string;
} {
  return {
    code: error.code,
    status: error.status,
    details: error.details,
    retryable: error.retryable,
    message: error.message,
  };
}
