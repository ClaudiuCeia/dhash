/** @jsxImportSource preact */
import { dhash } from "dhash_jsr";
import { renderToString } from "preact-render-to-string";
import docsConfig from "./deno.json" with { type: "json" };

const MAX_FILES = 20;
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_ACTIVE_HASHES = 4;
let activeHashes = 0;

class PayloadTooLargeError extends Error {}

async function readBodyBounded(
  request: Request,
  maximum: number,
): Promise<Uint8Array> {
  if (request.body === null) return new Uint8Array();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (total + value.byteLength > maximum) {
        await reader.cancel("payload too large").catch(() => {});
        throw new PayloadTooLargeError();
      }

      chunks.push(value);
      total += value.byteLength;
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function declaredLength(request: Request): number | null {
  const value = request.headers.get("content-length");
  if (value === null) return null;
  if (!/^\d+$/.test(value)) return Number.POSITIVE_INFINITY;

  const length = Number(value);
  return Number.isSafeInteger(length) ? length : Number.POSITIVE_INFINITY;
}

const LIB_SPEC =
  (docsConfig as { imports?: Record<string, string> }).imports?.dhash_jsr ??
    "jsr:@claudiu-ceia/dhash";
const LIB_VERSION = (() => {
  // Example: "jsr:@claudiu-ceia/dhash@^0.3.2"
  const m = String(LIB_SPEC).match(/@\^?(\d+\.\d+\.\d+)/);
  return m ? m[1] : "";
})();

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2) + "\n", {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function html(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "content-security-policy":
        "default-src 'none'; script-src 'self'; style-src 'self'; " +
        "img-src 'self' blob:; connect-src 'self'; base-uri 'none'; " +
        "form-action 'none'; frame-ancestors 'none'; object-src 'none'",
      "referrer-policy": "no-referrer",
    },
  });
}

