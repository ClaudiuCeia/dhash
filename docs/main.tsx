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

function Page() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>dHash demo</title>
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
                >
                  GitHub
                </a>
                <a
                  href="https://jsr.io/@claudiu-ceia/dhash"
                  target="_blank"
                  rel="noreferrer"
                >
                  JSR
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
              <button id="compute" type="button" disabled>
                Compute hashes
              </button>
              <button id="clear" type="button" class="ghost" disabled>
                Clear
              </button>
              <span id="status" class="muted" />
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
              Click any card to set it as the reference image. Cards are sorted
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
:root { color-scheme: light; }
body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin: 0; }
.wrap { padding: 28px; display: grid; place-items: start center; }
.card { width: min(1120px, calc(100vw - 56px)); border: 1px solid #ddd; border-radius: 14px; padding: 18px; background: #fff; }
.head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
h1 { margin: 0 0 6px 0; font-size: 22px; letter-spacing: -0.01em; }
p { margin: 8px 0; line-height: 1.45; }
.muted { color: #555; font-size: 12px; }
.links { display: flex; gap: 12px; align-items: center; }
.links a { color: #111; text-decoration: none; border-bottom: 1px dotted #bbb; }
.links a:hover { border-bottom-style: solid; }
.controls { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 12px; }
input[type=file] { max-width: 460px; }
button { padding: 8px 12px; border-radius: 10px; border: 1px solid #bbb; background: #f7f7f7; cursor: pointer; }
button.ghost { background: transparent; }
button:disabled { opacity: 0.6; cursor: not-allowed; }
.errors { margin-top: 10px; }
.errors .err { background: #fff3f3; border: 1px solid #ffd2d2; color: #7a0000; padding: 10px; border-radius: 10px; font-size: 12px; }
.about { margin-top: 12px; }
.about summary { cursor: pointer; user-select: none; }
.about-body { margin-top: 8px; }
code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 0.95em; }
.legend { margin-top: 12px; }
.grid { margin-top: 12px; display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
.item { border: 1px solid #e1e1e1; border-radius: 12px; padding: 10px; cursor: pointer; display: grid; gap: 10px; }
.item:hover { border-color: #bbb; }
.item.anchor { border-color: #111; }
.row { display: flex; align-items: flex-start; gap: 10px; }
.thumb { width: 96px; height: 96px; object-fit: cover; border-radius: 10px; border: 1px solid #ddd; background: #f3f3f3; }
.hashCanvas { width: 96px; height: 96px; border-radius: 10px; border: 1px solid #ddd; background: #f3f3f3; }
.meta { flex: 1; min-width: 0; }
.name { font-size: 13px; font-weight: 600; color: #111; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kv { display: grid; grid-template-columns: 84px 1fr; gap: 6px 8px; margin-top: 6px; font-size: 12px; }
.k { color: #666; }
.v { color: #111; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.badge { display: inline-block; font-size: 11px; border: 1px solid #111; border-radius: 999px; padding: 2px 8px; margin-top: 6px; }
`;

const JS = `
const MAX_FILES = ${MAX_FILES};
const MAX_BYTES = ${MAX_BYTES};

const filesEl = document.getElementById("files");
const computeEl = document.getElementById("compute");
const clearEl = document.getElementById("clear");
const statusEl = document.getElementById("status");
const gridEl = document.getElementById("grid");
const errorsEl = document.getElementById("errors");

/** @type {{file: File, url: string, name: string, size: number, type: string, hash?: string, distance?: number}[]} */
let items = [];
let anchor = 0;

function setStatus(s) { statusEl.textContent = s; }
function setError(msg) {
  errorsEl.innerHTML = msg ? '<div class="err">' + escapeHtml(msg) + '</div>' : '';
}
function escapeHtml(s) {
  return String(s).replace(/[&<>\"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]));
}

filesEl.addEventListener("change", () => {
  setError("");
  setStatus("");
  gridEl.innerHTML = "";
  anchor = 0;

  // Revoke old URLs
  for (const it of items) URL.revokeObjectURL(it.url);
  items = [];

  const list = Array.from(filesEl.files || []);
  if (list.length === 0) {
    computeEl.disabled = true;
    clearEl.disabled = true;
    return;
  }

  if (list.length > MAX_FILES) {
    setError('Too many files. Max is ' + MAX_FILES + '.');
    computeEl.disabled = true;
    clearEl.disabled = false;
    return;
  }

  for (const f of list) {
    if (f.size > MAX_BYTES) {
      setError('File too large: ' + f.name + ' (max 10MB).');
      computeEl.disabled = true;
      clearEl.disabled = false;
      return;
    }
    items.push({ file: f, url: URL.createObjectURL(f), name: f.name, size: f.size, type: f.type });
  }

  computeEl.disabled = false;
  clearEl.disabled = false;
  render();
});

clearEl.addEventListener("click", () => {
  filesEl.value = "";
  for (const it of items) URL.revokeObjectURL(it.url);
  items = [];
  anchor = 0;
  gridEl.innerHTML = "";
  setStatus("");
  setError("");
  computeEl.disabled = true;
  clearEl.disabled = true;
});

computeEl.addEventListener("click", async () => {
  setError("");
  setStatus("Uploading...");
  computeEl.disabled = true;

  try {
    const fd = new FormData();
    for (const it of items) fd.append("images", it.file, it.name);

    const res = await fetch("/api/hash", { method: "POST", body: fd });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && data.error) ? data.error : ('HTTP ' + res.status));
    if (!data || !Array.isArray(data.items)) throw new Error("Bad response from server.");

    for (let i = 0; i < items.length; i++) {
      items[i].hash = data.items[i] && data.items[i].hash;
    }

    setStatus("Computed " + items.length + " hashes. Click a card to set reference.");
    recomputeDistances();
    render();
  } catch (e) {
    setError(String(e && e.message ? e.message : e));
    setStatus("");
  } finally {
    computeEl.disabled = false;
  }
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
    const da = (a.it.distance ?? Number.POSITIVE_INFINITY);
    const db = (b.it.distance ?? Number.POSITIVE_INFINITY);
    if (da !== db) return da - db;
    return a.idx - b.idx;
  });
  return withIndex;
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
    div.className = "item" + (idx === anchor ? " anchor" : "");

    div.addEventListener("click", () => {
      anchor = idx;
      recomputeDistances();
      render();
    });

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
      '<div class=\"k\">hash</div><div class=\"v\">' + escapeHtml(it.hash || '-') + '</div>' +
      '<div class=\"k\">diff</div><div class=\"v\">' + escapeHtml(String(it.distance ?? '-')) + '</div>';

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
