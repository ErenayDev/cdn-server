export const setCacheHeaders = (
  set: any,
  mimeType: string,
  etag: string,
  lastModified: string,
) => {
  const maxAgeConfig: Record<string, number> = {
    "image/webp": 31536000, // 1 yıl
    "image/jpeg": 2592000, // 30 gün
    "image/png": 2592000, // 30 gün
    "video/mp4": 86400, // 1 gün
    "video/webm": 86400, // 1 gün
    default: 604800, // 1 hafta
  };

  const maxAge = maxAgeConfig[mimeType] ?? maxAgeConfig.default;

  set.headers["Cache-Control"] =
    `public, max-age=${maxAge}, stale-while-revalidate=86400`;
  set.headers["ETag"] = etag;
  set.headers["Last-Modified"] = lastModified;
  set.headers["Expires"] = new Date(Date.now() + maxAge * 1000).toUTCString();
  set.headers["Vary"] = "Accept-Encoding";
};
