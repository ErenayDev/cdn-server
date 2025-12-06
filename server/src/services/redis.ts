import { RedisClient } from "bun";
import type { AssetCacheStats, CachedAsset } from "../types/assets";

class CDNAssetCacheManager {
  private client: RedisClient;
  private stats: AssetCacheStats = { hits: 0, misses: 0 };
  private readonly keyPrefix = "cdn:assets:";
  private readonly ttlConfig: Record<string, number> = {
    "image/jpeg": 86400 * 7,
    "image/png": 86400 * 7,
    "image/webp": 86400 * 30,
    "image/gif": 86400 * 3,
    "video/mp4": 3600 * 6,
    "video/webm": 3600 * 6,
    "application/pdf": 86400 * 14,
    default: 86400,
  };

  constructor(connectionString?: string) {
    this.client = new RedisClient(connectionString, {
      enableAutoPipelining: false,
    });

    this.client.onconnect = () => {
      console.log("CDN cache connected to Redis");
    };

    this.client.onclose = (error) => {
      console.error("CDN cache disconnected:", error);
    };
  }

  private getKey(filename: string): string {
    return `${this.keyPrefix}${filename}`;
  }

  private getTTL(mimeType: string): number {
    return this.ttlConfig[mimeType] ?? this.ttlConfig.default;
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
  ): Promise<T | null> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        if (
          attempt === maxRetries ||
          error.code !== "ERR_REDIS_CONNECTION_CLOSED"
        ) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, attempt * 100));
      }
    }
    return null;
  }

  async cacheAsset(
    filename: string,
    buffer: Buffer,
    mimeType: string,
    stats?: any,
  ): Promise<void> {
    try {
      const key = this.getKey(filename);
      const ttl = this.getTTL(mimeType);
      const cachedAsset: CachedAsset = {
        buffer: buffer.toString("base64"),
        mimeType,
        size: buffer.length,
        lastModified: stats?.mtime?.toISOString() || new Date().toISOString(),
        etag: `"${Buffer.from(filename + stats?.mtime).toString("base64")}"`,
        cachedAt: Date.now(),
      };

      await this.executeWithRetry(async () => {
        await this.client.set(key, JSON.stringify(cachedAsset));
        await this.client.expire(key, ttl);
      });
    } catch (error) {
      console.error(`CDN cache error [${filename}]:`, error);
    }
  }

  async getAsset(filename: string): Promise<{
    buffer: Buffer;
    mimeType: string;
    size: number;
    lastModified: string;
    etag: string;
    cachedAt: number;
  } | null> {
    try {
      const key = this.getKey(filename);
      const cached = await this.executeWithRetry(() => this.client.get(key));

      if (cached) {
        this.stats.hits++;
        const asset = JSON.parse(cached) as CachedAsset;
        const buffer =
          typeof asset.buffer === "string"
            ? Buffer.from(asset.buffer, "base64")
            : (asset.buffer as Buffer);

        return {
          buffer,
          mimeType: asset.mimeType,
          size: asset.size,
          lastModified: asset.lastModified,
          etag: asset.etag,
          cachedAt: asset.cachedAt,
        };
      } else {
        this.stats.misses++;
        return null;
      }
    } catch (error) {
      this.stats.misses++;
      console.error(`CDN cache get error [${filename}]:`, error);
      return null;
    }
  }

  async invalidate(filename: string): Promise<void> {
    try {
      const key = this.getKey(filename);
      await this.executeWithRetry(() => this.client.del(key));
    } catch (error) {
      console.error(`CDN cache invalidate error [${filename}]:`, error);
    }
  }

  async exists(filename: string): Promise<boolean> {
    try {
      const key = this.getKey(filename);
      const result = await this.executeWithRetry(() => this.client.exists(key));
      return Boolean(result);
    } catch (error) {
      console.log(`[ERROR] ${(error as Error).message}`);
      return false;
    }
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      total,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const testKey = `${this.keyPrefix}health:check`;
      await this.executeWithRetry(async () => {
        await this.client.set(testKey, "ok");
        const result = await this.client.get(testKey);
        await this.client.del(testKey);
        return result === "ok";
      });
      return true;
    } catch {
      return false;
    }
  }

  close(): void {
    this.client.close();
  }
}

export default CDNAssetCacheManager;
