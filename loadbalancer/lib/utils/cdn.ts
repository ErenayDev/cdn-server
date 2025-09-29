import servers from "../../servers";
import { CDNServer } from "../../types/server";
import { GeoLocation } from "../../types/geoip";
import geoipCache from "./cache";
import geoip from "geoip-lite";

class GeoDistanceCDN {
  private cdnServers: CDNServer[] = servers;

  // Haversine formülü: https://en.wikipedia.org/wiki/Haversine_formula
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  findClosestCDN(clientLat: number, clientLng: number): CDNServer {
    let closestCDN = this.cdnServers[0];
    let minDistance = this.calculateDistance(
      clientLat,
      clientLng,
      closestCDN.lat,
      closestCDN.lng,
    );

    for (let i = 1; i < this.cdnServers.length; i++) {
      const cdn = this.cdnServers[i];
      const distance = this.calculateDistance(
        clientLat,
        clientLng,
        cdn.lat,
        cdn.lng,
      );

      if (distance < minDistance) {
        minDistance = distance;
        closestCDN = cdn;
      }
    }

    return closestCDN;
  }
}

class GeoIPService {
  private geoDistanceCDN = new GeoDistanceCDN();

  private getClientIP(headers: Record<string, string>): string {
    const forwarded = headers["X-Forwarded-For"];
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }

    const cfIP = headers["CF-Connecting-IP"];
    if (cfIP) {
      return cfIP;
    }

    return "127.0.0.1";
  }

  private isLocalhost(ip: string): boolean {
    return (
      ip === "127.0.0.1" ||
      ip === "::1" ||
      ip.startsWith("192.168.") ||
      ip.startsWith("10.") ||
      ip.startsWith("172.")
    );
  }

  private getLocalhostLocation(): GeoLocation {
    return {
      lat: 41.0082,
      lng: 28.9784,
      country: "TR",
      city: "Istanbul",
    };
  }

  private async getLocationFromIP(ip: string): Promise<GeoLocation> {
    if (this.isLocalhost(ip)) {
      return this.getLocalhostLocation();
    }

    let location = await geoipCache.get("geoip", ip);
    if (location) {
      return location;
    }

    const geo = geoip.lookup(ip);
    if (!geo) {
      return this.getLocalhostLocation();
    }

    location = {
      lat: geo.ll[0],
      lng: geo.ll[1],
      country: geo.country,
      city: geo.city || "Unknown",
    };

    geoipCache.set("geoip", ip, location);
    return location;
  }

  async findClosestCDN(headers: Record<string, string>): Promise<CDNServer> {
    const ip = this.getClientIP(headers);
    const location = await this.getLocationFromIP(ip);
    return this.geoDistanceCDN.findClosestCDN(location.lat, location.lng);
  }
}

const geoIPService = new GeoIPService();
export default geoIPService;
