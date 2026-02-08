/** @jsxImportSource preact */
import { dhash } from "dhash_jsr";
import { renderToString } from "preact-render-to-string";

const MAX_FILES = 20;
const MAX_BYTES = 10 * 1024 * 1024;

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
    },
  });
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
        <script src="https://cdn.tailwindcss.com"></script>
        <script
          // deno-lint-ignore react-no-danger
          dangerouslySetInnerHTML={{
            __html: `
tailwind.config = {
  theme: {
    extend: {
      colors: {
        deno: {
          50: "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
          700: "#0e7490",
          800: "#155e75",
          900: "#164e63"
        }
      },
      boxShadow: {
        soft: "0 12px 30px rgba(15, 23, 42, 0.08)",
        soft2: "0 18px 45px rgba(15, 23, 42, 0.10)"
      }
    }
  }
};`,
          }}
        />
        <style
          // deno-lint-ignore react-no-danger
          dangerouslySetInnerHTML={{
            __html: CSS,
          }}
        />
      </head>
      <body>
        <div class="relative overflow-hidden">
          <div class="pointer-events-none absolute inset-0">
            <div class="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-emerald-200/40 blur-3xl" />
            <div class="absolute -right-24 -top-32 h-[28rem] w-[28rem] rounded-full bg-cyan-200/40 blur-3xl" />
            <div class="absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-200/30 blur-3xl" />
          </div>

          <main class="relative mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
            <header class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <h1 class="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                    dHash demo
                  </h1>
                  <span class="inline-flex items-center rounded-full border border-slate-200 bg-white/60 px-2 py-0.5 text-[11px] font-medium text-slate-600 shadow-sm">
                    perceptual hashing
                  </span>
                </div>
                <p class="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
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
                  class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white/70 text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  aria-label="GitHub repository"
                  title="GitHub"
                >
                  <span aria-hidden="true">{GitHubMark}</span>
                </a>
                <a
                  href="https://jsr.io/@claudiu-ceia/dhash"
                  target="_blank"
                  rel="noreferrer"
                  class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white/70 text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  aria-label="JSR package"
                  title="JSR"
                >
                  <span aria-hidden="true">{JSRMark}</span>
                </a>
              </nav>
            </header>

            <section class="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
              <div class="rounded-3xl border border-slate-200/70 bg-white/60 p-5 shadow-soft backdrop-blur sm:p-6">
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
                      class="inline-flex items-center rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    >
                      Choose images
                    </button>
                    <button
                      id="clear"
                      type="button"
                      class="inline-flex items-center rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
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
                  <div class="inline-flex items-center rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-xs text-slate-700 shadow-sm">
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
                  class="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
                />
              </div>

              <aside class="rounded-3xl border border-slate-200/70 bg-white/55 p-5 shadow-soft backdrop-blur sm:p-6">
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
              </aside>
            </section>
          </main>
        </div>

        <script
          type="module"
          // deno-lint-ignore react-no-danger
          dangerouslySetInnerHTML={{ __html: JS }}
        />
      </body>
    </html>
  );
}

const CSS = `
* { box-sizing: border-box; }
html, body { height: 100%; }
body {
  margin: 0;
  background: #ffffff;
}
`;

