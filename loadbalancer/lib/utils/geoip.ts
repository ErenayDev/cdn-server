import geoip from "geoip-lite";
import { Lookup } from "../../types/geoip";
import { logger } from "./";

const geoIPLookup = (ip: string) => {
  logger("Getting GeoIP for IP: %s", ip);
  const geo = geoip.lookup(ip);
  logger("GeoIP for IP %s: %o", ip, geo);

  return geo as Lookup;
};

export default geoIPLookup;
