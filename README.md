# @shelv/mcp

MCP server for Shelv shelf operations.

## Install

```bash
pnpm add @shelv/mcp
```

```bash
npm install @shelv/mcp
```

```bash
npx @shelv/mcp
```

## Environment

- `SHELV_API_KEY` for stdio mode
- `SHELV_MCP_TRANSPORT=stdio|http` (defaults to `stdio`)
- `SHELV_MCP_HTTP_HOST` (defaults to `127.0.0.1`)
- `SHELV_MCP_HTTP_PORT` (defaults to `3334`)
- `SHELV_MCP_ENABLE_WRITE_TOOLS=true` to enable `create_shelf` and `hydrate_shelf`
- `SHELV_MCP_SEARCH_MAX_FILES` (defaults to `500`)
- `SHELV_MCP_SEARCH_MAX_BYTES` (defaults to `5000000`)
- `SHELV_MCP_SEARCH_MAX_MATCHES` (defaults to `200`)
- `SHELV_MCP_READ_MAX_BYTES` (defaults to `250000`)

## Run

```bash
shelv-mcp
```

```bash
SHELV_MCP_TRANSPORT=http SHELV_MCP_HTTP_PORT=3334 shelv-mcp
```

In HTTP mode, send `Authorization: Bearer sk_...` on each request unless
`SHELV_API_KEY` is configured as a startup fallback.

## Tools

- `list_shelves`
- `get_shelf_tree`
- `read_shelf_file`
- `search_shelf`

Write tools are disabled by default and become available only when
`SHELV_MCP_ENABLE_WRITE_TOOLS=true`:

- `create_shelf`
- `hydrate_shelf`

## License

Apache-2.0.

Source code: [github.com/shelv-dev/shelv-mcp](https://github.com/shelv-dev/shelv-mcp)
