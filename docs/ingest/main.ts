import { dhash } from "dhash_jsr";

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

const INDEX_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>dHash ingest (Deno Deploy)</title>
    <style>
      :root { color-scheme: light; }
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin: 24px; }
      .card { max-width: 760px; border: 1px solid #ddd; border-radius: 12px; padding: 16px; }
      h1 { margin: 0 0 8px 0; font-size: 20px; }
      p { margin: 8px 0; line-height: 1.4; }
      input { margin: 8px 0; }
      button { padding: 8px 12px; border-radius: 10px; border: 1px solid #bbb; background: #f7f7f7; cursor: pointer; }
      button:disabled { opacity: 0.6; cursor: not-allowed; }
      pre { background: #0b1020; color: #e6e6e6; padding: 12px; border-radius: 10px; overflow: auto; }
      .row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
      .muted { color: #555; font-size: 12px; }
      a { color: inherit; }
      code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>dHash ingest endpoint</h1>
      <p class="muted">
        Upload an image, get back the 64-bit dHash computed by <code>@claudiu-ceia/dhash</code>.
        This is a minimal test to see whether <code>sharp</code> works on Deno Deploy.
      </p>

      <div class="row">
        <input id="file" type="file" accept="image/*" />
        <button id="go" disabled>Compute hash</button>
        <span id="status" class="muted"></span>
      </div>

      <p class="muted">
        POST raw bytes to <code>/hash</code> (max 10MB). Example:
        <code>curl -X POST $HOST/hash --data-binary @img.png</code>
      </p>

      <pre id="out">{ "hash": "..." }</pre>
      <p class="muted">
        Repo: <a href="https://github.com/ClaudiuCeia/dhash" target="_blank" rel="noreferrer">github.com/ClaudiuCeia/dhash</a>
        | JSR: <a href="https://jsr.io/@claudiu-ceia/dhash" target="_blank" rel="noreferrer">jsr.io/@claudiu-ceia/dhash</a>
      </p>
    </div>

    <script type="module">
      const fileEl = document.getElementById("file");
      const goEl = document.getElementById("go");
      const outEl = document.getElementById("out");
      const statusEl = document.getElementById("status");

      function setStatus(s) { statusEl.textContent = s; }

      fileEl.addEventListener("change", () => {
        goEl.disabled = !(fileEl.files && fileEl.files.length === 1);
        outEl.textContent = '{ "hash": "..." }';
        setStatus("");
      });

      goEl.addEventListener("click", async () => {
        const f = fileEl.files && fileEl.files[0];
        if (!f) return;
        if (f.size > ${MAX_BYTES}) {
          outEl.textContent = JSON.stringify({ error: "File too large (max 10MB)." }, null, 2);
          return;
        }

        goEl.disabled = true;
        setStatus("Uploading...");
        try {
          const res = await fetch("/hash", {
            method: "POST",
            headers: { "content-type": f.type || "application/octet-stream" },
            body: await f.arrayBuffer(),
          });
          const text = await res.text();
          outEl.textContent = text || String(res.status);
          setStatus(res.ok ? "OK" : ("HTTP " + res.status));
        } catch (e) {
          outEl.textContent = JSON.stringify({ error: String(e) }, null, 2);
          setStatus("Failed");
        } finally {
          goEl.disabled = false;
        }
      });
    </script>
  </body>
</html>
`;

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const path = url.pathname;

  if (req.method === "GET" && path === "/") return html(INDEX_HTML);

  if (req.method === "POST" && path === "/hash") {
    const lenHeader = req.headers.get("content-length");
    if (lenHeader) {
      const len = Number(lenHeader);
      if (Number.isFinite(len) && len > MAX_BYTES) {
        return json({ error: "Payload too large (max 10MB)." }, 413);
      }
    }

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
      return json(
        {
          error: "Failed to compute hash.",
          detail,
          hint:
            "If this is running on Deno Deploy, sharp/npm native addon initialization may not be supported.",
        },
        500,
      );
    }
  }

  return json({ error: "Not found." }, 404);
});
