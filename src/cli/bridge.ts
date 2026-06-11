import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  PromptListChangedNotificationSchema,
  ReadResourceRequestSchema,
  ResourceListChangedNotificationSchema,
  ResourceUpdatedNotificationSchema,
  SubscribeRequestSchema,
  ToolListChangedNotificationSchema,
  UnsubscribeRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { CliRuntimeConfig } from "./config.js";
import { CLI_VERSION, ENTERGRAM_HOST_NAME } from "./constants.js";
import { EntergramOAuthProvider } from "./oauth-provider.js";
import { EntergramRemoteClient } from "./remote-client.js";
import { EntergramSessionStore } from "./session-store.js";

function createCapabilities(remoteClient: EntergramRemoteClient) {
  const capabilities = remoteClient.connectedClient.getServerCapabilities();

  return {
    prompts: capabilities?.prompts,
    resources: capabilities?.resources,
    tools: capabilities?.tools ?? {},
  };
}

function buildInstructions(remoteClient: EntergramRemoteClient): string {
  const remoteInstructions = remoteClient.connectedClient.getInstructions();
  const bridgeInstructions =
    "This is the local stdio Entergram MCP bridge. It transparently proxies requests to the public Entergram MCP gateway over OAuth-protected Streamable HTTP.";

  return remoteInstructions
    ? `${remoteInstructions}\n\n${bridgeInstructions}`
    : bridgeInstructions;
}

export async function startLocalBridge(config: CliRuntimeConfig): Promise<void> {
  const store = new EntergramSessionStore(config.sessionFilePath);
  const authProvider = new EntergramOAuthProvider(config, store);
  const remoteClient = new EntergramRemoteClient(config, authProvider);

  try {
    await remoteClient.connect({ interactive: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Entergram MCP bridge could not connect to the remote gateway. Run "entergram-mcp login --env ${config.environment} --client-id ${config.clientId}" first, then restart your MCP host. Original error: ${message}`,
    );
  }

  const server = new Server(
    {
      name: ENTERGRAM_HOST_NAME,
      version: CLI_VERSION,
    },
    {
      capabilities: createCapabilities(remoteClient),
      instructions: buildInstructions(remoteClient),
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async (request) =>
    remoteClient.listTools(request.params),
  );
  server.setRequestHandler(CallToolRequestSchema, async (request) =>
    remoteClient.callTool(request.params),
  );

  if (remoteClient.connectedClient.getServerCapabilities()?.prompts) {
    server.setRequestHandler(ListPromptsRequestSchema, async (request) =>
      remoteClient.listPrompts(request.params),
    );
    server.setRequestHandler(GetPromptRequestSchema, async (request) =>
      remoteClient.getPrompt(request.params),
    );
  }

  if (remoteClient.connectedClient.getServerCapabilities()?.resources) {
    server.setRequestHandler(ListResourcesRequestSchema, async (request) =>
      remoteClient.listResources(request.params),
    );
    server.setRequestHandler(ListResourceTemplatesRequestSchema, async (request) =>
      remoteClient.listResourceTemplates(request.params),
    );
    server.setRequestHandler(ReadResourceRequestSchema, async (request) =>
      remoteClient.readResource(request.params),
    );

    if (remoteClient.connectedClient.getServerCapabilities()?.resources?.subscribe) {
      server.setRequestHandler(SubscribeRequestSchema, async (request) =>
        remoteClient.subscribeResource(request.params),
      );
      server.setRequestHandler(UnsubscribeRequestSchema, async (request) =>
        remoteClient.unsubscribeResource(request.params),
      );
    }
  }

  remoteClient.connectedClient.setNotificationHandler(
    ToolListChangedNotificationSchema,
    async () => {
      await server.sendToolListChanged();
    },
  );
  remoteClient.connectedClient.setNotificationHandler(
    PromptListChangedNotificationSchema,
    async () => {
      await server.sendPromptListChanged();
    },
  );
  remoteClient.connectedClient.setNotificationHandler(
    ResourceListChangedNotificationSchema,
    async () => {
      await server.sendResourceListChanged();
    },
  );
  remoteClient.connectedClient.setNotificationHandler(
    ResourceUpdatedNotificationSchema,
    async (notification) => {
      await server.sendResourceUpdated(notification.params);
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);

  const close = async () => {
    await remoteClient.close();
    await server.close().catch(() => undefined);
    await transport.close().catch(() => undefined);
  };

  process.once("SIGINT", () => {
    void close().finally(() => process.exit(0));
  });
  process.once("SIGTERM", () => {
    void close().finally(() => process.exit(0));
  });
}
