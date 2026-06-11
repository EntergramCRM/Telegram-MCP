import { CliRuntimeConfig } from "./config.js";

export type HostConfigFormat = "json" | "toml";
export type HostConfigTransport = "http" | "stdio";

export function buildHostConfigSnippet(
  config: CliRuntimeConfig,
  serverName: string,
  transport: HostConfigTransport,
): Record<string, unknown> {
  if (transport === "http") {
    return {
      mcpServers: {
        [serverName]: {
          type: "http",
          url: config.gatewayUrl,
          ...(config.clientId
            ? {
                oauth: {
                  clientId: config.clientId,
                },
              }
            : {}),
        },
      },
    };
  }

  const env: Record<string, string> = {
    ENTERGRAM_MCP_AUTH_MODE: config.authMode,
    ENTERGRAM_MCP_ENV: config.environment,
    ENTERGRAM_MCP_SCOPE: config.scope,
  };
  if (config.clientId) {
    env.ENTERGRAM_MCP_CLIENT_ID = config.clientId;
  }
  if (config.clientMetadataUrl) {
    env.ENTERGRAM_MCP_CLIENT_METADATA_URL = config.clientMetadataUrl;
  }

  return {
    mcpServers: {
      [serverName]: {
        command: "npx",
        args: ["-y", "@entergram/mcp", "serve"],
        env,
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
  transport: HostConfigTransport,
): string {
  if (transport === "http") {
    return [
      `[mcp_servers.${serverName}]`,
      `url = ${tomlString(config.gatewayUrl)}`,
      "",
    ].join("\n");
  }

  const envLines = [
    `ENTERGRAM_MCP_AUTH_MODE = ${tomlString(config.authMode)}`,
    `ENTERGRAM_MCP_ENV = ${tomlString(config.environment)}`,
    `ENTERGRAM_MCP_SCOPE = ${tomlString(config.scope)}`,
  ];
  if (config.clientId) {
    envLines.push(`ENTERGRAM_MCP_CLIENT_ID = ${tomlString(config.clientId)}`);
  }
  if (config.clientMetadataUrl) {
    envLines.push(
      `ENTERGRAM_MCP_CLIENT_METADATA_URL = ${tomlString(config.clientMetadataUrl)}`,
    );
  }

  return [
    `[mcp_servers.${serverName}]`,
    `command = "npx"`,
    `args = ["-y", "@entergram/mcp", "serve"]`,
    "",
    `[mcp_servers.${serverName}.env]`,
    ...envLines,
    "",
  ].join("\n");
}
