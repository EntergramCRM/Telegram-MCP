import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  OAuthClientProvider,
  UnauthorizedError,
} from "@modelcontextprotocol/sdk/client/auth.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  CallToolRequest,
  GetPromptRequest,
  ListPromptsRequest,
  ListResourcesRequest,
  ListResourceTemplatesRequest,
  ListToolsRequest,
  ReadResourceRequest,
  SubscribeRequest,
  UnsubscribeRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { waitForOAuthCallback } from "./oauth-callback.js";
import { CliRuntimeConfig } from "./config.js";
import { CLI_VERSION, ENTERGRAM_HOST_NAME } from "./constants.js";
import { EntergramOAuthProvider } from "./oauth-provider.js";

type ConnectOptions = {
  interactive: boolean;
};

export class EntergramRemoteClient {
  private client?: Client;
  private transport?: StreamableHTTPClientTransport;

  constructor(
    private readonly config: CliRuntimeConfig,
    private readonly authProvider: OAuthClientProvider & EntergramOAuthProvider,
  ) {}

  get connectedClient(): Client {
    if (!this.client) {
      throw new Error("Entergram remote client is not connected.");
    }

    return this.client;
  }

  async callTool(params: CallToolRequest["params"]) {
    return this.withRetry((client) => client.callTool(params), true);
  }

  async close(): Promise<void> {
    await this.transport?.terminateSession().catch(() => undefined);
    await this.client?.close().catch(() => undefined);
    this.transport = undefined;
    this.client = undefined;
  }

  async connect(options: ConnectOptions): Promise<Client> {
    await this.close();

    const createPair = () => {
      const client = new Client({
        name: ENTERGRAM_HOST_NAME,
        version: CLI_VERSION,
      });
      const transport = new StreamableHTTPClientTransport(new URL(this.config.gatewayUrl), {
        authProvider: this.authProvider,
      });

      return {
        client,
        transport,
      };
    };

    let { client, transport } = createPair();

    try {
      await client.connect(transport);
    } catch (error) {
      if (!(error instanceof UnauthorizedError) || !options.interactive) {
        throw error;
      }

      const callbackPromise = waitForOAuthCallback(
        this.config.callbackUrl,
        5 * 60 * 1000,
        () => this.authProvider.expectedState(),
      );

      const code = await callbackPromise;
      await transport.finishAuth(code);

      await client.close().catch(() => undefined);
      await transport.close().catch(() => undefined);

      ({ client, transport } = createPair());
      await client.connect(transport);
    }

    this.client = client;
    this.transport = transport;

    return client;
  }

  async ensureConnected(options: ConnectOptions): Promise<Client> {
    if (this.client) {
      return this.client;
    }

    return this.connect(options);
  }

  async getPrompt(params: GetPromptRequest["params"]) {
    return this.withRetry((client) => client.getPrompt(params), true);
  }

  async listPrompts(params?: ListPromptsRequest["params"]) {
    return this.withRetry((client) => client.listPrompts(params), true);
  }

  async listResources(params?: ListResourcesRequest["params"]) {
    return this.withRetry((client) => client.listResources(params), true);
  }

  async listResourceTemplates(params?: ListResourceTemplatesRequest["params"]) {
    return this.withRetry((client) => client.listResourceTemplates(params), true);
  }

  async listTools(params?: ListToolsRequest["params"]) {
    return this.withRetry((client) => client.listTools(params), true);
  }

  async readResource(params: ReadResourceRequest["params"]) {
    return this.withRetry((client) => client.readResource(params), true);
  }

  async subscribeResource(params: SubscribeRequest["params"]) {
    return this.withRetry((client) => client.subscribeResource(params), true);
  }

  async unsubscribeResource(params: UnsubscribeRequest["params"]) {
    return this.withRetry((client) => client.unsubscribeResource(params), true);
  }

  private async withRetry<T>(
    callback: (client: Client) => Promise<T>,
    interactive: boolean,
  ): Promise<T> {
    const client = await this.ensureConnected({ interactive });

    try {
      return await callback(client);
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        throw error;
      }

      const refreshedClient = await this.connect({ interactive });
      return callback(refreshedClient);
    }
  }
}
