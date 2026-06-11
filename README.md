# Entergram MCP

Official helper CLI for connecting MCP hosts to the public Entergram MCP gateway.

This repository contains only the local client/stdio bridge. The hosted
Entergram MCP gateway and server implementation are maintained separately.

For modern MCP hosts such as Claude Code and Codex, prefer the remote
Streamable HTTP server directly:

```text
https://mcp.entergram.com/mcp
```

Use this package when your MCP host can launch a local command but cannot
connect directly to Entergram over remote MCP OAuth on its own. `entergram-mcp`
then acts as a local `stdio` bridge and handles:

- OAuth login
- local token storage
- Dynamic Client Registration (DCR) through the MCP TypeScript SDK
- Client ID Metadata Document (CIMD) when you provide a metadata document URL
- local `stdio` bridging to the hosted Entergram MCP gateway

## Default Gateway URL

The production MCP gateway URL is intentionally built into this client:

```text
https://mcp.entergram.com/mcp
```

That URL is the stable public entrypoint for Entergram's hosted MCP server. The
client uses it by default so users do not need to copy environment-specific
configuration just to connect.

You can still override it for development or testing:

```bash
entergram-mcp print-config --gateway-url https://devmcp.entergram.com/mcp
entergram-mcp login --gateway-url https://devmcp.entergram.com/mcp
```

Or with an environment variable:

```bash
ENTERGRAM_MCP_GATEWAY_URL=https://devmcp.entergram.com/mcp entergram-mcp serve
```

## Install

```bash
npm install -g @entergram/mcp
```

Or run it without a global install:

```bash
npx -y @entergram/mcp serve
```

## Quick Start

### Recommended: remote HTTP MCP

Codex config:

```toml
[mcp_servers.entergram]
url = "https://mcp.entergram.com/mcp"
```

Claude Code:

```bash
claude mcp add --transport http entergram https://mcp.entergram.com/mcp
```

Then run the host's MCP login flow, for example `/mcp` in Claude Code or
`codex mcp login entergram` in Codex.

The npm package is not required for this primary path. It is a helper and
fallback for hosts that need a local command.

You can print the same config from the helper:

```bash
entergram-mcp print-config --format toml --name entergram
```

### Fallback: local stdio bridge

Use this only when the MCP host cannot connect to remote HTTP MCP directly.

```bash
entergram-mcp login
entergram-mcp serve
```

If you use a custom OAuth client, pass it explicitly:

```bash
entergram-mcp login --client-id entergram-ws-your-client-id
```

Print stdio bridge config:

```bash
entergram-mcp print-config --transport stdio --format toml --name entergram
```

## Commands

```bash
entergram-mcp --help
entergram-mcp login
entergram-mcp whoami
entergram-mcp logout
entergram-mcp serve
entergram-mcp print-config
```

Useful flags:

- `--env production`
- `--auth-mode auto|preconfigured|dcr|cimd`
- `--client-id ...`
- `--client-metadata-url ...`
- `--scope "..."`
- `--format json|toml`
- `--transport http|stdio`

## Host Config

For JSON-based MCP hosts:

```bash
entergram-mcp print-config --name entergram
```

For TOML-based hosts such as Codex:

```bash
entergram-mcp print-config --format toml --name entergram
```

Example remote HTTP TOML config:

```toml
[mcp_servers.entergram]
url = "https://mcp.entergram.com/mcp"
```

Example stdio bridge TOML config:

```toml
[mcp_servers.entergram]
command = "npx"
args = ["-y", "@entergram/mcp", "serve"]

[mcp_servers.entergram.env]
ENTERGRAM_MCP_AUTH_MODE = "auto"
ENTERGRAM_MCP_ENV = "production"
ENTERGRAM_MCP_SCOPE = "workspace.read members.read accounts.read contacts.read chats.read chats.write messages.read messages.write custom_fields.read custom_fields.write tickets.read tickets.write offline_access"
```

## Defaults

- gateway: `https://mcp.entergram.com/mcp`
- auth mode: `auto`
- preconfigured fallback client id: `entergram-mcp-cli`

Default local OAuth callback:

`http://127.0.0.1:8787/oauth/callback`

Session files are stored in:

`~/.entergram-mcp/`

## Choosing a Client

The local stdio bridge supports four auth modes:

- `auto`: use saved client information, a provided CIMD URL, or DCR.
- `preconfigured`: use `--client-id` or the built-in public client id.
- `dcr`: force dynamic client registration for the local bridge.
- `cimd`: require `--client-metadata-url`.

Use a personal preconfigured client for seat-scoped access.

Use a workspace client if you need broader scopes such as:

- `members.read`
- `messages.write`
- `custom_fields.read`
- `custom_fields.write`

When `ENTERGRAM_MCP_CLIENT_ID` starts with `entergram-personal-`, the CLI uses a safer personal default scope that includes:

- `chat_custom_fields.read`
- `chat_custom_fields.write`

and excludes workspace-admin scopes such as `members.read` and `custom_fields.write`.

If the consent screen does not show the scopes you expect, update that OAuth client's `allowedScopes` in Entergram first, then run login again.

## Troubleshooting

`invalid_scope`

- Your OAuth client does not allow one or more requested scopes.
- Update the client in Entergram, then run `entergram-mcp login` again.

`MCP startup failed: handshaking with MCP server failed`

- Your MCP host started the local bridge, but the bridge could not authenticate with the remote gateway.
- Make sure you ran login first for the same `--env`, `--auth-mode`, and client settings used by the host.

`Incompatible auth server: does not support dynamic client registration`

- Your selected authorization server does not advertise DCR.
- Use remote HTTP MCP directly, provide `--client-id` with `--auth-mode preconfigured`, or provide a supported `--client-metadata-url`.

`401` or expired token errors

- Clear the local session and log in again:

```bash
entergram-mcp logout
entergram-mcp login
```
