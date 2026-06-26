# Entergram — Telegram MCP Server for Multiple Accounts

[![npm version](https://img.shields.io/npm/v/@entergram/mcp.svg)](https://www.npmjs.com/package/@entergram/mcp)
[![npm downloads](https://img.shields.io/npm/dm/@entergram/mcp.svg)](https://www.npmjs.com/package/@entergram/mcp)
[![Model Context Protocol](https://img.shields.io/badge/MCP-compatible-2C7BE5.svg)](https://modelcontextprotocol.io)

**Connect one Telegram account — or ten — to Claude, ChatGPT, Claude Code, Cursor, Codex, n8n and Make.com through the Model Context Protocol (MCP).**

Entergram is a hosted **Telegram MCP server** that plugs your real Telegram accounts into any MCP-compatible AI. Unlike single-bot Telegram integrations, Entergram is built for **multiple Telegram accounts in one workspace** — connect every account your team uses and let your AI read chats, search contacts, send messages, and manage CRM fields and tickets **across all of them at once, or scoped to a single account.**

This repository is the official **`@entergram/mcp` helper CLI** — a local `stdio` bridge for MCP hosts that can launch a command but cannot connect to a remote MCP server over OAuth on their own. Most modern hosts should connect to the remote server directly (see [Quick Start](#quick-start)). The hosted gateway and server implementation are maintained separately.

> 🌐 **Product:** https://www.entergram.com/telegram-mcp &nbsp;·&nbsp; **Gateway:** `https://mcp.entergram.com/mcp`

---

## Why a Telegram MCP for multiple accounts?

Most "Telegram MCP" projects wrap a **single bot token** and a single chat. Entergram is different — it's a **multi-account Telegram MCP** built on real Telegram accounts inside a shared workspace:

- **Many accounts, one workspace.** Add 2, 5, or 10+ real Telegram accounts to the same Entergram workspace and expose them all through a single MCP connection.
- **Query every account at once.** Ask your AI to search the whole workspace — all accounts in one answer.
- **Or scope to a single account.** Target just one account when you need to read or reply from a specific number.
- **Real accounts, no bots.** Entergram connects genuine personal Telegram accounts, so your AI sees the same DMs, groups, and channels you do.
- **CRM-aware.** Beyond messages, the AI can work with Entergram tickets, pipeline stages, tags, and custom fields tied to each chat.

**Example prompts:**

- *"Across all my Telegram accounts, list every chat waiting on a reply for more than 2 hours."*
- *"On my sales account only, send a follow-up to the leads I messaged yesterday."*
- *"Summarise today's conversations from all 10 accounts and tag the hot leads in the CRM."*

Entergram is the [Telegram CRM and support platform](https://www.entergram.com) — the MCP server exposes that same multi-account workspace to your AI tools.

---

## Supported AI hosts

`@entergram/mcp` and the remote gateway work with any client that speaks the Model Context Protocol, including:

- **Claude** & **Claude Code** (Anthropic)
- **ChatGPT** (OpenAI)
- **Cursor**
- **Codex**
- **n8n** and **Make.com** automation workflows
- Any other MCP-compatible host

---

## Contents

- [Quick Start](#quick-start)
- [Install](#install)
- [Gateway URL](#gateway-url)
- [Commands](#commands)
- [Host config](#host-config)
- [Defaults](#defaults)
- [Choosing a client](#choosing-a-client)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Recommended: remote HTTP MCP

For modern MCP hosts such as Claude Code and Codex, connect to the remote Streamable HTTP server directly — the npm package is **not** required for this path.

**Claude Code:**

```bash
claude mcp add --transport http entergram https://mcp.entergram.com/mcp
```

**Codex** (`config.toml`):

```toml
[mcp_servers.entergram]
url = "https://mcp.entergram.com/mcp"
```

Then run the host's MCP login flow — for example `/mcp` in Claude Code or `codex mcp login entergram` in Codex.

You can print the same config from the helper:

```bash
entergram-mcp print-config --format toml --name entergram
```

### Fallback: local stdio bridge

Use this **only** when the MCP host cannot connect to remote HTTP MCP directly. The `entergram-mcp` CLI then acts as a local `stdio` bridge and handles OAuth login, local token storage, Dynamic Client Registration (DCR), Client ID Metadata Document (CIMD), and `stdio` bridging to the hosted gateway.

```bash
entergram-mcp login
entergram-mcp serve
```

If you use a custom OAuth client, pass it explicitly:

```bash
entergram-mcp login --client-id entergram-ws-your-client-id
```

Print the stdio bridge config:

```bash
entergram-mcp print-config --transport stdio --format toml --name entergram
```

---

## Install

```bash
npm install -g @entergram/mcp
```

Or run it without a global install:

```bash
npx -y @entergram/mcp serve
```

---

## Gateway URL

The production MCP gateway URL is intentionally built into this client, so users don't need environment-specific configuration just to connect:

```text
https://mcp.entergram.com/mcp
```

You can override it for development or testing:

```bash
entergram-mcp print-config --gateway-url https://devmcp.entergram.com/mcp
entergram-mcp login --gateway-url https://devmcp.entergram.com/mcp
```

Or with an environment variable:

```bash
ENTERGRAM_MCP_GATEWAY_URL=https://devmcp.entergram.com/mcp entergram-mcp serve
```

---

## Commands

```bash
entergram-mcp --help
entergram-mcp login
entergram-mcp whoami
entergram-mcp logout
entergram-mcp serve
entergram-mcp print-config
```

**Useful flags:**

- `--env production`
- `--auth-mode auto|preconfigured|dcr|cimd`
- `--client-id ...`
- `--client-metadata-url ...`
- `--scope "..."`
- `--format json|toml`
- `--transport http|stdio`

---

## Host config

For JSON-based MCP hosts:

```bash
entergram-mcp print-config --name entergram
```

For TOML-based hosts such as Codex:

```bash
entergram-mcp print-config --format toml --name entergram
```

**Example remote HTTP TOML config:**

```toml
[mcp_servers.entergram]
url = "https://mcp.entergram.com/mcp"
```

**Example stdio bridge TOML config:**

```toml
[mcp_servers.entergram]
command = "npx"
args = ["-y", "@entergram/mcp", "serve"]

[mcp_servers.entergram.env]
ENTERGRAM_MCP_AUTH_MODE = "auto"
ENTERGRAM_MCP_ENV = "production"
ENTERGRAM_MCP_SCOPE = "workspace.read members.read accounts.read contacts.read chats.read chats.write messages.read messages.write custom_fields.read custom_fields.write tickets.read tickets.write offline_access"
```

---

## Defaults

- **Gateway:** `https://mcp.entergram.com/mcp`
- **Auth mode:** `auto`
- **Preconfigured fallback client id:** `entergram-mcp-cli`
- **Local OAuth callback:** `http://127.0.0.1:8787/oauth/callback`
- **Session files:** `~/.entergram-mcp/`

---

## Choosing a client

The local stdio bridge supports four auth modes:

- `auto` — use saved client information, a provided CIMD URL, or DCR.
- `preconfigured` — use `--client-id` or the built-in public client id.
- `dcr` — force dynamic client registration for the local bridge.
- `cimd` — require `--client-metadata-url`.

Use a **personal preconfigured client** for seat-scoped access.

Use a **workspace client** if you need broader scopes such as:

- `members.read`
- `messages.write`
- `custom_fields.read`
- `custom_fields.write`

When `ENTERGRAM_MCP_CLIENT_ID` starts with `entergram-personal-`, the CLI uses a safer personal default scope that includes `chat_custom_fields.read` and `chat_custom_fields.write`, and excludes workspace-admin scopes such as `members.read` and `custom_fields.write`.

If the consent screen does not show the scopes you expect, update that OAuth client's `allowedScopes` in Entergram first, then run login again.

---

## Troubleshooting

**`invalid_scope`**

- Your OAuth client does not allow one or more requested scopes.
- Update the client in Entergram, then run `entergram-mcp login` again.

**`MCP startup failed: handshaking with MCP server failed`**

- Your MCP host started the local bridge, but the bridge could not authenticate with the remote gateway.
- Make sure you ran login first for the same `--env`, `--auth-mode`, and client settings used by the host.

**`Incompatible auth server: does not support dynamic client registration`**

- Your selected authorization server does not advertise DCR.
- Use remote HTTP MCP directly, provide `--client-id` with `--auth-mode preconfigured`, or provide a supported `--client-metadata-url`.

**`401` or expired token errors**

- Clear the local session and log in again:

```bash
entergram-mcp logout
entergram-mcp login
```

---

## Learn more

- **Telegram MCP server** → https://www.entergram.com/telegram-mcp
- **Telegram CRM & pipeline** → https://www.entergram.com/telegram-crm
- **Telegram support software** → https://www.entergram.com/telegram-support-software
- **Setup guide** → https://www.entergram.com/help-center/security-developers/claude-mcp-connector

---

<sub>Entergram is a Telegram CRM, support, and analytics platform for teams running real Telegram accounts. This package is the official Telegram MCP client.</sub>
