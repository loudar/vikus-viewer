import { join, extname } from "path";
import { existsSync } from "fs";

const PORT = Number(process.env.PORT) || 3000;
const SRC_DIR = join(import.meta.dirname, "src");
const NODE_MODULES_DIR = join(import.meta.dirname, "node_modules");

const MIME_TYPES: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".ttf": "font/ttf",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".csv": "text/csv; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
    ".map": "application/json; charset=utf-8",
};

async function serveFile(filePath: string): Promise<Response> {
    const ext = extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
    const file = Bun.file(filePath);
    const exists = await file.exists();
    if (!exists) return new Response("Not Found", { status: 404 });
    return new Response(file, { headers: { "Content-Type": contentType } });
}

const server = Bun.serve({
    port: PORT,
    async fetch(req) {
        const url = new URL(req.url);
        let pathname = decodeURIComponent(url.pathname);

        // Serve npm packages from node_modules
        if (pathname.startsWith("/node_modules/")) {
            const relPath = pathname.slice("/node_modules/".length);
            const filePath = join(NODE_MODULES_DIR, relPath);
            if (existsSync(filePath)) return serveFile(filePath);
            return new Response("Not Found", { status: 404 });
        }

        // Serve static files from src/
        let filePath = join(SRC_DIR, pathname);
        if (pathname === "/" || pathname.endsWith("/")) {
            filePath = join(SRC_DIR, pathname, "index.html");
        }

        if (existsSync(filePath)) return serveFile(filePath);

        return new Response("Not Found", { status: 404 });
    },
});

console.log("VIKUS Viewer running at http://localhost:" + server.port);
