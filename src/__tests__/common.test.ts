import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ensureRelativePath, safeJoin, truncateUtf8 } from "../tools/common";

describe("tools/common", () => {
  it("accepts safe relative paths", () => {
    assert.equal(ensureRelativePath("docs/README.md"), "docs/README.md");
  });

  it("rejects traversal paths", () => {
    assert.throws(() => ensureRelativePath("../secret.txt"));
    assert.throws(() => ensureRelativePath("/etc/passwd"));
  });

  it("prevents unsafe join", () => {
    assert.equal(
      safeJoin("/tmp/workspace", "docs/a.md"),
      "/tmp/workspace/docs/a.md",
    );
    assert.throws(() => safeJoin("/tmp/workspace", "../../outside.md"));
  });

  it("truncates utf8 content by byte budget", () => {
    const result = truncateUtf8("abc😀", 4);
    assert.equal(result.truncated, true);
    assert.equal(result.bytes <= 4, true);
  });
});
