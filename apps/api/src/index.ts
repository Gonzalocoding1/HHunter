import Fastify from "fastify";
import { applicationStatuses, reviewStatuses } from "@hunterai/core";

const server = Fastify({ logger: true });

server.get("/health", async () => ({
  ok: true,
  service: "hunterai-api",
  reviewStatuses,
  applicationStatuses
}));

const host = process.env.API_HOST ?? "0.0.0.0";
const port = Number(process.env.API_PORT ?? 3000);

await server.listen({ host, port });
