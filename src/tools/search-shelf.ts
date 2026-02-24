import { resolveShelfSource } from "@shelv/adapters";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { McpToolError } from "../errors";
import { errorResult, successResult } from "./common";
import type { ToolContext } from "./context";

const inputSchema = {
  shelf_id: z.string().min(1),
  query: z.string().min(1),
  mode: z.enum(["substring", "regex"]).optional(),
  case_sensitive: z.boolean().optional(),
  max_matches: z.number().int().min(1).optional(),
};

const outputSchema = {
  shelf_id: z.string(),
  query: z.string(),
  mode: z.enum(["substring", "regex"]),
  case_sensitive: z.boolean(),
  matches: z.array(
    z.object({
      path: z.string(),
      line: z.string(),
      line_number: z.number(),
      snippet: z.string(),
    }),
  ),
  scanned_files: z.number(),
  scanned_bytes: z.number(),
  truncated: z.boolean(),
};

function buildMatcher(
  query: string,
  mode: "substring" | "regex",
  caseSensitive: boolean,
): (line: string) => boolean {
  if (mode === "regex") {
    let regex: RegExp;
    try {
      regex = new RegExp(query, caseSensitive ? "" : "i");
    } catch {
      throw new McpToolError({
        code: "INPUT_ERROR",
        message: "Invalid regular expression",
        status: 400,
        retryable: false,
      });
    }

    return (line: string) => regex.test(line);
  }

  const needle = caseSensitive ? query : query.toLowerCase();
  return (line: string) => {
    const haystack = caseSensitive ? line : line.toLowerCase();
    return haystack.includes(needle);
  };
}

export function registerSearchShelfTool(
  server: McpServer,
  context: ToolContext,
): void {
  server.registerTool(
    "search_shelf",
    {
      title: "Search Shelf",
      description: "Search for text across files in a shelf",
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: true },
    },
    async (input, extra) => {
      try {
        const mode = input.mode ?? "substring";
        const caseSensitive = input.case_sensitive ?? false;

        const apiKey = context.getApiKey(extra);
        const source = await resolveShelfSource({
          client: context.createShelvClient(apiKey),
          shelfPublicId: input.shelf_id,
          mode: "archive-first",
        });

        const matcher = buildMatcher(input.query, mode, caseSensitive);
        const maxMatches = Math.min(
          input.max_matches ?? context.config.searchMaxMatches,
          context.config.searchMaxMatches,
        );

        const matches: Array<{
          path: string;
          line: string;
          line_number: number;
          snippet: string;
        }> = [];

        let scannedFiles = 0;
        let scannedBytes = 0;
        let truncated = false;

        for (const [filePath, content] of Object.entries(source.files)) {
          if (scannedFiles >= context.config.searchMaxFiles) {
            truncated = true;
            break;
          }

          const bytes = Buffer.byteLength(content, "utf8");
          if (scannedBytes + bytes > context.config.searchMaxBytes) {
            truncated = true;
            break;
          }

          scannedFiles += 1;
          scannedBytes += bytes;

          const lines = content.split(/\r?\n/);
          for (let index = 0; index < lines.length; index += 1) {
            const line = lines[index] || "";
            if (!matcher(line)) continue;

            matches.push({
              path: filePath,
              line,
              line_number: index + 1,
              snippet: line.slice(0, 300),
            });

            if (matches.length >= maxMatches) {
              truncated = true;
              break;
            }
          }

          if (truncated) break;
        }

        return successResult(
          `Found ${matches.length} matches across ${scannedFiles} files`,
          {
            shelf_id: input.shelf_id,
            query: input.query,
            mode,
            case_sensitive: caseSensitive,
            matches,
            scanned_files: scannedFiles,
            scanned_bytes: scannedBytes,
            truncated,
          },
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
