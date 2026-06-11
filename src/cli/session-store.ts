import fs from "node:fs/promises";
import path from "node:path";
import { OAuthDiscoveryState } from "@modelcontextprotocol/sdk/client/auth.js";
import {
  OAuthClientInformationMixed,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import { OAuthRegistrationMode } from "./config.js";

export type StoredSession = {
  authMode?: OAuthRegistrationMode;
  clientId?: string;
  clientInformation?: OAuthClientInformationMixed;
  clientMetadataUrl?: string;
  codeVerifier?: string;
  discoveryState?: OAuthDiscoveryState;
  expectedState?: string;
  gatewayUrl: string;
  lastAuthenticatedAt?: string;
  scope: string;
  tokens?: OAuthTokens;
  updatedAt: string;
};

export class EntergramSessionStore {
  constructor(private readonly sessionFilePath: string) {}

  async clear(): Promise<void> {
    try {
      await fs.rm(this.sessionFilePath, { force: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  async load(): Promise<StoredSession | undefined> {
    try {
      const raw = await fs.readFile(this.sessionFilePath, "utf8");
      return JSON.parse(raw) as StoredSession;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === "ENOENT") {
        return undefined;
      }
      throw error;
    }
  }

  async save(
    updater: (current: StoredSession | undefined) => StoredSession,
  ): Promise<StoredSession> {
    const current = await this.load();
    const next = updater(current);

    await fs.mkdir(this.sessionDirectoryPath(), { recursive: true });
    await fs.writeFile(
      this.sessionFilePath,
      `${JSON.stringify(next, null, 2)}\n`,
      {
        encoding: "utf8",
        mode: 0o600,
      },
    );

    return next;
  }

  private sessionDirectoryPath(): string {
    return path.dirname(this.sessionFilePath);
  }
}
