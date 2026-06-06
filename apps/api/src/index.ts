import { buildApi } from "./server.ts";

const server = buildApi();

const host = process.env.API_HOST ?? "0.0.0.0";
const port = Number(process.env.API_PORT ?? 3000);

await server.listen({ host, port });