const JS = `
const MAX_FILES = ${MAX_FILES};
const MAX_BYTES = ${MAX_BYTES};
const CONCURRENCY = 3;

const filesEl = document.getElementById("files");
const pickEl = document.getElementById("pick");
const clearEl = document.getElementById("clear");
const statusEl = document.getElementById("status");
const gridEl = document.getElementById("grid");
const errorsEl = document.getElementById("errors");
const fileLabelEl = document.getElementById("fileLabel");

/** @type {{file: File, url: string, name: string, size: number, type: string, hash?: string, distance?: number, err?: string, inFlight?: boolean}[]} */
let items = [];
let anchor = 0;
let runId = 0;
/** @type {AbortController[]} */
let controllers = [];

function setStatus(s) { statusEl.textContent = s; }
function setError(msg) {
  errorsEl.innerHTML = msg ? '<div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 shadow-sm">' + escapeHtml(msg) + '</div>' : '';
}
function escapeHtml(s) {
  const m = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(s).replace(/[&<>"']/g, (c) => m[c]);
}

function cancelInFlight() {
  for (const c of controllers) c.abort();
  controllers = [];
}

pickEl.addEventListener("click", () => {
  filesEl.click();
});

filesEl.addEventListener("change", () => {
  setError("");
  setStatus("");
  gridEl.innerHTML = "";
  anchor = 0;
  runId++;
  cancelInFlight();

  // Revoke old URLs
  for (const it of items) URL.revokeObjectURL(it.url);
  items = [];

  const list = Array.from(filesEl.files || []);
  if (list.length === 0) {
    clearEl.disabled = true;
    fileLabelEl.textContent = "No files selected";
    return;
  }

  let msg = "";
  if (list.length > MAX_FILES) {
    msg = "Too many files selected. Only the first " + MAX_FILES + " will be used.";
  }

  let skipped = 0;
  for (const f of list.slice(0, MAX_FILES)) {
    if (f.size > MAX_BYTES) {
      skipped++;
      continue;
    }
    items.push({ file: f, url: URL.createObjectURL(f), name: f.name, size: f.size, type: f.type });
  }

  clearEl.disabled = false;
  fileLabelEl.textContent = items.length + " image(s) selected";
  if (skipped > 0) {
    msg += (msg ? " " : "") + skipped + " file(s) were >10MB and were skipped.";
  }
  if (msg) setError(msg);
  render();
  void computeAll(runId);
});

clearEl.addEventListener("click", () => {
  runId++;
  cancelInFlight();
  filesEl.value = "";
  for (const it of items) URL.revokeObjectURL(it.url);
  items = [];
  anchor = 0;
  gridEl.innerHTML = "";
  setStatus("");
  setError("");
  clearEl.disabled = true;
  fileLabelEl.textContent = "No files selected";
});

function popcountBigInt(x) {
  let n = x;
  let c = 0;
  while (n) { c += Number(n & 1n); n >>= 1n; }
  return c;
}

function hammingHex(a, b) {
  if (!a || !b) return NaN;
  const x = (BigInt("0x" + a) ^ BigInt("0x" + b));
  return popcountBigInt(x);
}

function recomputeDistances() {
  const ref = items[anchor] && items[anchor].hash;
  for (let i = 0; i < items.length; i++) {
    items[i].distance = (i === anchor) ? 0 : hammingHex(ref, items[i].hash);
  }
}

function sortByDistance() {
  const withIndex = items.map((it, idx) => ({ it, idx }));
  withIndex.sort((a, b) => {
    const da = (Number.isFinite(a.it.distance) ? a.it.distance : Number.POSITIVE_INFINITY);
    const db = (Number.isFinite(b.it.distance) ? b.it.distance : Number.POSITIVE_INFINITY);
    if (da !== db) return da - db;
    return a.idx - b.idx;
  });
  return withIndex;
}

async function computeOne(it) {
  const c = new AbortController();
  controllers.push(c);

  const buf = await it.file.arrayBuffer();
  const res = await fetch("/hash", {
    method: "POST",
    headers: { "content-type": "application/octet-stream" },
    body: buf,
    signal: c.signal,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (data && data.error) ? data.error : ("HTTP " + res.status);
    throw new Error(msg);
  }
  if (!data || typeof data.hash !== "string") throw new Error("Bad response from server.");
  return data.hash;
}

async function computeAll(localRun) {
  const total = items.length;
  if (total === 0) return;

  setStatus("Computing hashes...");

  let done = 0;
  let next = 0;

  const workerCount = Math.min(CONCURRENCY, total);
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= total) return;
      if (localRun !== runId) return;

      const it = items[i];
      if (it.hash || it.err) {
        done++;
        continue;
      }

      it.inFlight = true;
      render();

      try {
        it.hash = await computeOne(it);
      } catch (e) {
        if (e && typeof e === "object" && e.name === "AbortError") return;
        it.err = String(e && e.message ? e.message : e);
      } finally {
        it.inFlight = false;
        done++;
        if (localRun !== runId) return;

        const computed = items.filter((x) => !!x.hash).length;
        setStatus("Computed " + computed + " / " + items.length + " hashes...");
        recomputeDistances();
        render();
      }
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  if (localRun !== runId) return;
  const computed = items.filter((x) => !!x.hash).length;
  if (computed === items.length) {
    setStatus("Computed " + computed + " hashes. Click a card to set reference.");
  } else {
    setStatus("Computed " + computed + " hashes. Some files failed.");
  }
}

function drawHash(canvas, hash) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const off = document.createElement("canvas");
  off.width = 8;
  off.height = 8;
  const octx = off.getContext("2d");
  if (!octx) return;

  const bin = BigInt("0x" + (hash || "0")).toString(2).padStart(64, "0");
  const img = octx.createImageData(8, 8);
  for (let i = 0; i < 64; i++) {
    const on = bin[i] === "1";
    const v = on ? 0 : 255;
    const p = i * 4;
    img.data[p + 0] = v;
    img.data[p + 1] = v;
    img.data[p + 2] = v;
    img.data[p + 3] = 255;
  }
  octx.putImageData(img, 0, 0);

  // Pixelize: draw 8x8 -> 96x96 with nearest-neighbor.
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(off, 0, 0, canvas.width, canvas.height);
}

function render() {
  const sorted = sortByDistance();
  gridEl.innerHTML = "";

  for (const { it, idx } of sorted) {
    const div = document.createElement("div");
    const pending = !it.hash;
    const base = "group relative rounded-2xl border bg-white/75 p-4 shadow-sm backdrop-blur transition";
    const active = pending
      ? " opacity-50 cursor-not-allowed border-slate-200"
      : " cursor-pointer border-slate-200 hover:-translate-y-0.5 hover:shadow-md";
    const anchored = (idx === anchor)
      ? " ring-2 ring-emerald-300 border-emerald-200 shadow-[0_18px_45px_rgba(16,185,129,0.18)]"
      : "";
    div.className = base + active + anchored;

    if (!pending) {
      div.addEventListener("click", () => {
        anchor = idx;
        recomputeDistances();
        render();
      });
    }

    const row = document.createElement("div");
    row.className = "flex items-start gap-3";

    const img = document.createElement("img");
    img.className = "h-24 w-24 shrink-0 rounded-xl border border-slate-200 bg-slate-50 object-cover";
    img.src = it.url;
    img.alt = it.name;

    const canvas = document.createElement("canvas");
    canvas.className = "h-24 w-24 shrink-0 rounded-xl border border-slate-200 bg-slate-50";
    canvas.width = 96;
    canvas.height = 96;
    if (it.hash) drawHash(canvas, it.hash);

    row.appendChild(img);
    row.appendChild(canvas);

    const meta = document.createElement("div");
    meta.className = "min-w-0 flex-1";

    const name = document.createElement("div");
    name.className = "truncate text-sm font-semibold text-slate-900";
    name.textContent = it.name;
    meta.appendChild(name);

    const kv = document.createElement("div");
    kv.className = "mt-2 grid grid-cols-[56px_1fr] gap-x-3 gap-y-2 text-xs";

    kv.innerHTML =
      '<div class="text-slate-500">hash</div><div class="font-mono text-slate-900 truncate">' +
      escapeHtml(it.hash || (it.err ? "error" : (it.inFlight ? "computing..." : "-"))) +
      '</div>' +
      '<div class="text-slate-500">diff</div><div class="font-mono text-slate-900">' +
      escapeHtml(String(Number.isFinite(it.distance) ? it.distance : "-")) +
      "</div>";

    meta.appendChild(kv);

    if (idx === anchor) {
      const badge = document.createElement("div");
      badge.className = "mt-3 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-800";
      badge.textContent = "reference";
      meta.appendChild(badge);
    }

    div.appendChild(row);
    div.appendChild(meta);
    gridEl.appendChild(div);
  }
}
`;