function js(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function css(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/css; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

const CLIENT_JS_PATH = new URL("./client.js", import.meta.url);
const STYLES_PATH = new URL("./styles.css", import.meta.url);
let clientJsCache: string | null = null;
let stylesCache: string | null = null;
async function getClientJs(): Promise<string> {
  if (clientJsCache === null) {
    clientJsCache = await Deno.readTextFile(CLIENT_JS_PATH);
  }
  return clientJsCache;
}

async function getStyles(): Promise<string> {
  if (stylesCache === null) {
    stylesCache = await Deno.readTextFile(STYLES_PATH);
  }
  return stylesCache;
}

const GitHubMark = (
  <svg
    viewBox="0 0 16 16"
    width="16"
    height="16"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
  </svg>
);

const JSRMark = (
  <svg
    viewBox="0 -3 13 13"
    width="18"
    height="18"
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M0,2h2v-2h7v1h4v4h-2v2h-7v-1h-4" fill="#083344" />
    <g fill="#f7df1e">
      <path d="M1,3h1v1h1v-3h1v4h-3" />
      <path d="M5,1h3v1h-2v1h2v3h-3v-1h2v-1h-2" />
      <path d="M9,2h3v2h-1v-1h-1v3h-1" />
    </g>
  </svg>
);

function Page() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>dHash demo</title>
        <meta
          name="description"
          content="Upload up to 20 images, compute perceptual hashes (dHash), then sort by similarity."
        />
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <div class="relative overflow-hidden">
          <div class="pointer-events-none absolute inset-0">
            <div class="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-emerald-200/40 blur-3xl" />
            <div class="absolute -right-24 -top-32 h-[28rem] w-[28rem] rounded-full bg-cyan-200/40 blur-3xl" />
            <div class="absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-200/30 blur-3xl" />
          </div>

          <main class="relative mx-auto w-full max-w-7xl px-4 py-12 sm:py-16">
            <header class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <h1 class="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                    dHash demo
                  </h1>
                </div>
                <p class="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
                  Upload up to{" "}
                  <span class="font-semibold text-slate-900">{MAX_FILES}</span>
                  {" "}
                  images (max{" "}
                  <span class="font-semibold text-slate-900">10MB</span>{" "}
                  each). We compute 64-bit dHashes and sort by similarity
                  (Hamming distance) to a reference image you select by
                  clicking.
                </p>
              </div>
              <nav class="flex shrink-0 items-center gap-2">
                <a
                  href="https://github.com/ClaudiuCeia/dhash"
                  target="_blank"
                  rel="noreferrer"
                  class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/75 text-slate-900 shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  aria-label="GitHub repository"
                  title="GitHub"
                >
                  <span aria-hidden="true">{GitHubMark}</span>
                </a>
                <a
                  href="https://jsr.io/@claudiu-ceia/dhash"
                  target="_blank"
                  rel="noreferrer"
                  class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/75 text-slate-900 shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  aria-label="JSR package"
                  title="JSR"
                >
                  <span aria-hidden="true">{JSRMark}</span>
                </a>
              </nav>
            </header>

            <section class="mt-10 grid gap-6 lg:grid-cols-[1fr_400px]">
              <div class="rounded-3xl border border-slate-200/70 bg-white/60 p-6 shadow-soft backdrop-blur sm:p-7">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div class="min-w-0">
                    <h2 class="text-base font-semibold text-slate-900">
                      Upload images
                    </h2>
                    <p class="mt-1 text-xs text-slate-600">
                      Hashes compute automatically after selection. Pending
                      cards are disabled.
                    </p>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      id="pick"
                      type="button"
                      class="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    >
                      Choose images
                    </button>
                    <button
                      id="clear"
                      type="button"
                      class="inline-flex items-center rounded-xl border border-slate-200 bg-white/75 px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition hover:shadow-md disabled:opacity-60"
                      disabled
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <input
                  id="files"
                  type="file"
                  accept="image/*"
                  multiple
                  class="sr-only"
                />

                <div class="mt-4 flex flex-wrap items-center gap-3">
                  <div class="inline-flex items-center rounded-2xl border border-slate-200 bg-white/75 px-3 py-2 text-xs text-slate-700 shadow-sm">
                    <span class="mr-2 inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    <span id="fileLabel">No files selected</span>
                  </div>
                  <div class="text-xs text-slate-600">
                    <span id="status" aria-live="polite" />
                  </div>
                </div>

                <div id="errors" class="mt-4" />

                <div
                  id="grid"
                  class="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
                />
              </div>

              <aside class="rounded-3xl border border-slate-200/70 bg-white/55 p-6 shadow-soft backdrop-blur sm:p-7">
                <h2 class="text-base font-semibold text-slate-900">
                  How it works
                </h2>
                <p class="mt-2 text-sm leading-relaxed text-slate-600">
                  dHash converts an image to grayscale, resizes it to{" "}
                  <code class="rounded bg-slate-900/5 px-1 py-0.5 font-mono text-[0.85em] text-slate-900">
                    9x8
                  </code>, then compares each pixel to its neighbor on the
                  right. The result is{" "}
                  <span class="font-semibold text-slate-900">64 bits</span>{" "}
                  (a 16-char hex string).
                </p>
                <div class="mt-4 rounded-2xl border border-slate-200 bg-white/65 p-4">
                  <ul class="space-y-2 text-sm text-slate-700">
                    <li class="flex gap-2">
                      <span class="mt-[6px] inline-flex h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                      <span>
                        Similar images tend to have a small{" "}
                        <span class="font-semibold text-slate-900">
                          Hamming distance
                        </span>{" "}
                        between hashes.
                      </span>
                    </li>
                    <li class="flex gap-2">
                      <span class="mt-[6px] inline-flex h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                      <span>
                        Everything stays in memory (no persistence).
                      </span>
                    </li>
                    <li class="flex gap-2">
                      <span class="mt-[6px] inline-flex h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                      <span>
                        Click any computed card to set the reference image and
                        re-sort.
                      </span>
                    </li>
                  </ul>
                </div>
                <p class="mt-4 text-xs text-slate-600">
                  Computed server-side using{" "}
                  <code class="rounded bg-slate-900/5 px-1 py-0.5 font-mono">
                    @claudiu-ceia/dhash
                  </code>{" "}
                  on Deno Deploy.
                </p>
                <div class="mt-4 rounded-2xl border border-slate-200 bg-white/65 p-4 text-xs text-slate-700">
                  <div class="flex items-center justify-between gap-3">
                    <span class="font-medium text-slate-900">
                      Library version
                    </span>
                    <code class="rounded bg-slate-900/5 px-1 py-0.5 font-mono">
                      {LIB_VERSION ? `v${LIB_VERSION}` : "unknown"}
                    </code>
                  </div>
                </div>
              </aside>
            </section>
          </main>
        </div>

        <script type="module" src="/client.js"></script>
      </body>
    </html>
  );
}

const DOCTYPE = "<!doctype html>";

export async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  if (req.method === "GET" && path === "/") {
    return html(DOCTYPE + renderToString(<Page />));
  }

  if (req.method === "GET" && path === "/client.js") {
    return js(await getClientJs());
  }

  if (req.method === "GET" && path === "/styles.css") {
    return css(await getStyles());
  }

  // Compatibility endpoint (single raw upload).
  if (req.method === "POST" && path === "/hash") {
    const contentLength = declaredLength(req);
    if (contentLength === 0) {
      return json({ error: "Empty request body." }, 400);
    }
    if (contentLength !== null && contentLength > MAX_BYTES) {
      return json({ error: "Payload too large (max 10MB)." }, 413);
    }
    if (activeHashes >= MAX_ACTIVE_HASHES) {
      const response = json(
        { error: "Hash service is busy. Retry shortly." },
        503,
      );
      response.headers.set("retry-after", "1");
      return response;
    }

    activeHashes++;
    try {
      const bytes = await readBodyBounded(req, MAX_BYTES);
      if (bytes.byteLength === 0) {
        return json({ error: "Empty request body." }, 400);
      }
      const hash = await dhash(bytes);
      return json({ hash });
    } catch (err) {
      if (err instanceof PayloadTooLargeError) {
        return json({ error: "Payload too large (max 10MB)." }, 413);
      }
      console.error("Image hashing failed", err);
      return json({ error: "Invalid or unsupported image." }, 422);
    } finally {
      activeHashes--;
    }
  }

  return json({ error: "Not found." }, 404);
}
