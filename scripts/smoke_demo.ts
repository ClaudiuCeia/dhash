const baseUrl = Deno.env.get("DEMO_URL")?.replace(/\/$/, "");
if (!baseUrl) throw new Error("DEMO_URL is required.");
const expectedDeployment = Deno.env.get("EXPECTED_DEPLOY_SHA");
if (!expectedDeployment) throw new Error("EXPECTED_DEPLOY_SHA is required.");
const expectedVersion = Deno.env.get("EXPECTED_VERSION");
if (!expectedVersion) throw new Error("EXPECTED_VERSION is required.");
const EXPECTED_FIXTURE_HASH = "0018001a5a0000fc";
const FETCH_TIMEOUT_MS = 10_000;

const fixture = await Deno.readFile(
  new URL("../tests/earthrise.jpg", import.meta.url),
);

async function expectStatus(path: string, status: number): Promise<Response> {
  const response = await fetch(`${baseUrl}${path}`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (response.status !== status) {
    throw new Error(`${path} returned ${response.status}, expected ${status}.`);
  }
  return response;
}

async function smokeTest(): Promise<void> {
  const page = await expectStatus("/", 200);
  const html = await page.text();
  const csp = page.headers.get("content-security-policy") ?? "";
  if (!csp.includes("default-src 'none'")) {
    throw new Error("Demo CSP is missing or incomplete.");
  }
  if (
    !html.includes('href="/styles.css"') || html.includes("cdn.tailwindcss.com")
  ) {
    throw new Error("Demo does not reference only local styles.");
  }
  if (
    !html.includes(
      `<meta name="dhash-deployment" content="${expectedDeployment}"`,
    )
  ) {
    throw new Error("Demo does not match the expected deployment commit.");
  }
  if (!html.includes(`v${expectedVersion}`)) {
    throw new Error("Demo does not use the expected library version.");
  }

  await expectStatus("/client.js", 200);
  await expectStatus("/styles.css", 200);
  await expectStatus("/social-preview.png", 200);

  const hashResponse = await fetch(`${baseUrl}/hash`, {
    method: "POST",
    headers: { "content-type": "application/octet-stream" },
    body: fixture,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const hashBody = await hashResponse.json() as { hash?: unknown };
  if (
    hashResponse.status !== 200 || typeof hashBody.hash !== "string" ||
    hashBody.hash !== EXPECTED_FIXTURE_HASH
  ) {
    throw new Error(
      `Hash endpoint returned an invalid response: ${JSON.stringify(hashBody)}`,
    );
  }

  const empty = await fetch(`${baseUrl}/hash`, {
    method: "POST",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (empty.status !== 400) {
    throw new Error(
      `Empty hash request returned ${empty.status}, expected 400.`,
    );
  }

  const removed = await fetch(`${baseUrl}/api/hash`, {
    method: "POST",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (removed.status !== 404) {
    throw new Error(`/api/hash returned ${removed.status}, expected 404.`);
  }
}

let lastError: unknown;
for (let attempt = 1; attempt <= 20; attempt++) {
  try {
    await smokeTest();
    console.log(`Verified demo deployment at ${baseUrl}.`);
    Deno.exit(0);
  } catch (error) {
    lastError = error;
    if (attempt < 20) {
      await new Promise((resolve) => setTimeout(resolve, 3_000));
    }
  }
}

throw lastError;
