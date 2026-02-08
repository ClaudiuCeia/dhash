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
        <style
          // deno-lint-ignore react-no-danger
          dangerouslySetInnerHTML={{
            __html: CSS,
          }}
        />
      </head>
      <body>
        <main class="wrap">
          <section class="card">
            <header class="head">
              <div>
                <h1>dHash demo</h1>
                <p class="muted">
                  Upload up to <b>{MAX_FILES}</b> images (max <b>10MB</b>{" "}
                  each), compute perceptual hashes, then sort by similarity
                  (Hamming distance) to a reference image you choose by
                  clicking.
                </p>
              </div>
              <nav class="links">
                <a
                  href="https://github.com/ClaudiuCeia/dhash"
                  target="_blank"
                  rel="noreferrer"
                  class="iconLink"
                  aria-label="GitHub repository"
                >
                  <span class="icon" aria-hidden="true">{GitHubMark}</span>
                </a>
                <a
                  href="https://jsr.io/@claudiu-ceia/dhash"
                  target="_blank"
                  rel="noreferrer"
                  class="iconLink"
                  aria-label="JSR package"
                >
                  <span class="icon" aria-hidden="true">{JSRMark}</span>
                </a>
              </nav>
            </header>

            <div class="controls">
              <input
                id="files"
                type="file"
                accept="image/*"
                multiple
              />
              <button id="clear" type="button" class="ghost" disabled>
                Clear
              </button>
              <span id="status" class="muted" aria-live="polite" />
            </div>

            <details class="about">
              <summary>How it works</summary>
              <div class="about-body">
                <p>
                  dHash converts an image to grayscale, resizes it to{" "}
                  <code>9x8</code>, then compares each pixel to its neighbor on
                  the right to produce <code>64</code>{" "}
                  bits (a 16-char hex string). Similar images tend to have small
                  Hamming distance between their hashes.
                </p>
                <p class="muted">
                  This demo computes hashes on the server using{" "}
                  <code>@claudiu-ceia/dhash</code>{" "}
                  and keeps everything in memory (no persistence).
                </p>
              </div>
            </details>

            <div id="errors" class="errors" />

            <div class="legend muted">
              Hashes compute automatically after you select files. Click any
              computed card to set it as the reference image. Cards are sorted
              by increasing distance.
            </div>

            <div id="grid" class="grid" />
          </section>
        </main>

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
:root {
  color-scheme: light;
  --bg0: #f5f7ff;
  --bg1: #f7fff4;
  --ink: #0b1020;
  --muted: #5a6175;
  --card: rgba(255, 255, 255, 0.78);
  --stroke: rgba(10, 16, 32, 0.12);
  --stroke2: rgba(10, 16, 32, 0.08);
  --shadow: 0 10px 30px rgba(11, 16, 32, 0.08);
  --accent: #00dc82;
}
body {
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto,
    Helvetica, Arial, sans-serif;
  margin: 0;
  color: var(--ink);
  background: radial-gradient(900px 600px at 15% 10%, var(--bg1), transparent
        60%),
    radial-gradient(900px 600px at 85% 0%, var(--bg0), transparent 60%),
    linear-gradient(180deg, #ffffff, #fbfbff);
}
.wrap {
  padding: 34px 18px;
  display: grid;
  place-items: start center;
}
.card {
  width: min(1140px, calc(100vw - 36px));
  border: 1px solid var(--stroke);
  border-radius: 18px;
  padding: 18px;
  background: var(--card);
  backdrop-filter: blur(12px);
  box-shadow: var(--shadow);
}
.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
h1 {
  margin: 0 0 6px 0;
  font-size: 24px;
  letter-spacing: -0.02em;
}
p {
  margin: 8px 0;
  line-height: 1.45;
}
.muted {
  color: var(--muted);
  font-size: 12px;
}
.links {
  display: flex;
  gap: 10px;
  align-items: center;
}
.iconLink {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid var(--stroke);
  background: rgba(255, 255, 255, 0.6);
  box-shadow: 0 6px 14px rgba(11, 16, 32, 0.06);
  text-decoration: none;
}
.iconLink:hover {
  transform: translateY(-1px);
  border-color: rgba(10, 16, 32, 0.18);
}
.icon {
  width: 18px;
  height: 18px;
  display: inline-block;
  color: var(--ink);
}
.controls {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 12px;
}
input[type="file"] {
  max-width: 520px;
}
input[type="file"]::file-selector-button {
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid var(--stroke);
  background: rgba(255, 255, 255, 0.75);
  cursor: pointer;
  margin-right: 10px;
  box-shadow: 0 6px 14px rgba(11, 16, 32, 0.06);
}
input[type="file"]::file-selector-button:hover {
  transform: translateY(-1px);
  border-color: rgba(10, 16, 32, 0.18);
}
button {
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid var(--stroke);
  background: rgba(255, 255, 255, 0.7);
  cursor: pointer;
}
button:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(10, 16, 32, 0.18);
}
button.ghost {
  background: transparent;
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.errors {
  margin-top: 10px;
}
.errors .err {
  background: #fff3f3;
  border: 1px solid #ffd2d2;
  color: #7a0000;
  padding: 10px;
  border-radius: 10px;
  font-size: 12px;
}
.about {
  margin-top: 12px;
}
.about summary {
  cursor: pointer;
  user-select: none;
}
.about-body {
  margin-top: 8px;
}
code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    "Liberation Mono", "Courier New", monospace;
  font-size: 0.95em;
}
.legend {
  margin-top: 12px;
}
.grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}
.item {
  border: 1px solid var(--stroke2);
  border-radius: 16px;
  padding: 12px;
  cursor: pointer;
  display: grid;
  gap: 10px;
  background: rgba(255, 255, 255, 0.65);
  box-shadow: 0 8px 18px rgba(11, 16, 32, 0.05);
}
.item:hover {
  border-color: rgba(10, 16, 32, 0.18);
}
.item.anchor {
  border-color: rgba(0, 220, 130, 0.85);
  box-shadow: 0 12px 30px rgba(0, 220, 130, 0.18);
}
.item.pending {
  opacity: 0.55;
  cursor: default;
}
.row {
  display: grid;
  grid-template-columns: 96px 96px 1fr;
  align-items: start;
  gap: 10px;
}
.thumb {
  width: 96px;
  height: 96px;
  object-fit: cover;
  border-radius: 14px;
  border: 1px solid var(--stroke2);
  background: rgba(10, 16, 32, 0.04);
}
.hashCanvas {
  width: 96px;
  height: 96px;
  border-radius: 14px;
  border: 1px solid var(--stroke2);
  background: rgba(10, 16, 32, 0.04);
}
.meta {
  flex: 1;
  min-width: 0;
}
.name {
  font-size: 13px;
  font-weight: 700;
  color: #111;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kv {
  display: grid;
  grid-template-columns: 84px 1fr;
  gap: 6px 8px;
  margin-top: 6px;
  font-size: 12px;
}
.k {
  color: #6b7280;
}
.v {
  color: #111;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    "Liberation Mono", "Courier New", monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.badge {
  display: inline-block;
  font-size: 11px;
  border: 1px solid rgba(0, 220, 130, 0.9);
  color: #0b3d27;
  border-radius: 999px;
  padding: 2px 8px;
  margin-top: 8px;
  background: rgba(0, 220, 130, 0.16);
}
`;

const JS = `
const MAX_FILES = ${MAX_FILES};
const MAX_BYTES = ${MAX_BYTES};
const CONCURRENCY = 3;

