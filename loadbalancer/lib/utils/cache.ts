import { LRUCache } from "lru-cache";
import { CacheCategory, CacheConfig, CacheStats } from "../../types/cache";

class CategoryCacheManager {
  private caches = new Map<CacheCategory, LRUCache<string, any>>();
  private stats = new Map<CacheCategory, CacheStats>();

  private configs: Record<CacheCategory, CacheConfig> = {
    assets: {
      max: 1000,
      maxSize: 8000,
      ttl: 1000 * 60 * 60 * 6, // 6 saat
      updateAgeOnGet: false,
      updateAgeOnHas: false,
    },
    serverHealth: {
      max: 500,
      maxSize: 5000,
      ttl: 1000 * 60 * 5, // 5 dakika
      updateAgeOnGet: false,
      updateAgeOnHas: false,
    },
    geoip: {
      max: 10000,
      maxSize: 15000,
      ttl: 1000 * 60 * 60 * 24, // 24 saat
      updateAgeOnGet: true,
      updateAgeOnHas: false,
    },
  };

  private getCache(category: CacheCategory): LRUCache<string, any> {
    if (!this.caches.has(category)) {
      const config = this.configs[category];
      const cache = new LRUCache<string, any>({
        ...config,
        sizeCalculation: (value: any, key: string) => 1,
      });
      this.caches.set(category, cache);
      this.stats.set(category, { hits: 0, misses: 0 });
    }
    return this.caches.get(category)!;
  }

  private getStats(category: CacheCategory): CacheStats {
    if (!this.stats.has(category)) {
      this.stats.set(category, { hits: 0, misses: 0 });
    }
    return this.stats.get(category)!;
  }

  set(category: CacheCategory, key: string, value: any): void {
    this.getCache(category).set(key, value);
  }

  get(category: CacheCategory, key: string): any {
    const cache = this.getCache(category);
    const stats = this.getStats(category);

    const value = cache.get(key);

    if (value !== undefined) {
      stats.hits++;
    } else {
      stats.misses++;
    }

    return value;
  }

  has(category: CacheCategory, key: string): boolean {
    return this.getCache(category).has(key);
  }

  delete(category: CacheCategory, key: string): boolean {
    return this.getCache(category).delete(key);
  }

  clear(category?: CacheCategory): void {
    if (category) {
      this.getCache(category).clear();
      this.stats.set(category, { hits: 0, misses: 0 });
    } else {
      this.caches.forEach((cache) => cache.clear());
      this.stats.forEach((_, category) => {
        this.stats.set(category, { hits: 0, misses: 0 });
      });
    }
  }

  getCacheStats(category: CacheCategory) {
    const cache = this.getCache(category);
    const stats = this.getStats(category);
    const totalRequests = stats.hits + stats.misses;

    return {
      size: cache.size,
      max: cache.max,
      calculatedSize: cache.calculatedSize,
      hits: stats.hits,
      misses: stats.misses,
      totalRequests,
      hitRate: totalRequests > 0 ? stats.hits / totalRequests : 0,
    };
  }

  getAllStats() {
    const allStats: Record<string, any> = {};
    Object.keys(this.configs).forEach((category) => {
      allStats[category] = this.getCacheStats(category as CacheCategory);
    });
    return allStats;
  }

  getEffectiveness(category: CacheCategory) {
    const stats = this.getCacheStats(category);
    return {
      hitRate: stats.hitRate,
      totalRequests: stats.totalRequests,
      estimatedApiCallsSaved: stats.hits,
      cacheEfficiency: stats.totalRequests > 100 ? "reliable" : "warming-up",
    };
  }
}

const cache = new CategoryCacheManager();
export default cache;
