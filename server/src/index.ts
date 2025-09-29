import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { config } from "./config";
import { ensureUploadDir } from "./utils/file";
import { uploadRoutes } from "./routes/upload";
import { cdnRoutes } from "./routes/cdn";
import swagger from "@elysiajs/swagger";

await ensureUploadDir();

const app = new Elysia()
  .use(
    cors({
      origin: true,
      methods: ["GET", "POST", "DELETE", "HEAD"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  )
  .use(
    swagger({
      path: "/docs",
      documentation: {
        info: {
          title: "Nothiner CDN Server Documentation",
          version: "1.0.0",
        },
      },
    }),
  )
  .get("/", () => ({
    service: "Nothinger CDN",
    version: "1.0.0",
    status: "running",
  }))
  .get("/health", () => ({ status: "healthy", timestamp: Date.now() }))
  .use(uploadRoutes)
  .use(cdnRoutes)
  .onError(({ code, error, set }) => {
    console.error(`Error ${code}:`, error);

    if (code === "NOT_FOUND") {
      set.status = 404;
      return { error: "Endpoint not found" };
    }

    if (code === "VALIDATION") {
      set.status = 400;
      return { error: "Validation error", details: error.message };
    }

    set.status = 500;
    return { error: "Internal server error" };
  })
  .listen(config.port);

console.log(`Nothinger CDN Server running on http://localhost:${config.port}`);
console.log(`WebP conversion enabled with quality: ${config.webp.quality}`);
