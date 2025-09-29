export type CacheCategory = "assets" | "serverHealth" | "geoip";

export interface CacheConfig {
  max: number;
  maxSize: number;
  ttl: number;
  updateAgeOnGet: boolean;
  updateAgeOnHas: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
}
