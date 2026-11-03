declare module "cloudflare:workers" {
  export const env: { DB?: D1Database };
  export type Fetcher = import("./worker/cloudflare-env").Fetcher;
  export type D1Database = import("./worker/cloudflare-env").D1Database;
}

interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

interface D1Database {
  prepare(query: string): unknown;
}
