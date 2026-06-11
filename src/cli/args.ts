export type CliFlagValue = boolean | string;

export type ParsedCliArgs = {
  command: string;
  flags: Record<string, CliFlagValue>;
  positionals: string[];
};

function normalizeFlagName(value: string): string {
  return value.trim().replace(/^-+/, "");
}

export function parseCliArgs(argv: string[]): ParsedCliArgs {
  const tokens = [...argv];
  const command = tokens[0] && !tokens[0].startsWith("-") ? tokens.shift()! : "serve";
  const flags: Record<string, CliFlagValue> = {};
  const positionals: string[] = [];

  while (tokens.length > 0) {
    const token = tokens.shift()!;

    if (!token.startsWith("-")) {
      positionals.push(token);
      continue;
    }

    if (token.startsWith("--")) {
      const [rawName, inlineValue] = token.split("=", 2);
      const name = normalizeFlagName(rawName);

      if (inlineValue !== undefined) {
        flags[name] = inlineValue;
        continue;
      }

      const next = tokens[0];
      if (!next || next.startsWith("-")) {
        flags[name] = true;
        continue;
      }

      flags[name] = tokens.shift()!;
      continue;
    }

    const name = normalizeFlagName(token);
    const next = tokens[0];
    if (!next || next.startsWith("-")) {
      flags[name] = true;
      continue;
    }

    flags[name] = tokens.shift()!;
  }

  return {
    command,
    flags,
    positionals,
  };
}

