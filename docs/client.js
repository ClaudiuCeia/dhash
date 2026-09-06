// Client-side behavior for the demo page.
// Kept as a real module (not a server-inlined JS string) for maintainability.

const MAX_FILES = 20;
const MAX_BYTES = 10 * 1024 * 1024;
const CONCURRENCY = 2;

const filesEl = document.getElementById("files");
const pickEl = document.getElementById("pick");
const clearEl = document.getElementById("clear");
const statusEl = document.getElementById("status");
const gridEl = document.getElementById("grid");
const errorsEl = document.getElementById("errors");
const fileLabelEl = document.getElementById("fileLabel");
const thresholdEl = document.getElementById("threshold");

/** @type {{file: File, url: string, name: string, size: number, type: string, hash?: string, distance?: number, err?: string, inFlight?: boolean}[]} */
let items = [];
let anchor = 0;
let runId = 0;
/** @type {AbortController[]} */
let controllers = [];

function setStatus(s) {
  statusEl.textContent = s;
}

function escapeHtml(s) {
  const m = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return String(s).replace(/[&<>"']/g, (c) => m[c]);
}

function setError(msg) {
  errorsEl.innerHTML = msg
    ? '<div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 shadow-xs">' +
      escapeHtml(msg) + "</div>"
    : "";
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
    msg = "Too many files selected. Only the first " + MAX_FILES +
      " will be used.";
  }

  let skipped = 0;
  for (const f of list.slice(0, MAX_FILES)) {
    if (f.size > MAX_BYTES) {
      skipped++;
      continue;
    }
    items.push({
      file: f,
      url: URL.createObjectURL(f),
      name: f.name,
      size: f.size,
      type: f.type,
    });
  }

  clearEl.disabled = false;
  fileLabelEl.textContent = items.length + " image(s) selected";
  if (skipped > 0) {
    msg += (msg ? " " : "") + skipped +
      " file(s) were >10 MiB and were skipped.";
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

thresholdEl.addEventListener("input", render);

function popcountBigInt(x) {
  let n = x;
  let c = 0;
  while (n) {
    c += Number(n & 1n);
    n >>= 1n;
  }
  return c;
}

function hammingHex(a, b) {
  if (!a || !b) return NaN;
  const x = BigInt("0x" + a) ^ BigInt("0x" + b);
  return popcountBigInt(x);
}

export function parseThreshold(value) {
  const threshold = Number(value);
  return Number.isInteger(threshold) && threshold >= 0 && threshold <= 64
    ? threshold
    : null;
}

function selectedThreshold() {
  return parseThreshold(thresholdEl.value);
}

function recomputeDistances() {
  const ref = items[anchor] && items[anchor].hash;
  for (let i = 0; i < items.length; i++) {
    items[i].distance = (i === anchor && ref)
      ? 0
      : hammingHex(ref, items[i].hash);
  }
}

function sortByDistance() {
  const withIndex = items.map((it, idx) => ({ it, idx }));
  withIndex.sort((a, b) => {
    const da = (Number.isFinite(a.it.distance))
      ? a.it.distance
      : Number.POSITIVE_INFINITY;
    const db = (Number.isFinite(b.it.distance))
      ? b.it.distance
      : Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    return a.idx - b.idx;
  });
  return withIndex;
}

async function computeOne(it) {
  const c = new AbortController();
  controllers.push(c);

  try {
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
    if (!data || typeof data.hash !== "string") {
      throw new Error("Bad response from server.");
    }
    return data.hash;
  } finally {
    controllers = controllers.filter((controller) => controller !== c);
  }
}

async function computeAll(localRun) {
  const total = items.length;
  if (total === 0) return;

  setStatus("Computing hashes...");

  let next = 0;
  const workerCount = Math.min(CONCURRENCY, total);

  async function worker() {
    while (true) {
      const i = next++;
      if (i >= total) return;
      if (localRun !== runId) return;

      const it = items[i];
      if (it.hash || it.err) continue;

      it.inFlight = true;
      render();

      try {
        it.hash = await computeOne(it);
      } catch (e) {
        if (e && typeof e === "object" && e.name === "AbortError") return;
        it.err = String(e && e.message ? e.message : e);
      } finally {
        it.inFlight = false;
        if (localRun === runId) {
          const computed = items.filter((x) => !!x.hash).length;
          if (!items[anchor] || !items[anchor].hash) {
            const firstSuccessful = items.findIndex((item) => !!item.hash);
            if (firstSuccessful !== -1) anchor = firstSuccessful;
          }
          setStatus(
            "Computed " + computed + " / " + items.length + " hashes...",
          );
          recomputeDistances();
          render();
        }
      }
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  if (localRun !== runId) return;
  const computed = items.filter((x) => !!x.hash).length;
  if (computed === items.length) {
    setStatus(
      "Computed " + computed + " hashes. Click a card to set reference.",
    );
  } else {
    setStatus("Computed " + computed + " hashes. Some files failed.");
  }
}

function drawHash(canvas, hash) {
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
  const threshold = selectedThreshold();
  const focusedIndex = document.activeElement?.closest?.("[data-item-index]")
    ?.dataset.itemIndex;
  gridEl.innerHTML = "";

  for (const { it, idx } of sorted) {
    const div = document.createElement("div");
    const pending = !it.hash;
    const isAnchor = idx === anchor && !!it.hash;
    const base =
      "group relative rounded-2xl border bg-white/80 p-4 shadow-xs backdrop-blur-sm transition-shadow";
    const active = pending
      ? " opacity-50 cursor-not-allowed border-slate-200"
      : " cursor-pointer border-slate-200 hover:shadow-md focus:outline-hidden focus:ring-2 focus:ring-emerald-300";
    const anchored = isAnchor
      ? " ring-2 ring-emerald-300 border-emerald-200 shadow-[0_18px_45px_rgba(16,185,129,0.18)]"
      : "";
    div.className = base + active + anchored;
    div.setAttribute("role", "button");
    div.setAttribute("aria-disabled", String(pending));
    div.setAttribute("aria-pressed", String(isAnchor));
    div.setAttribute("aria-label", "Use " + it.name + " as reference image");
    div.dataset.itemIndex = String(idx);
    div.tabIndex = pending ? -1 : 0;

    if (!pending) {
      const selectReference = () => {
        anchor = idx;
        recomputeDistances();
        render();
      };
      div.addEventListener("click", selectReference);
      div.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectReference();
        }
      });
    }

    const row = document.createElement("div");
    row.className = "flex items-start gap-3";

    const img = document.createElement("img");
    img.className =
      "h-24 w-24 shrink-0 rounded-xl border border-slate-300 bg-slate-100 object-cover shadow-inner";
    img.src = it.url;
    img.alt = it.name;

    const canvas = document.createElement("canvas");
    canvas.className =
      "h-24 w-24 shrink-0 rounded-xl border border-slate-300 bg-slate-100 shadow-inner";
    canvas.width = 96;
    canvas.height = 96;
    canvas.setAttribute("aria-hidden", "true");
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
      escapeHtml(
        it.hash || (it.err || (it.inFlight ? "computing..." : "-")),
      ) +
      "</div>" +
      '<div class="text-slate-500">diff</div><div class="font-mono text-slate-900">' +
      escapeHtml(String(Number.isFinite(it.distance) ? it.distance : "-")) +
      "</div>";

    meta.appendChild(kv);

    if (isAnchor) {
      const badge = document.createElement("div");
      badge.className =
        "mt-3 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-800";
      badge.textContent = "reference";
      meta.appendChild(badge);
    } else if (
      Number.isFinite(it.distance) &&
      threshold !== null &&
      it.distance <= threshold
    ) {
      const badge = document.createElement("div");
      badge.className =
        "mt-3 inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-2 py-1 text-[11px] font-medium text-cyan-800";
      badge.textContent = "within your threshold";
      meta.appendChild(badge);
    }

    div.appendChild(row);
    div.appendChild(meta);
    gridEl.appendChild(div);
  }

  if (focusedIndex !== undefined) {
    gridEl.querySelector(`[data-item-index="${focusedIndex}"]`)?.focus();
  }
}
