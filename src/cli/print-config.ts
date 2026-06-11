import { CliRuntimeConfig } from "./config.js";

export type HostConfigFormat = "json" | "toml";

export function buildHostConfigSnippet(
  config: CliRuntimeConfig,
  serverName: string,
): Record<string, unknown> {
  return {
    mcpServers: {
      [serverName]: {
        command: "npx",
        args: ["-y", "@entergram/mcp", "serve"],
        env: {
          ENTERGRAM_MCP_ENV: config.environment,
          ENTERGRAM_MCP_CLIENT_ID: config.clientId,
          ENTERGRAM_MCP_SCOPE: config.scope,
        },
      },
    },
  };
}

function tomlString(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"")}"`;
}

export function buildHostConfigToml(
  config: CliRuntimeConfig,
  serverName: string,
): string {
  return [
    `[mcp_servers.${serverName}]`,
    `command = "npx"`,
    `args = ["-y", "@entergram/mcp", "serve"]`,
    "",
    `[mcp_servers.${serverName}.env]`,
    `ENTERGRAM_MCP_ENV = ${tomlString(config.environment)}`,
    `ENTERGRAM_MCP_CLIENT_ID = ${tomlString(config.clientId)}`,
    `ENTERGRAM_MCP_SCOPE = ${tomlString(config.scope)}`,
    "",
  ].join("\n");
}