const filesEl = document.getElementById("files");
const clearEl = document.getElementById("clear");
const statusEl = document.getElementById("status");
const gridEl = document.getElementById("grid");
const errorsEl = document.getElementById("errors");

/** @type {{file: File, url: string, name: string, size: number, type: string, hash?: string, distance?: number, err?: string, inFlight?: boolean}[]} */
let items = [];
let anchor = 0;
let runId = 0;
/** @type {AbortController[]} */
let controllers = [];

function setStatus(s) { statusEl.textContent = s; }
function setError(msg) {
  errorsEl.innerHTML = msg ? '<div class="err">' + escapeHtml(msg) + '</div>' : '';
}
function escapeHtml(s) {
  const m = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(s).replace(/[&<>"']/g, (c) => m[c]);
}

function cancelInFlight() {
  for (const c of controllers) c.abort();
  controllers = [];
}

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
    div.className = "item" +
      (idx === anchor ? " anchor" : "") +
      (pending ? " pending" : "");

    if (!pending) {
      div.addEventListener("click", () => {
        anchor = idx;
        recomputeDistances();
        render();
      });
    }

    const row = document.createElement("div");
    row.className = "row";

    const img = document.createElement("img");
    img.className = "thumb";
    img.src = it.url;
    img.alt = it.name;

    const canvas = document.createElement("canvas");
    canvas.className = "hashCanvas";
    canvas.width = 96;
    canvas.height = 96;
    if (it.hash) drawHash(canvas, it.hash);

    row.appendChild(img);
    row.appendChild(canvas);

    const meta = document.createElement("div");
    meta.className = "meta";

    const name = document.createElement("div");
    name.className = "name";
    name.textContent = it.name;
    meta.appendChild(name);

    const kv = document.createElement("div");
    kv.className = "kv";

    kv.innerHTML =
      '<div class="k">hash</div><div class="v">' + escapeHtml(it.hash || (it.err ? "error" : (it.inFlight ? "computing..." : "-"))) + '</div>' +
      '<div class="k">diff</div><div class="v">' + escapeHtml(String(Number.isFinite(it.distance) ? it.distance : "-")) + '</div>';

    meta.appendChild(kv);

    if (idx === anchor) {
      const badge = document.createElement("div");
      badge.className = "badge";
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
