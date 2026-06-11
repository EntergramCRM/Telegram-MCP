import { randomUUID } from "node:crypto";
import { OAuthDiscoveryState, OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import {
  OAuthClientInformationMixed,
  OAuthClientMetadata,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import { openBrowser } from "./browser.js";
import { CliRuntimeConfig } from "./config.js";
import { CLI_VERSION } from "./constants.js";
import { EntergramSessionStore, StoredSession } from "./session-store.js";

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export class EntergramOAuthProvider implements OAuthClientProvider {
  private pendingState?: string;
  readonly clientMetadataUrl?: string;

  constructor(
    private readonly config: CliRuntimeConfig,
    private readonly store: EntergramSessionStore,
  ) {
    this.clientMetadataUrl = config.clientMetadataUrl;
  }

  get redirectUrl(): string {
    return this.config.callbackUrl;
  }

  get clientMetadata(): OAuthClientMetadata {
    const metadata: OAuthClientMetadata & { application_type: "native" } = {
      application_type: "native",
      client_name: this.config.displayName,
      client_uri: "https://entergram.com",
      grant_types: ["authorization_code", "refresh_token"],
      redirect_uris: [this.config.callbackUrl],
      response_types: ["code"],
      scope: this.config.scope,
      software_id: "entergram-mcp",
      software_version: CLI_VERSION,
      token_endpoint_auth_method: "none",
    };

    return metadata;
  }

  async clientInformation(): Promise<OAuthClientInformationMixed | undefined> {
    const stored = await this.store.load();
    if (stored?.clientInformation) {
      return stored.clientInformation;
    }

    if (this.config.clientId) {
      return {
        client_id: this.config.clientId,
      };
    }

    return undefined;
  }

  async saveClientInformation(
    clientInformation: OAuthClientInformationMixed,
  ): Promise<void> {
    await this.store.save((current) =>
      this.nextSession(current, {
        clientId: clientInformation.client_id,
        clientInformation,
      }),
    );
  }

  async tokens(): Promise<OAuthTokens | undefined> {
    return (await this.store.load())?.tokens;
  }

  async saveTokens(tokens: OAuthTokens): Promise<void> {
    this.pendingState = undefined;
    await this.store.save((current) =>
      this.nextSession(current, {
        expectedState: undefined,
        lastAuthenticatedAt: new Date().toISOString(),
        tokens,
      }),
    );
  }

  async redirectToAuthorization(authorizationUrl: URL): Promise<void> {
    const opened = await openBrowser(authorizationUrl.href);
    const output = opened
      ? `Opening browser for Entergram authorization: ${authorizationUrl.href}\n`
      : `Open this URL to authorize Entergram MCP:\n${authorizationUrl.href}\n`;

    process.stderr.write(output);
  }

  async saveCodeVerifier(codeVerifier: string): Promise<void> {
    await this.store.save((current) =>
      this.nextSession(current, {
        codeVerifier,
        expectedState: current?.expectedState ?? this.pendingState,
      }),
    );
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

    await this.store.save((current) => {
      const updates: Partial<StoredSession> = {
        expectedState: undefined,
      };

      if (scope === "client") {
        updates.clientId = this.config.clientId;
        updates.clientInformation = undefined;
      }
      if (scope === "verifier") {
        updates.codeVerifier = undefined;
      }
      if (scope === "discovery") {
        updates.discoveryState = undefined;
      }
      if (scope === "tokens") {
        updates.tokens = undefined;
      }

      return this.nextSession(current, updates);
    });
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
    await this.store.save((current) =>
      this.nextSession(current, {
        discoveryState: state,
        expectedState: current?.expectedState ?? this.pendingState,
      }),
    );
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
        registration_endpoint: new URL("/oauth/register", issuer).href,
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
      .save((current) =>
        this.nextSession(current, {
          expectedState: state,
        }),
      )
      .catch(() => undefined);

    return state;
  }

  private nextSession(
    current: StoredSession | undefined,
    updates: Partial<StoredSession>,
  ): StoredSession {
    const hasUpdate = (key: keyof StoredSession) =>
      Object.prototype.hasOwnProperty.call(updates, key);
    const clientInformation = hasUpdate("clientInformation")
      ? updates.clientInformation
      : current?.clientInformation;
    const clientId =
      hasUpdate("clientId")
        ? updates.clientId
        : this.config.clientId ?? clientInformation?.client_id ?? current?.clientId;

    return {
      authMode: this.config.authMode,
      clientId,
      clientInformation,
      clientMetadataUrl: this.config.clientMetadataUrl,
      codeVerifier: hasUpdate("codeVerifier")
        ? updates.codeVerifier
        : current?.codeVerifier,
      discoveryState: hasUpdate("discoveryState")
        ? updates.discoveryState
        : current?.discoveryState,
      expectedState: hasUpdate("expectedState")
        ? updates.expectedState
        : current?.expectedState,
      gatewayUrl: this.config.gatewayUrl,
      lastAuthenticatedAt: hasUpdate("lastAuthenticatedAt")
        ? updates.lastAuthenticatedAt
        : current?.lastAuthenticatedAt,
      scope: this.config.scope,
      tokens: hasUpdate("tokens") ? updates.tokens : current?.tokens,
      updatedAt: new Date().toISOString(),
    };
  }
}
