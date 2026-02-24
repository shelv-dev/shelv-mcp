import fs from "node:fs/promises";
import path from "node:path";
import { resolveShelfSource } from "@shelv/adapters";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { McpToolError } from "../errors";
import {
  ensureRelativePath,
  errorResult,
  safeJoin,
  successResult,
} from "./common";
import type { ToolContext } from "./context";

const inputSchema = {
  shelf_id: z.string().min(1),
  target_dir: z.string().min(1),
  overwrite: z.boolean().optional(),
};

const outputSchema = {
  shelf_id: z.string(),
  source_kind: z.enum(["archive", "tree"]),
  target_dir: z.string(),
  files_written: z.number(),
  bytes_written: z.number(),
  archive_version: z.string().nullable(),
};

export function registerHydrateShelfTool(
  server: McpServer,
  context: ToolContext,
): void {
  server.registerTool(
    "hydrate_shelf",
    {
      title: "Hydrate Shelf",
      description: "Download and write shelf files into a local directory",
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: false },
    },
    async (input, extra) => {
      try {
        const apiKey = context.getApiKey(extra);
        const source = await resolveShelfSource({
          client: context.createShelvClient(apiKey),
          shelfPublicId: input.shelf_id,
          mode: "archive-first",
        });

        const overwrite = input.overwrite ?? false;
        const targetDir = path.resolve(input.target_dir);

        await fs.mkdir(targetDir, { recursive: true });

        let filesWritten = 0;
        let bytesWritten = 0;

        for (const [relativePath, content] of Object.entries(source.files)) {
          const normalized = ensureRelativePath(relativePath);
          const fullPath = safeJoin(targetDir, normalized);

          if (!overwrite) {
            const exists = await fs
              .access(fullPath)
              .then(() => true)
              .catch(() => false);

            if (exists) {
              throw new McpToolError({
                code: "LOCAL_IO_ERROR",
                message: `Refusing to overwrite existing file: ${normalized}`,
                retryable: false,
              });
            }
          }

          await fs.mkdir(path.dirname(fullPath), { recursive: true });
          await fs.writeFile(fullPath, content, "utf8");

          filesWritten += 1;
          bytesWritten += Buffer.byteLength(content, "utf8");
        }

        return successResult(`Hydrated ${filesWritten} files to ${targetDir}`, {
          shelf_id: input.shelf_id,
          source_kind: source.kind,
          target_dir: targetDir,
          files_written: filesWritten,
          bytes_written: bytesWritten,
          archive_version:
            source.kind === "archive" ? source.archiveVersion : null,
        });
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
