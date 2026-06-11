import { randomUUID } from "node:crypto";
import { OAuthDiscoveryState, OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import {
  OAuthClientInformationMixed,
  OAuthClientMetadata,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import { openBrowser } from "./browser.js";
import { CliRuntimeConfig } from "./config.js";
import { EntergramSessionStore } from "./session-store.js";

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export class EntergramOAuthProvider implements OAuthClientProvider {
  private pendingState?: string;

  constructor(
    private readonly config: CliRuntimeConfig,
    private readonly store: EntergramSessionStore,
  ) {}

  get redirectUrl(): string {
    return this.config.callbackUrl;
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      client_name: this.config.displayName,
      grant_types: ["authorization_code", "refresh_token"],
      redirect_uris: [this.config.callbackUrl],
      response_types: ["code"],
      scope: this.config.scope,
      token_endpoint_auth_method: "none",
    };
  }

  async clientInformation(): Promise<OAuthClientInformationMixed> {
    return {
      client_id: this.config.clientId,
    };
  }

  async tokens(): Promise<OAuthTokens | undefined> {
    return (await this.store.load())?.tokens;
  }

  async saveTokens(tokens: OAuthTokens): Promise<void> {
    this.pendingState = undefined;
    await this.store.save((current) => ({
      clientId: this.config.clientId,
      codeVerifier: current?.codeVerifier,
      discoveryState: current?.discoveryState,
      expectedState: undefined,
      gatewayUrl: this.config.gatewayUrl,
      lastAuthenticatedAt: new Date().toISOString(),
      scope: this.config.scope,
      tokens,
      updatedAt: new Date().toISOString(),
    }));
  }

  async redirectToAuthorization(authorizationUrl: URL): Promise<void> {
    const opened = await openBrowser(authorizationUrl.href);
    const output = opened
      ? `Opening browser for Entergram authorization: ${authorizationUrl.href}\n`
      : `Open this URL to authorize Entergram MCP:\n${authorizationUrl.href}\n`;

    process.stderr.write(output);
  }

  async saveCodeVerifier(codeVerifier: string): Promise<void> {
    await this.store.save((current) => ({
      clientId: this.config.clientId,
      codeVerifier,
      discoveryState: current?.discoveryState,
      expectedState: current?.expectedState ?? this.pendingState,
      gatewayUrl: this.config.gatewayUrl,
      lastAuthenticatedAt: current?.lastAuthenticatedAt,
      scope: this.config.scope,
      tokens: current?.tokens,
      updatedAt: new Date().toISOString(),
    }));
  }

  async codeVerifier(): Promise<string> {
    const codeVerifier = (await this.store.load())?.codeVerifier;
    if (!codeVerifier) {
      throw new Error("Entergram OAuth code verifier is missing from local session storage.");
    }

    return codeVerifier;
  }

  async invalidateCredentials(
    scope: "all" | "client" | "tokens" | "verifier" | "discovery",
  ): Promise<void> {
    this.pendingState = undefined;
    if (scope === "all") {
      await this.store.clear();
      return;
    }

    await this.store.save((current) => ({
      clientId: this.config.clientId,
      codeVerifier: scope === "verifier" ? undefined : current?.codeVerifier,
      discoveryState: scope === "discovery" ? undefined : current?.discoveryState,
      expectedState: undefined,
      gatewayUrl: this.config.gatewayUrl,
      lastAuthenticatedAt: current?.lastAuthenticatedAt,
      scope: this.config.scope,
      tokens: scope === "tokens" ? undefined : current?.tokens,
      updatedAt: new Date().toISOString(),
    }));
  }

  async validateResourceURL(
    _serverUrl: string | URL,
    resource?: string,
  ): Promise<URL> {
    const expected = new URL(this.config.gatewayUrl);
    if (!resource) {
      return expected;
    }

    const actual = new URL(resource);
    if (actual.href !== expected.href) {
      throw new Error(
        `Unexpected OAuth resource URL. Expected ${expected.href}, received ${actual.href}.`,
      );
    }

    return actual;
  }

  async saveDiscoveryState(state: OAuthDiscoveryState): Promise<void> {
    await this.store.save((current) => ({
      clientId: this.config.clientId,
      codeVerifier: current?.codeVerifier,
      discoveryState: state,
      expectedState: current?.expectedState ?? this.pendingState,
      gatewayUrl: this.config.gatewayUrl,
      lastAuthenticatedAt: current?.lastAuthenticatedAt,
      scope: this.config.scope,
      tokens: current?.tokens,
      updatedAt: new Date().toISOString(),
    }));
  }

  async discoveryState(): Promise<OAuthDiscoveryState | undefined> {
    const persistedState = (await this.store.load())?.discoveryState;
    if (persistedState) {
      return persistedState;
    }

    if (!this.config.oauthIssuerUrl) {
      return undefined;
    }

    const issuer = new URL(this.config.oauthIssuerUrl);
    const normalizedIssuer = trimTrailingSlash(issuer.href);

    return {
      authorizationServerMetadata: {
        authorization_endpoint: new URL("/oauth/authorize", issuer).href,
        code_challenge_methods_supported: ["S256"],
        grant_types_supported: ["authorization_code", "refresh_token"],
        issuer: normalizedIssuer,
        jwks_uri: new URL("/oauth/jwks.json", issuer).href,
        response_modes_supported: ["query"],
        response_types_supported: ["code"],
        token_endpoint: new URL("/oauth/token", issuer).href,
        token_endpoint_auth_methods_supported: ["none"],
      },
      authorizationServerUrl: issuer.href,
      resourceMetadata: {
        authorization_servers: [issuer.href],
        resource: this.config.gatewayUrl,
        resource_documentation: new URL("/settings", issuer).href,
        resource_name: this.config.displayName,
      },
    };
  }

  expectedState(): string | undefined {
    return this.pendingState;
  }

  state(): string {
    const state = randomUUID();
    this.pendingState = state;

    void this.store
      .save((current) => ({
        clientId: this.config.clientId,
        codeVerifier: current?.codeVerifier,
        discoveryState: current?.discoveryState,
        expectedState: state,
        gatewayUrl: this.config.gatewayUrl,
        lastAuthenticatedAt: current?.lastAuthenticatedAt,
        scope: this.config.scope,
        tokens: current?.tokens,
        updatedAt: new Date().toISOString(),
      }))
      .catch(() => undefined);

    return state;
  }
}
