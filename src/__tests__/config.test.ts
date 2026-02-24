import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadConfig } from "../config";

describe("loadConfig", () => {
  it("uses safe defaults", () => {
    const config = loadConfig({});

    assert.equal(config.transport, "stdio");
    assert.equal(config.httpHost, "127.0.0.1");
    assert.equal(config.httpPort, 3334);
    assert.equal(config.enableWriteTools, false);
    assert.equal(config.searchMaxFiles, 500);
    assert.equal(config.searchMaxBytes, 5_000_000);
    assert.equal(config.searchMaxMatches, 200);
    assert.equal(config.readMaxBytes, 250_000);
  });

  it("parses explicit values", () => {
    const config = loadConfig({
      SHELV_API_KEY: "sk_test",
      SHELV_MCP_TRANSPORT: "http",
      SHELV_MCP_HTTP_HOST: "localhost",
      SHELV_MCP_HTTP_PORT: "3434",
      SHELV_MCP_ENABLE_WRITE_TOOLS: "true",
      SHELV_MCP_SEARCH_MAX_FILES: "25",
      SHELV_MCP_SEARCH_MAX_BYTES: "1024",
      SHELV_MCP_SEARCH_MAX_MATCHES: "12",
      SHELV_MCP_READ_MAX_BYTES: "64",
    });

    assert.equal(config.apiKey, "sk_test");
    assert.equal(config.transport, "http");
    assert.equal(config.httpHost, "localhost");
    assert.equal(config.httpPort, 3434);
    assert.equal(config.enableWriteTools, true);
    assert.equal(config.searchMaxFiles, 25);
    assert.equal(config.searchMaxBytes, 1024);
    assert.equal(config.searchMaxMatches, 12);
    assert.equal(config.readMaxBytes, 64);
  });

  it("rejects invalid transport", () => {
    assert.throws(
      () => loadConfig({ SHELV_MCP_TRANSPORT: "tcp" }),
      /SHELV_MCP_TRANSPORT/,
    );
  });
});
