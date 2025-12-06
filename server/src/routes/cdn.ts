import { Elysia } from "elysia";
import { StorageService } from "../services/storage";
import { getFilePath, getMimeType } from "../utils/file";
import { setCacheHeaders } from "../middleware/cache";
import { redis } from "../";

export const cdnRoutes = new Elysia({ prefix: "/cdn" })
  .get("/:filename", async ({ params, set, request }) => {
    const { filename } = params;

    const cachedAsset = await redis.getAsset(filename);
    if (cachedAsset) {
      const clientETag = request.headers.get("If-None-Match");
      if (clientETag === cachedAsset.etag) {
        set.status = 304;
        return;
      }

      setCacheHeaders(
        set,
        cachedAsset.mimeType,
        cachedAsset.etag,
        cachedAsset.lastModified,
      );
      set.headers["Content-Type"] = cachedAsset.mimeType;
      set.headers["Content-Length"] = cachedAsset.size.toString();
      set.headers["X-Cache"] = "HIT";

      return cachedAsset.buffer;
    }

    if (!(await StorageService.fileExists(filename))) {
      set.status = 404;
      return { error: "File not found" };
    }

    const filePath = getFilePath(filename);
    const mimeType = getMimeType(filename);
    const stats = await StorageService.getFileStats(filename);
    const file = Bun.file(filePath);
    const buffer = Buffer.from(await file.arrayBuffer());

    redis.cacheAsset(filename, buffer, mimeType, stats).catch(console.error);

    const etag = `"${Buffer.from(filename + stats.mtime).toString("base64")}"`;
    setCacheHeaders(set, mimeType, etag, stats.mtime.toISOString());
    set.headers["Content-Type"] = mimeType;
    set.headers["Content-Length"] = stats.size.toString();
    set.headers["X-Cache"] = "MISS";

    return buffer;
  })

  .head("/:filename", async ({ params, set, request }) => {
    const { filename } = params;

    const cachedAsset = await redis.getAsset(filename);
    if (cachedAsset) {
      const clientETag = request.headers.get("If-None-Match");
      if (clientETag === cachedAsset.etag) {
        set.status = 304;
        return;
      }

      setCacheHeaders(
        set,
        cachedAsset.mimeType,
        cachedAsset.etag,
        cachedAsset.lastModified,
      );
      set.headers["Content-Type"] = cachedAsset.mimeType;
      set.headers["Content-Length"] = cachedAsset.size.toString();
      set.headers["X-Cache"] = "HIT";
      return;
    }

    if (!(await StorageService.fileExists(filename))) {
      set.status = 404;
      return;
    }

    const mimeType = getMimeType(filename);
    const stats = await StorageService.getFileStats(filename);
    const etag = `"${Buffer.from(filename + stats.mtime).toString("base64")}"`;

    setCacheHeaders(set, mimeType, etag, stats.mtime.toISOString());
    set.headers["Content-Type"] = mimeType;
    set.headers["Content-Length"] = stats.size.toString();
    set.headers["X-Cache"] = "MISS";
  });
