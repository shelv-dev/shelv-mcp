import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ShelvHttpClient } from "../http-client";

describe("ShelvHttpClient", () => {
  it("sends auth header for list", async () => {
    const calls: Array<{ url: string; auth?: string }> = [];
    const client = new ShelvHttpClient({
      apiKey: "sk_test",
      apiBaseUrl: "https://api.shelv.dev",
      fetchImplementation: (async (
        input: URL | RequestInfo,
        init?: RequestInit,
      ) => {
        calls.push({
          url: String(input),
          auth: (init?.headers as Record<string, string> | undefined)
            ?.Authorization,
        });

        return new Response(
          JSON.stringify({
            data: [],
            pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }) as typeof fetch,
    });

    await client.listShelves({ page: 1, limit: 20 });

    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.url.includes("/v1/shelves?page=1&limit=20"), true);
    assert.equal(calls[0]?.auth, "Bearer sk_test");
  });

  it("posts multipart when creating shelf", async () => {
    const client = new ShelvHttpClient({
      apiKey: "sk_test",
      apiBaseUrl: "https://api.shelv.dev",
      fetchImplementation: (async (
        _input: URL | RequestInfo,
        init?: RequestInit,
      ) => {
        assert.equal(init?.method, "POST");
        assert.equal(init?.body instanceof FormData, true);

        return new Response(
          JSON.stringify({
            publicId: "shf_1234567890abcdef12345678",
            name: "Example",
            status: "uploading",
            template: null,
            pageCount: null,
            reviewMode: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }) as typeof fetch,
    });

    const shelf = await client.createShelf({
      pdfBytes: new Uint8Array([37, 80, 68, 70, 45]),
      fileName: "sample.pdf",
    });

    assert.equal(shelf.publicId, "shf_1234567890abcdef12345678");
  });
});
