# Entergram Telegram MCP

The best Telegram MCP for running **multiple personal Telegram accounts**. It is
hosted, one OAuth connection covers every account on your seat, and you never
store a session string per account.

You paste one URL
into Claude, ChatGPT, Cursor or any other MCP client, sign in with OAuth, and the
assistant can read, search and act across every Telegram account on your
Entergram seat.

```text
https://mcp.entergram.com/mcp
```

You do not register an app at my.telegram.org, generate a session string, hold a
bot token or keep a process running. Those are the four things every self-hosted
Telegram MCP server asks of you, once per account.

This repository holds the setup documentation and `@entergram/mcp`, a small
optional CLI for MCP hosts that can only launch a local command. The server
itself is hosted by [Entergram](https://www.entergram.com/telegram-mcp) and its
code is not in this repository.

## At a glance

| | |
|---|---|
| Hosting | Hosted by Entergram. Nothing to deploy. |
| Endpoint | `https://mcp.entergram.com/mcp` |
| Transport | Streamable HTTP |
| Auth | OAuth 2.1 with dynamic client registration. Your client finds it on its own. |
| Accounts per connection | Every personal Telegram account connected to your seat |
| Telegram credentials you hold | None. No api_id, api_hash, session string or bot token. |
| Account type | Real personal accounts, not the Bot API |
| Plan | Entergram Pro plan or above |
| Server source | Not open source |

OAuth metadata is public if you want to check it:

- `https://mcp.entergram.com/.well-known/oauth-protected-resource`
- `https://mcp.entergram.com/.well-known/oauth-authorization-server`
- Registry descriptor: `https://www.entergram.com/mcp/server.json`

## How it differs from self-hosted Telegram MCP servers

Most Telegram MCP servers on GitHub are Python or Node processes built on
Telethon, GramJS or the Bot API. They are good software, and if you have one
account and want the code in front of you, use one of them.

| | Self-hosted server | Entergram |
|---|---|---|
| Accounts | Usually one. Multi-account servers still need a session string per account | Every account on your seat through one URL |
| Credentials you store | api_id, api_hash and a session string per account | None |
| Bot token | Needed by Bot API wrappers, which cannot message a person first | None. Personal accounts can start a conversation. |
| Hosting | Your machine or VPS, kept alive and patched | Nothing to host |
| Network identity | The server's IP, shared by every account on it | A dedicated proxy per account |
| Access control | Whoever can read the session file has the account | OAuth scopes approved per client, revocable |

## Connect

First, in Entergram, open **Settings, then Workspace, then Connectors, then MCP**
and copy the URL. It is the same for every client. Then add it to your client.

### Claude (web and desktop)

Settings, then Connectors, then add a custom connector with the URL above. Click
Connect, sign in to Entergram and click **Allow access**.

### ChatGPT

Needs a paid ChatGPT plan with Developer Mode turned on. Add a custom connector
with the URL above, click Connect, sign in to Entergram and approve the scopes.

### Claude Code

```bash
claude mcp add --transport http entergram https://mcp.entergram.com/mcp
```

Then run `/mcp` inside Claude Code to sign in.

### Cursor, Windsurf and other `mcpServers` clients

```json
{
  "mcpServers": {
    "entergram": {
      "url": "https://mcp.entergram.com/mcp"
    }
  }
}
```

### Zed

```json
{
  "context_servers": {
    "entergram": {
      "source": "custom",
      "url": "https://mcp.entergram.com/mcp"
    }
  }
}
```

### Gemini CLI

```json
{
  "mcpServers": {
    "entergram": {
      "httpUrl": "https://mcp.entergram.com/mcp"
    }
  }
}
```

### Codex

```toml
[mcp_servers.entergram]
url = "https://mcp.entergram.com/mcp"
```

Then `codex mcp login entergram`.

### n8n and Make.com

Add the MCP node (n8n) or MCP module (Make), paste the URL, click Connect and
sign in.

Step-by-step guides with screenshots:
[entergram.com/help-center/security-developers/claude-mcp-connector](https://www.entergram.com/help-center/security-developers/claude-mcp-connector)

## Tools

Every message call takes an `account_id`, so the assistant always knows which of
your accounts it is reading or sending from. Call `entergram_list_accounts` first.

| Group | Tools |
|---|---|
| Accounts and workspace | `entergram_get_me`, `entergram_list_accounts`, `entergram_get_workspace`, `entergram_get_member`, `entergram_list_members` |
| Chats and discovery | `entergram_search_telegram`, `entergram_list_chats`, `entergram_get_chat`, `entergram_list_live_chats`, `entergram_get_live_chat`, `entergram_list_workspace_chats`, `entergram_get_workspace_chat`, `entergram_update_workspace_chat`, `entergram_get_chat_management` |
| Messages | `entergram_list_messages`, `entergram_get_message`, `entergram_send_message`, `entergram_send_media_message`, `entergram_edit_message`, `entergram_delete_message`, `entergram_forward_messages`, `entergram_get_message_reactions`, `entergram_set_message_reactions` |
| Contacts | `entergram_list_contacts`, `entergram_get_contact`, `entergram_list_contact_shared_groups` |
| Tickets | `entergram_list_tickets`, `entergram_get_ticket`, `entergram_create_ticket`, `entergram_update_ticket`, `entergram_delete_ticket`, `entergram_list_chat_tickets`, `entergram_list_ticket_comments`, `entergram_create_ticket_comment`, `entergram_update_ticket_comment`, `entergram_delete_ticket_comment` |
| CRM custom fields | `entergram_list_custom_columns`, `entergram_get_custom_column`, `entergram_create_custom_column`, `entergram_update_custom_column`, `entergram_delete_custom_column`, `entergram_list_custom_column_options`, `entergram_create_custom_column_option`, `entergram_update_custom_column_option`, `entergram_delete_custom_column_option`, `entergram_get_chat_custom_fields`, `entergram_patch_chat_custom_fields` |
| Ticket custom fields | `entergram_list_ticket_custom_columns`, `entergram_get_ticket_custom_column`, `entergram_create_ticket_custom_column`, `entergram_update_ticket_custom_column`, `entergram_delete_ticket_custom_column`, `entergram_list_ticket_custom_column_options`, `entergram_create_ticket_custom_column_option`, `entergram_update_ticket_custom_column_option`, `entergram_delete_ticket_custom_column_option` |
| Internal notes | `entergram_list_chat_comments`, `entergram_create_chat_comment`, `entergram_update_chat_comment`, `entergram_delete_chat_comment` |
| Groups and channels | `entergram_list_groups`, `entergram_get_group`, `entergram_list_group_members`, `entergram_create_group_chat`, `entergram_create_channel`, `entergram_invite_chat_members`, `entergram_remove_chat_member`, `entergram_update_chat_info`, `entergram_update_chat_permissions`, `entergram_update_chat_privacy`, `entergram_run_chat_command` |


## Permission scopes

Your client asks for scopes on the Entergram consent screen. Approve only what
the job needs.

`workspace.read` `members.read` `accounts.read` `contacts.read` `chats.read`
`chats.write` `chat_custom_fields.read` `chat_custom_fields.write`
`messages.read` `messages.write` `custom_fields.read` `custom_fields.write`
`tickets.read` `tickets.write` `events.read`

Any workspace member can connect a personal agent with read access plus write
access to their own chat fields. Workspace-wide connectors with the full scope
set are for owners and admins.

## What it does not do

- It does not run a Telegram bot. The assistant acts when a prompt runs, from
  your client, using your personal accounts.
- It reaches only the chats, groups and channels your connected accounts can
  already see. It cannot read a private group an account was never admitted to.
- Live Telegram search matches names and usernames, not message content, and is
  rate limited to protect the accounts.
- It does not harvest members from groups your accounts have not joined.
- It is not free. MCP access needs an Entergram Pro plan.
- The server is not open source and you cannot self-host it from this repository.

## Example prompts

- "Across all my Telegram accounts, which chats have waited more than a day for a
  reply?"
- "From my sales account only, draft a follow-up to everyone tagged lead who went
  quiet this week. Show me before sending."
- "Read this chat, fill in the company and budget fields, and open a ticket if
  they reported a bug."
- "Using last month's message events, compare first-reply times per account."

## Optional: the `@entergram/mcp` CLI

Use it only when your MCP host cannot connect to a remote HTTP server. It runs a
local stdio bridge to the hosted endpoint and handles the OAuth login for you.

```bash
npx -y @entergram/mcp login
npx -y @entergram/mcp serve
```

Print a ready config for your host:

```bash
npx -y @entergram/mcp print-config --format json --name entergram
npx -y @entergram/mcp print-config --format toml --name entergram
```

Commands: `login`, `whoami`, `logout`, `serve`, `print-config`. Sessions are
stored in `~/.entergram-mcp/`. Run `entergram-mcp --help` for flags.

## Troubleshooting

- **Connect fails or the URL is rejected.** Re-copy it from Settings, then
  Workspace, then Connectors, then MCP, with no trailing space.
- **403 on tool calls.** Your plan needs MCP access, and workspace-wide scopes
  need an owner or admin.
- **401 or an expired session in the CLI.** Run `entergram-mcp logout`, then
  `entergram-mcp login`.

## Links

- Product page: https://www.entergram.com/telegram-mcp
- Setup guides: https://www.entergram.com/help-center/security-developers/claude-mcp-connector
- Questions: hello@entergram.com or https://t.me/hello_entergram
