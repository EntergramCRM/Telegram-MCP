import os from "node:os";
import path from "node:path";
import {
  DEFAULT_CALLBACK_HOST,
  DEFAULT_CALLBACK_PATH,
  DEFAULT_CALLBACK_PORT,
  DEFAULT_CONFIG_DIRECTORY_NAME,
  DEFAULT_PERSONAL_SCOPE,
  DEFAULT_WORKSPACE_SCOPE,
} from "./constants.js";

export type EntergramEnvironmentName = "production" | "dev";

type EnvironmentPreset = {
  clientId: string;
  displayName: string;
  gatewayUrl: string;
  oauthIssuerUrl?: string;
};

const ENVIRONMENT_PRESETS: Record<EntergramEnvironmentName, EnvironmentPreset> = {
  dev: {
    clientId: "entergram-dev-mcp-client",
    displayName: "Entergram MCP Dev",
    gatewayUrl: "https://devmcp.entergram.com/mcp",
    oauthIssuerUrl: "https://dev.entergram.com/",
  },
  production: {
    clientId: "entergram-mcp-cli",
    displayName: "Entergram MCP",
    gatewayUrl: "https://mcp.entergram.com/mcp",
  },
};

function getStringFlag(
  flags: Record<string, boolean | string>,
  name: string,
): string | undefined {
  const value = flags[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getEnvironmentName(
  flags: Record<string, boolean | string>,
): EntergramEnvironmentName {
  const value =
    getStringFlag(flags, "env") ||
    process.env.ENTERGRAM_MCP_ENV?.trim() ||
    "production";

  if (value === "dev" || value === "production") {
    return value;
  }

  throw new Error(`Unsupported Entergram MCP environment: ${value}`);
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer, received: ${value}`);
  }

  return parsed;
}

function sanitizeFileSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

function defaultScopeForClientId(clientId: string): string {
  if (clientId.startsWith("entergram-personal-")) {
    return DEFAULT_PERSONAL_SCOPE;
  }

  return DEFAULT_WORKSPACE_SCOPE;
}

export type CliRuntimeConfig = {
  callbackUrl: string;
  clientId: string;
  configDir: string;
  displayName: string;
  environment: EntergramEnvironmentName;
  gatewayUrl: string;
  oauthIssuerUrl?: string;
  scope: string;
  sessionFilePath: string;
};

export function resolveCliRuntimeConfig(
  flags: Record<string, boolean | string>,
): CliRuntimeConfig {
  const environment = getEnvironmentName(flags);
  const preset = ENVIRONMENT_PRESETS[environment];

  const gatewayUrl =
    getStringFlag(flags, "gateway-url") ||
    process.env.ENTERGRAM_MCP_GATEWAY_URL?.trim() ||
    preset.gatewayUrl;
  const clientId =
    getStringFlag(flags, "client-id") ||
    process.env.ENTERGRAM_MCP_CLIENT_ID?.trim() ||
    preset.clientId;
  const oauthIssuerUrl =
    getStringFlag(flags, "oauth-issuer-url") ||
    process.env.ENTERGRAM_MCP_OAUTH_ISSUER_URL?.trim() ||
    preset.oauthIssuerUrl;
  const defaultScope = defaultScopeForClientId(clientId);
  const scope =
    getStringFlag(flags, "scope") ||
    process.env.ENTERGRAM_MCP_SCOPE?.trim() ||
    defaultScope;
  const callbackPort = parsePositiveInteger(
    getStringFlag(flags, "callback-port") ||
      process.env.ENTERGRAM_MCP_CALLBACK_PORT?.trim(),
    DEFAULT_CALLBACK_PORT,
  );
  const configDir =
    getStringFlag(flags, "config-dir") ||
    process.env.ENTERGRAM_MCP_CONFIG_DIR?.trim() ||
    path.join(os.homedir(), DEFAULT_CONFIG_DIRECTORY_NAME);

  const gateway = new URL(gatewayUrl);
  const callbackUrl = new URL(
    DEFAULT_CALLBACK_PATH,
    `http://${DEFAULT_CALLBACK_HOST}:${callbackPort}`,
  ).href;

  const fileKey = sanitizeFileSegment(`${environment}-${gateway.host}-${clientId}`);

  return {
    callbackUrl,
    clientId,
    configDir,
    displayName: preset.displayName,
    environment,
    gatewayUrl: gateway.href,
    oauthIssuerUrl,
    scope,
    sessionFilePath: path.join(configDir, `${fileKey}.json`),
  };
}
