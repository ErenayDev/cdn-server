export interface ServerHealthResponse {
  status: "healthy" | null;
  timestamp: Date | null;
}

export interface CDNServer {
  id: string;
  url: URL;
  lat: number;
  lng: number;
  city: string;
  country: string;
}
