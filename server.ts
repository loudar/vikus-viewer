import { serve, file } from "bun";
import { dirname, join, extname } from "path";
import { existsSync } from "fs";

// Use import.meta.dir in dev (bun run); use exe directory in compiled binary
const ROOT =
  import.meta.dir && existsSync(join(import.meta.dir, "index.html"))
    ? import.meta.dir
    : dirname(process.execPath);

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/octet-stream",
};

function findFile(basePath: string): string | null {
  if (existsSync(basePath)) return basePath;
  // Try normalized forms for Unicode robustness
  const nfc = basePath.normalize("NFC");
  if (nfc !== basePath && existsSync(nfc)) return nfc;
  const nfd = basePath.normalize("NFD");
  if (nfd !== basePath && existsSync(nfd)) return nfd;
  // Fallback: replace last hyphen with underscore (naming convention mismatch)
  const lastHyphen = basePath.lastIndexOf("-");
  if (lastHyphen > 0) {
    const alt = basePath.substring(0, lastHyphen) + "_" + basePath.substring(lastHyphen + 1);
    if (existsSync(alt)) return alt;
  }
  // Fallback: try with _1 suffix before extension (for items where imagenum should be >1
  // but CSV wasn't updated, e.g. Postkarten-724 → Postkarten-724_1.jpg)
  const extIdx = basePath.lastIndexOf(".");
  if (extIdx > 0) {
    const withPage = basePath.substring(0, extIdx) + "_1" + basePath.substring(extIdx);
    if (existsSync(withPage)) return withPage;
  }
  return null;
}

serve({
  port: parseInt(process.env.PORT || "5501", 10),
  async fetch(req) {
    let path = decodeURIComponent(new URL(req.url).pathname);
    if (path === "/") path = "/index.html";

    const filePath = join(ROOT, path);
    const ext = extname(filePath).toLowerCase();
    const mime = MIME[ext] ?? "application/octet-stream";

    const resolved = findFile(filePath);
    if (!resolved) return new Response("Not Found", { status: 404 });

    return new Response(file(resolved).stream(), {
      headers: { "Content-Type": mime },
    });
  },
});

console.log(`vikus-viewer running at http://localhost:${process.env.PORT || 5501}`);
