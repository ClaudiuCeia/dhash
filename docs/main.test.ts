import { assertEquals, assertMatch, assertStringIncludes } from "@std/assert";
import { createConcurrencyLimiter, createHandler } from "./main.tsx";

const url = (path: string) => `https://demo.test${path}`;
const jsonBody = (response: Response) =>
  response.json() as Promise<
    Record<string, unknown>
  >;

Deno.test("demo serves local assets with a restrictive CSP", async () => {
  const handler = createHandler();
  const page = await handler(new Request(url("/")));
  const html = await page.text();

  assertEquals(page.status, 200);
  assertStringIncludes(
    page.headers.get("content-security-policy") ?? "",
    "default-src 'none'",
  );
  assertStringIncludes(html, 'href="/styles.css"');
  assertStringIncludes(
    html,
    '<meta name="dhash-deployment" content="development"',
  );
  assertEquals(html.includes("cdn.tailwindcss.com"), false);

  const client = await handler(new Request(url("/client.js")));
  assertStringIncludes(
    client.headers.get("content-type") ?? "",
    "application/javascript",
  );
  const styles = await handler(new Request(url("/styles.css")));
  assertStringIncludes(styles.headers.get("content-type") ?? "", "text/css");
  assertMatch(await styles.text(), /\.rounded-3xl/);
});

Deno.test("demo hashes bounded request bodies", async () => {
  let calls = 0;
  const handler = createHandler({
    maxBytes: 4,
    hash: (bytes) => {
      calls++;
      assertEquals(bytes, new Uint8Array([1, 2, 3]));
      return Promise.resolve("0123456789abcdef");
    },
  });
  const response = await handler(
    new Request(url("/hash"), {
      method: "POST",
      body: new Uint8Array([1, 2, 3]),
    }),
  );

  assertEquals(response.status, 200);
  assertEquals(await jsonBody(response), { hash: "0123456789abcdef" });
  assertEquals(calls, 1);
});

Deno.test("demo rejects empty and oversized request bodies", async () => {
  let calls = 0;
  const handler = createHandler({
    maxBytes: 4,
    hash: () => {
      calls++;
      return Promise.resolve("0123456789abcdef");
    },
  });

  const empty = await handler(new Request(url("/hash"), { method: "POST" }));
  assertEquals(empty.status, 400);

  const declared = await handler(
    new Request(url("/hash"), {
      method: "POST",
      headers: { "content-length": "5" },
      body: new Uint8Array([1]),
    }),
  );
  assertEquals(declared.status, 413);

  const streamed = await handler(
    new Request(url("/hash"), {
      method: "POST",
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]));
          controller.enqueue(new Uint8Array([4, 5]));
          controller.close();
        },
      }),
    }),
  );
  assertEquals(streamed.status, 413);
  assertEquals(calls, 0);
});

Deno.test("demo sanitizes image errors", async () => {
  const handler = createHandler({
    hash: () => Promise.reject(new Error("secret internal path")),
    onError: () => {},
  });
  const response = await handler(
    new Request(url("/hash"), {
      method: "POST",
      body: new Uint8Array([1]),
    }),
  );
  const body = await jsonBody(response);

  assertEquals(response.status, 422);
  assertEquals(body, { error: "Invalid or unsupported image." });
  assertEquals(JSON.stringify(body).includes("secret internal path"), false);
});

Deno.test("demo rejects work above its concurrency limit", async () => {
  let finishHash!: () => void;
  const pendingHash = new Promise<string>((resolve) => {
    finishHash = () => resolve("0123456789abcdef");
  });
  const handler = createHandler({
    limiter: createConcurrencyLimiter(1),
    hash: () => pendingHash,
  });

  const first = handler(
    new Request(url("/hash"), {
      method: "POST",
      body: new Uint8Array([1]),
    }),
  );
  await Promise.resolve();
  const busy = await handler(
    new Request(url("/hash"), {
      method: "POST",
      body: new Uint8Array([2]),
    }),
  );
  assertEquals(busy.status, 503);
  assertEquals(busy.headers.get("retry-after"), "1");

  finishHash();
  assertEquals((await first).status, 200);
  const available = await handler(
    new Request(url("/hash"), {
      method: "POST",
      body: new Uint8Array([3]),
    }),
  );
  assertEquals(available.status, 200);
});

Deno.test("demo times out stalled uploads and releases their slot", async () => {
  let cancelled = false;
  const handler = createHandler({
    limiter: createConcurrencyLimiter(1),
    maxBodyReadMs: 10,
    hash: () => Promise.resolve("0123456789abcdef"),
  });
  const stalled = await handler(
    new Request(url("/hash"), {
      method: "POST",
      body: new ReadableStream<Uint8Array>({
        pull() {
          return new Promise(() => {});
        },
        cancel() {
          cancelled = true;
        },
      }),
    }),
  );

  assertEquals(stalled.status, 408);
  assertEquals(await jsonBody(stalled), { error: "Request body timed out." });
  assertEquals(cancelled, true);

  const available = await handler(
    new Request(url("/hash"), {
      method: "POST",
      body: new Uint8Array([1]),
    }),
  );
  assertEquals(available.status, 200);
});

Deno.test("demo has no multipart hash endpoint", async () => {
  const response = await createHandler()(
    new Request(url("/api/hash"), {
      method: "POST",
    }),
  );
  assertEquals(response.status, 404);
});
