# Entergram MCP

Official npm CLI for connecting local MCP hosts to the public Entergram MCP gateway.

This repository contains only the local client/stdio bridge. The hosted
Entergram MCP gateway and server implementation are maintained separately.

Use this package when your MCP host can launch a local command but cannot connect directly to Entergram over OAuth on its own. `entergram-mcp` handles:

- OAuth login
- local token storage
- a local `stdio` bridge for MCP hosts such as Codex and Claude Desktop

## Install

```bash
npm install -g @entergram/mcp
```

Or run it without a global install:

```bash
npx -y @entergram/mcp serve
```

## Quick Start

```bash
entergram-mcp login
entergram-mcp serve
```

If you use a custom OAuth client, pass it explicitly:

```bash
entergram-mcp login --client-id entergram-ws-your-client-id
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
- `--client-id ...`
- `--scope "..."`
- `--format json|toml`

## Host Config

For JSON-based MCP hosts:

```bash
entergram-mcp print-config --name entergram
```

For TOML-based hosts such as Codex:

```bash
entergram-mcp print-config --format toml --name entergram
```

Example TOML config:

```toml
[mcp_servers.entergram]
command = "entergram-mcp"
args = ["serve"]

[mcp_servers.entergram.env]
ENTERGRAM_MCP_ENV = "production"
ENTERGRAM_MCP_CLIENT_ID = "entergram-ws-your-client-id"
ENTERGRAM_MCP_SCOPE = "workspace.read members.read accounts.read contacts.read chats.read chats.write messages.read messages.write custom_fields.read custom_fields.write tickets.read tickets.write offline_access"
```

## Defaults

- gateway: `https://mcp.entergram.com/mcp`
- client id: `entergram-mcp-cli`

Default local OAuth callback:

`http://127.0.0.1:8787/oauth/callback`

Session files are stored in:

`~/.entergram-mcp/`

## Choosing a Client

Use a personal client for seat-scoped access.

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
- Make sure you ran login first for the same `--env` and `--client-id` used by the host.

`401` or expired token errors

- Clear the local session and log in again:

```bash
entergram-mcp logout --client-id entergram-ws-your-client-id
entergram-mcp login --client-id entergram-ws-your-client-id
```
