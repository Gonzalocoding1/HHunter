import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const port = Number(process.env.WEB_PORT ?? 5173);
const apiBaseUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:3000";
const root = new URL(".", import.meta.url).pathname;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

createServer(async (request, response) => {
  try {
    if (!request.url) {
      response.writeHead(400);
      response.end("Bad request");
      return;
    }

    const url = new URL(request.url, `http://${request.headers.host}`);

    if (url.pathname.startsWith("/api/")) {
      const headers = new Headers(request.headers);
      headers.delete("host");
      const hasBody = request.method !== "GET" && request.method !== "HEAD";
      const apiResponse = await fetch(`${apiBaseUrl}${url.pathname.slice(4)}${url.search}`, {
        method: request.method,
        headers,
        body: hasBody ? request : undefined,
        duplex: hasBody ? "half" : undefined
      });
      const body = await apiResponse.arrayBuffer();
      response.writeHead(apiResponse.status, {
        "content-type": apiResponse.headers.get("content-type") ?? "application/json"
      });
      response.end(Buffer.from(body));
      return;
    }

    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = normalize(join(root, pathname));

    if (!filePath.startsWith(root)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    const file = await readFile(filePath);
    response.writeHead(200, {
      "content-type": contentTypes[extname(filePath)] ?? "application/octet-stream"
    });
    response.end(file);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (request.url?.startsWith("/api/")) {
      response.writeHead(502, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "API proxy failed", message }));
      return;
    }

    response.writeHead(404);
    response.end("Not found");
  }
}).listen(port, "0.0.0.0", () => {
  console.log(`HomeHunter web running at http://127.0.0.1:${port}`);
  console.log(`Proxying API requests to ${apiBaseUrl}`);
});
