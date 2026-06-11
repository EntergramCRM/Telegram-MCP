import http from "node:http";

type OAuthCallbackResult =
  | { code: string; state?: string }
  | { error: string; errorDescription?: string };

function renderCallbackHtml(options: {
  message: string;
  title: string;
}): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${options.title}</title>
    <style>
      :root {
        color-scheme: light;
        font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background:
          radial-gradient(circle at top, rgba(255, 186, 73, 0.28), transparent 42%),
          linear-gradient(180deg, #fffaf2 0%, #f6efe4 100%);
        color: #2f2418;
      }
      main {
        width: min(560px, calc(100vw - 40px));
        padding: 32px;
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.9);
        box-shadow: 0 30px 80px rgba(78, 49, 20, 0.15);
      }
      h1 {
        margin: 0 0 12px;
        font-size: 28px;
        line-height: 1.1;
      }
      p {
        margin: 0;
        font-size: 16px;
        line-height: 1.6;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>${options.title}</h1>
      <p>${options.message}</p>
    </main>
  </body>
</html>`;
}

export async function waitForOAuthCallback(
  callbackUrl: string,
  timeoutMs: number,
  getExpectedState?: () => string | undefined,
): Promise<string> {
  const callback = new URL(callbackUrl);
  const server = http.createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(Number(callback.port), callback.hostname, () => resolve());
  });

  const result = await new Promise<OAuthCallbackResult>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Timed out waiting for Entergram OAuth callback."));
    }, timeoutMs);

    server.on("request", (request, response) => {
      const requestUrl = new URL(request.url || "/", callback);

      if (requestUrl.pathname !== callback.pathname) {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Not found");
        return;
      }

      const error = requestUrl.searchParams.get("error");
      const errorDescription = requestUrl.searchParams.get("error_description") || undefined;
      const code = requestUrl.searchParams.get("code");
      const state = requestUrl.searchParams.get("state") || undefined;
      const expectedState = getExpectedState?.();

      clearTimeout(timeout);

      if (error) {
        response.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        response.end(
          renderCallbackHtml({
            message: errorDescription || "The authorization flow was cancelled or failed.",
            title: "Entergram MCP authorization failed",
          }),
        );
        resolve({
          error,
          errorDescription,
        });
        return;
      }

      if (!code) {
        response.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        response.end(
          renderCallbackHtml({
            message: "No authorization code was returned to the Entergram MCP client.",
            title: "Entergram MCP authorization failed",
          }),
        );
        resolve({
          error: "missing_code",
          errorDescription: "No authorization code was returned.",
        });
        return;
      }

      if (getExpectedState && (!expectedState || state !== expectedState)) {
        response.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        response.end(
          renderCallbackHtml({
            message:
              "The authorization response could not be verified. Please retry the Entergram MCP sign-in flow.",
            title: "Entergram MCP authorization failed",
          }),
        );
        resolve({
          error: "invalid_state",
          errorDescription: "The returned OAuth state did not match the active authorization request.",
        });
        return;
      }

      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(
        renderCallbackHtml({
          message:
            "Authorization completed. You can close this browser tab and return to your MCP host.",
          title: "Entergram MCP connected",
        }),
      );
      resolve({ code, state });
    });
  });

  try {
    if ("error" in result) {
      throw new Error(
        result.errorDescription ||
          `Entergram OAuth failed with error: ${result.error}`,
      );
    }

    return result.code;
  } finally {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
}
