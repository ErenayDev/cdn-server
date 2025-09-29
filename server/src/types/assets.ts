export interface AssetCacheStats {
  hits: number;
  misses: number;
}

export interface CachedAsset {
  buffer: string;
  mimeType: string;
  size: number;
  lastModified: string;
  etag: string;
  cachedAt: number;
}
