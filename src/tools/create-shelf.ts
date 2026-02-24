import fs from "node:fs/promises";
import path from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { McpToolError } from "../errors";
import { errorResult, successResult } from "./common";
import type { ToolContext } from "./context";

const MAX_PDF_BYTES = 300 * 1024 * 1024;

const inputSchema = {
  pdf_path: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  template: z.enum(["book", "legal-contract", "academic-paper"]).optional(),
  review: z.boolean().optional(),
};

const outputSchema = {
  shelf: z.object({
    publicId: z.string(),
    name: z.string(),
    status: z.string(),
    template: z.string().nullable(),
    pageCount: z.number().nullable(),
    reviewMode: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
};

async function assertPdfFile(filePath: string): Promise<void> {
  const stats = await fs.stat(filePath).catch(() => null);
  if (!stats || !stats.isFile()) {
    throw new McpToolError({
      code: "INPUT_ERROR",
      message: "pdf_path must point to an existing file",
      status: 400,
      retryable: false,
    });
  }

  if (stats.size > MAX_PDF_BYTES) {
    throw new McpToolError({
      code: "INPUT_ERROR",
      message: "PDF exceeds 300 MB limit",
      status: 400,
      retryable: false,
    });
  }

  if (path.extname(filePath).toLowerCase() !== ".pdf") {
    throw new McpToolError({
      code: "INPUT_ERROR",
      message: "Only .pdf files are supported",
      status: 400,
      retryable: false,
    });
  }

  const handle = await fs.open(filePath, "r");
  try {
    const header = Buffer.alloc(5);
    await handle.read(header, 0, 5, 0);
    if (header.toString("utf8") !== "%PDF-") {
      throw new McpToolError({
        code: "INPUT_ERROR",
        message: "File does not appear to be a valid PDF",
        status: 400,
        retryable: false,
      });
    }
  } finally {
    await handle.close();
  }
}

export function registerCreateShelfTool(
  server: McpServer,
  context: ToolContext,
): void {
  server.registerTool(
    "create_shelf",
    {
      title: "Create Shelf",
      description: "Upload a local PDF and create a shelf",
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: false },
    },
    async (input, extra) => {
      try {
        const absolutePath = path.resolve(input.pdf_path);
        await assertPdfFile(absolutePath);

        const fileBytes = new Uint8Array(await fs.readFile(absolutePath));
        const apiKey = context.getApiKey(extra);
        const client = context.createHttpClient(apiKey);
        const shelf = await client.createShelf({
          pdfBytes: fileBytes,
          fileName: path.basename(absolutePath),
          name: input.name,
          template: input.template,
          review: input.review,
        });

        return successResult(`Created shelf ${shelf.publicId}`, { shelf });
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
