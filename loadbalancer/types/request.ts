import { RequestMeta } from "encore.dev";

export type RequestData = RequestMeta & {
  headers: Record<string, string>;
};
