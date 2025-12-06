import { Elysia, t } from "elysia";
import { validateApiKey } from "../middleware/auth";
import { StorageService } from "../services/storage";
import { ImageService } from "../services/image";
import { generateFileName, isImage } from "../utils/file";
import { config } from "../config";
import { redis } from "../";

export const uploadRoutes = new Elysia({ prefix: "/upload" })
  .derive(validateApiKey)
  .post(
    "/",
    async ({ body, set }) => {
      const file = body.file as File;

      if (!file) {
        set.status = 400;
        return { error: "No file provided" };
      }

      if (file.size > config.maxFileSize) {
        set.status = 413;
        return { error: "File too large" };
      }

      const buffer = await file.arrayBuffer();
      let filename: string;
      let processedBuffer: Buffer;
      let finalMimeType: string;

      if (isImage(file.type)) {
        const result = await ImageService.processImage(buffer, file.type);
        processedBuffer = result.processedBuffer;
        finalMimeType = result.outputMimeType;
        filename = generateFileName(file.name, result.shouldRename);
      } else {
        processedBuffer = Buffer.from(buffer);
        finalMimeType = file.type;
        filename = generateFileName(file.name);
      }

      await StorageService.saveFile(filename, processedBuffer);

      const stats = await StorageService.getFileStats(filename);
      redis
        .cacheAsset(filename, processedBuffer, finalMimeType, stats)
        .catch(console.error);

      return {
        success: true,
        filename,
        url: `/cdn/${filename}`,
        originalSize: file.size,
        processedSize: processedBuffer.length,
        originalType: file.type,
        processedType: finalMimeType,
        compressed: file.size > processedBuffer.length,
      };
    },
    {
      body: t.Object({
        file: t.File(),
      }),
    },
  )

  .delete("/:filename", async ({ params, set }) => {
    const { filename } = params;

    if (!(await StorageService.fileExists(filename))) {
      set.status = 404;
      return { error: "File not found" };
    }

    await StorageService.deleteFile(filename);

    await redis.invalidate(filename);

    return { success: true, message: "File deleted" };
  });
