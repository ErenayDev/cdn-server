export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  apiKeys: new Set(
    process.env.API_KEYS
      ? process.env.API_KEYS.split(",")
      : ["your_very_secret_api_key_with_comma_separated"],
  ),
  uploadDir: process.env.UPLOAD_DIR || "./uploads",
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || "50", 10) * 1024 * 1024,
  allowedTypes: process.env.ALLOWED_TYPES?.split(",") || [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "video/mp4",
    "video/webm",
  ],
  webp: {
    quality: parseInt(process.env.WEBP_QUALITY || "80", 10),
    effort: parseInt(process.env.WEBP_EFFORT || "4", 10),
  },
  redisURL: process.env.REDIS_URL || "redis://localhost:6379",
};
