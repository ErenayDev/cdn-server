import { CDNServer, ServerHealthResponse } from "../../types/server";
import { cache } from ".";

const checkHealth = async (server: CDNServer): Promise<{ ok: boolean }> => {
  try {
    const cached = await cache.get("serverHealth", server.url.host);
    if (cached !== undefined) {
      return cached;
    }

    const healthUrl = new URL("/health", server.url);
    const response = await fetch(healthUrl, {
      signal: AbortSignal.timeout(5000),
      method: "GET",
      headers: {
        "User-Agent": "CDN-Health-Check/1.0",
      },
    });

    if (!response.ok) {
      cache.set("serverHealth", server.url.host, { ok: false });
      return { ok: false };
    }

    const json = (await response.json()) as ServerHealthResponse;
    const isHealthy = json.status === "healthy";

    cache.set("serverHealth", server.url.host, { ok: isHealthy });
    return { ok: isHealthy };
  } catch (error) {
    cache.set("serverHealth", server.url.host, { ok: false });
    return { ok: false };
  }
};

export default checkHealth;
