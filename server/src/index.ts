const first = performance.now();
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { config } from "./config";
import { ensureUploadDir } from "./utils/file";
import { uploadRoutes } from "./routes/upload";
import { cdnRoutes } from "./routes/cdn";
import cdnCache from "./services/redis";
import swagger from "@elysiajs/swagger";

await ensureUploadDir();

export const redis = new cdnCache(config.redisURL);
const second = performance.now();
console.log(`Redis initialized in ${(second - first).toFixed(2)}ms`);

new Elysia()
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
          title: "CDN Server Documentation",
          version: "1.0.0",
        },
      },
    }),
  )
  .get("/", () => ({
    service: "CDN",
    version: "1.0.0",
    status: "running",
  }))
  .get("/health", async () => {
    const redisHealth = await redis.healthCheck();
    return {
      status: "healthy",
      timestamp: Date.now(),
      redis: redisHealth ? "connected" : "disconnected",
    };
  })
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
  .onStop(() => {
    redis.close();
  })
  .listen(config.port);

const third = performance.now();
console.log(
  `CDN Server running on http://localhost:${config.port}. Started in ${(third - first).toFixed(2)}ms`,
);
