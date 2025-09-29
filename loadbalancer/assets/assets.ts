import { api } from "encore.dev/api";
import servers from "../servers";
import { cdn, logger, checkHealth } from "../lib/utils";
import { currentRequest } from "encore.dev";
import { RequestData } from "../types/request";

export const get = api.raw(
  {
    expose: true,
    method: "GET",
    path: "/assets/*assetPath",
  },
  async (req, resp) => {
    const startTime = Date.now();

    try {
      const assetPath = req.url?.split("/assets/")[1];
      if (!assetPath) {
        logger(`Invalid asset path: ${req.url} - ${Date.now() - startTime}ms`);
        resp.writeHead(400, { "Content-Type": "text/plain" });
        resp.end("Invalid asset path");
        return;
      }

      logger(`Asset request started: ${assetPath}`);

      const reqData = currentRequest() as RequestData;
      const healthCheckStart = Date.now();

      const [healthResults, closestCDN] = await Promise.all([
        Promise.all(servers.map(checkHealth)),
        cdn.findClosestCDN(reqData?.headers),
      ]);

      logger(`Health check completed - ${Date.now() - healthCheckStart}ms`);

      const healthyServers = servers.filter(
        (_, index) => healthResults[index].ok,
      );

      if (healthyServers.length === 0) {
        logger(`No healthy servers - ${Date.now() - startTime}ms`);
        resp.writeHead(503, {
          "Content-Type": "text/plain",
          "Cache-Control": "no-cache",
        });
        resp.end("Service Unavailable");
        return;
      }

      const fileURL = new URL(`cdn/${assetPath}`, closestCDN.url);
      logger(`Upstream URL: ${fileURL.toString()}`);

      const fetchStart = Date.now();
      const upstreamResponse = await fetch(fileURL.toString(), {
        method: "GET",
        headers: {
          "User-Agent": req.headers["user-agent"] || "LoadBalancer/1.0",
          Accept: req.headers["accept"] || "*/*",
          "Accept-Encoding": req.headers["accept-encoding"] || "gzip, deflate",
        },
        signal: AbortSignal.timeout(30000),
      });

      logger(
        `Upstream fetch - ${Date.now() - fetchStart}ms - status: ${upstreamResponse.status}`,
      );

      if (!upstreamResponse.ok) {
        logger(
          `Upstream error: ${upstreamResponse.status} - ${Date.now() - startTime}ms`,
        );
        resp.writeHead(upstreamResponse.status, {
          "Content-Type": "text/plain",
          "Cache-Control": "no-cache",
        });
        resp.end("Not Found");
        return;
      }

      const contentType =
        upstreamResponse.headers.get("content-type") ||
        "application/octet-stream";
      const contentLength = upstreamResponse.headers.get("content-length");
      const lastModified = upstreamResponse.headers.get("last-modified");
      const etag = upstreamResponse.headers.get("etag");
      const cacheControl =
        upstreamResponse.headers.get("cache-control") ||
        "public, max-age=31536000";

      const responseHeaders: Record<string, string> = {
        "Content-Type": contentType,
        "Cache-Control": cacheControl,
        "X-Served-By":
          `${closestCDN.country}/${closestCDN.city}` || "LoadBalancer",
      };

      if (contentLength) responseHeaders["Content-Length"] = contentLength;
      if (lastModified) responseHeaders["Last-Modified"] = lastModified;
      if (etag) responseHeaders["ETag"] = etag;

      const ifNoneMatch = req.headers["if-none-match"];
      const ifModifiedSince = req.headers["if-modified-since"];

      if (
        (etag && ifNoneMatch === etag) ||
        (lastModified && ifModifiedSince === lastModified)
      ) {
        logger(`304 Not Modified - ${Date.now() - startTime}ms`);
        resp.writeHead(304, responseHeaders);
        resp.end();
        return;
      }

      resp.writeHead(upstreamResponse.status, responseHeaders);
      logger(`Headers sent to client`);

      if (upstreamResponse.body) {
        const reader = upstreamResponse.body.getReader();
        const streamStart = Date.now();
        let bytesStreamed = 0;
        let chunkCount = 0;

        const streamData = () => {
          const processChunk = async () => {
            try {
              const { done, value } = await reader.read();

              if (done) {
                logger(
                  `Stream completed - ${Date.now() - startTime}ms total - ${bytesStreamed} bytes - ${chunkCount} chunks`,
                );
                resp.end();
                return;
              }

              bytesStreamed += value.length;
              chunkCount++;

              const writeSuccess = resp.write(value);

              if (writeSuccess) {
                setImmediate(processChunk);
              } else {
                resp.once("drain", processChunk);
              }
            } catch (error) {
              logger(
                `Stream error: ${(error as Error).message} - ${Date.now() - startTime}ms`,
              );
              resp.destroy();
            }
          };

          processChunk();
        };

        streamData();
      } else {
        logger(`No body to stream - ${Date.now() - startTime}ms`);
        resp.end();
      }
    } catch (error) {
      logger(
        `Asset proxy error: ${(error as Error).message} - ${Date.now() - startTime}ms`,
      );

      if (!resp.headersSent) {
        resp.writeHead(500, {
          "Content-Type": "text/plain",
          "Cache-Control": "no-cache",
        });
      }
      resp.end("Internal Server Error");
    }
  },
);