const DOCTYPE = "<!doctype html>";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const path = url.pathname;

  if (req.method === "GET" && path === "/") {
    return html(DOCTYPE + renderToString(<Page />));
  }

  // Compatibility endpoint (single raw upload).
  if (req.method === "POST" && path === "/hash") {
    const buf = await req.arrayBuffer();
    if (buf.byteLength === 0) {
      return json({ error: "Empty request body." }, 400);
    }
    if (buf.byteLength > MAX_BYTES) {
      return json({ error: "Payload too large (max 10MB)." }, 413);
    }
    try {
      const hash = await dhash(new Uint8Array(buf));
      return json({ hash });
    } catch (err) {
      const detail = err instanceof Error
        ? (err.stack ?? err.message)
        : String(err);
      return json({ error: "Failed to compute hash.", detail }, 500);
    }
  }

  if (req.method === "POST" && path === "/api/hash") {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return json({ error: "Expected multipart/form-data." }, 400);
    }

    const files = form.getAll("images").filter((v): v is File =>
      v instanceof File
    );
    if (files.length === 0) return json({ error: "No images uploaded." }, 400);
    if (files.length > MAX_FILES) {
      return json({ error: `Too many images. Max is ${MAX_FILES}.` }, 400);
    }

    for (const f of files) {
      if (f.size > MAX_BYTES) {
        return json({ error: `File too large: ${f.name} (max 10MB).` }, 413);
      }
    }

    const out: Array<
      { name: string; type: string; size: number; hash: string }
    > = [];

    try {
      for (const f of files) {
        const bytes = new Uint8Array(await f.arrayBuffer());
        const hash = await dhash(bytes);
        out.push({ name: f.name, type: f.type, size: f.size, hash });
      }
    } catch (err) {
      const detail = err instanceof Error
        ? (err.stack ?? err.message)
        : String(err);
      return json({ error: "Failed to compute hashes.", detail }, 500);
    }

    return json({ items: out });
  }

  return json({ error: "Not found." }, 404);
});
