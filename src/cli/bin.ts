#!/usr/bin/env node

import { EntergramOAuthProvider } from "./oauth-provider.js";
import { parseCliArgs } from "./args.js";
import { startLocalBridge } from "./bridge.js";
import { resolveCliRuntimeConfig } from "./config.js";
import { ENTERGRAM_HOST_NAME } from "./constants.js";
import {
  buildHostConfigSnippet,
  buildHostConfigToml,
  HostConfigFormat,
} from "./print-config.js";
import { EntergramRemoteClient } from "./remote-client.js";
import { EntergramSessionStore } from "./session-store.js";

function printHelp(): void {
  process.stdout.write(`Entergram MCP CLI

Usage:
  entergram-mcp serve
  entergram-mcp login
  entergram-mcp whoami
  entergram-mcp logout
  entergram-mcp print-config [--name entergram]

Flags:
  --env dev|production
  --gateway-url https://custom.example.com/mcp
  --client-id entergram-mcp-cli
  --scope "workspace.read ..."
  --callback-port 8787
  --config-dir /custom/path
  --format json|toml
`);
}

function getConfigFormat(flags: Record<string, boolean | string>): HostConfigFormat {
  const value = flags.format;
  if (value === undefined) {
    return "json";
  }

  if (typeof value !== "string") {
    throw new Error('Expected "--format" to be either "json" or "toml".');
  }

  if (value === "json" || value === "toml") {
    return value;
  }

  throw new Error(`Unsupported Entergram MCP config format: ${value}`);
}

async function withRemoteClient<T>(
  flags: Record<string, boolean | string>,
  callback: (client: EntergramRemoteClient, store: EntergramSessionStore) => Promise<T>,
): Promise<T> {
  const config = resolveCliRuntimeConfig(flags);
  const store = new EntergramSessionStore(config.sessionFilePath);
  const provider = new EntergramOAuthProvider(config, store);
  const client = new EntergramRemoteClient(config, provider);

  try {
    return await callback(client, store);
  } finally {
    await client.close().catch(() => undefined);
  }
}

async function run(): Promise<void> {
  const parsed = parseCliArgs(process.argv.slice(2));
  if (parsed.flags.help === true || parsed.flags.h === true) {
    printHelp();
    return;
  }

  const config = resolveCliRuntimeConfig(parsed.flags);

  switch (parsed.command) {
    case "help":
    case "--help":
    case "-h":
      printHelp();
      return;
    case "serve":
      await startLocalBridge(config);
      return;
    case "login":
      await withRemoteClient(parsed.flags, async (client) => {
        await client.connect({ interactive: true });
        const me = await client.callTool({
          arguments: {},
          name: "entergram_get_me",
        });
        process.stdout.write(`${JSON.stringify(me.structuredContent ?? me, null, 2)}\n`);
      });
      return;
    case "whoami":
      await withRemoteClient(parsed.flags, async (client) => {
        await client.connect({ interactive: true });
        const me = await client.callTool({
          arguments: {},
          name: "entergram_get_me",
        });
        process.stdout.write(`${JSON.stringify(me.structuredContent ?? me, null, 2)}\n`);
      });
      return;
    case "logout":
      await withRemoteClient(parsed.flags, async (_client, store) => {
        await store.clear();
        process.stdout.write(
          `Cleared local Entergram MCP session for ${config.environment} (${config.clientId}).\n`,
        );
      });
      return;
    case "print-config": {
      const configuredName =
        typeof parsed.flags.name === "string" && parsed.flags.name.trim()
          ? parsed.flags.name.trim()
          : "entergram";
      const format = getConfigFormat(parsed.flags);

      if (format === "toml") {
        process.stdout.write(buildHostConfigToml(config, configuredName));
        return;
      }

      const snippet = buildHostConfigSnippet(config, configuredName);
      process.stdout.write(`${JSON.stringify(snippet, null, 2)}\n`);
      return;
    }
    default:
      throw new Error(
        `Unknown Entergram MCP command "${parsed.command}". Run "${ENTERGRAM_HOST_NAME.toLowerCase().replaceAll(" ", "-")} help" for usage.`,
      );
  }
}

void run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
