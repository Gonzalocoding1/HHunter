import { loadEnvFile } from "node:process";
import { buildApi } from "./server.ts";

try {
  loadEnvFile(new URL("../../../.env", import.meta.url));
} catch {
  // Environment variables may already be injected by the runtime.
}

const server = buildApi();

const host = process.env.API_HOST ?? "0.0.0.0";
const port = Number(process.env.API_PORT ?? 3000);

await server.listen({ host, port });
