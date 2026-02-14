const NORMALIZED_PREFIXES = ["www.", "staging."];

export function normalizeHost(rawHost: string | null | undefined) {
  if (!rawHost) return "";

  let host = rawHost.toLowerCase().trim();
  host = host.split(":")[0] ?? host;

  for (const prefix of NORMALIZED_PREFIXES) {
    if (host.startsWith(prefix)) {
      host = host.slice(prefix.length);
    }
  }

  return host;
}

