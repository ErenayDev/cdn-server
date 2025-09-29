import { api } from "encore.dev/api";
import { geoip, cache } from "../lib/utils";
import { Lookup } from "../types/geoip";
import { currentRequest } from "encore.dev";
import { RequestData } from "../types/request";

interface Response {
  ip: string;
  geo: Lookup | null;
}

const IP_REGEX =
  /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;

const isValidIP = (ip: string): boolean => {
  return IP_REGEX.test(ip.trim());
};

const getClientIP = (headers: Record<string, string>): string => {
  const forwarded = headers["X-Forwarded-For"];
  if (forwarded) {
    const ip = forwarded.split(",")[0].trim();
    if (isValidIP(ip)) return ip;
  }

  const cfIP = headers["CF-Connecting-IP"];
  if (cfIP && isValidIP(cfIP)) {
    return cfIP;
  }

  return "127.0.0.1";
};

export const get = api(
  { expose: true, method: "GET", path: "/geoip" },
  async ({ ip }: { ip?: string }): Promise<Response> => {
    const reqData = currentRequest() as RequestData;

    let currentIP: string;
    if (ip && isValidIP(ip)) {
      currentIP = ip;
    } else {
      currentIP = getClientIP(reqData?.headers || {});
    }

    if (cache.has("geoip", currentIP)) {
      return cache.get("geoip", currentIP);
    }

    const geo = geoip(currentIP);
    const response: Response = {
      geo,
      ip: currentIP,
    };

    cache.set("geoip", currentIP, response);
    return response;
  },
);
