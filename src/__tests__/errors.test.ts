import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AdapterError } from "@shelv/adapters";
import { ApiRequestError, toMcpToolError } from "../errors";

describe("toMcpToolError", () => {
  it("maps API status codes", () => {
    const err = new ApiRequestError("GET", "/v1/shelves", 404, {
      message: "Shelf not found",
    });

    const mapped = toMcpToolError(err);
    assert.equal(mapped.code, "NOT_FOUND");
    assert.equal(mapped.status, 404);
  });

  it("maps adapter tree fetch failures using status in message", () => {
    const err = new AdapterError(
      "TREE_FETCH_FAILED",
      "Shelv request failed (409) for /tree",
    );

    const mapped = toMcpToolError(err);
    assert.equal(mapped.code, "NOT_READY");
    assert.equal(mapped.status, 409);
  });
});
