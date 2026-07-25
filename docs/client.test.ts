import { assertEquals, assertStringIncludes } from "@std/assert";
import { Window } from "happy-dom";

const waitFor = async (condition: () => boolean): Promise<void> => {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  throw new Error("Timed out waiting for client state.");
};

Deno.test("client preserves card focus and ignores cancelled runs", async () => {
  const window = new Window({ url: "https://demo.test/" });
  window.document.body.innerHTML = `
    <input id="files" type="file" multiple>
    <button id="pick"></button>
    <button id="clear"></button>
    <span id="status"></span>
    <div id="grid"></div>
    <div id="errors"></div>
    <span id="fileLabel"></span>
  `;

  const originalDocument = globalThis.document;
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  const canvasContext = {
    clearRect() {},
    createImageData: () => ({ data: new Uint8ClampedArray(8 * 8 * 4) }),
    drawImage() {},
    imageSmoothingEnabled: false,
    putImageData() {},
  };
  Object.defineProperty(window.HTMLCanvasElement.prototype, "getContext", {
    value: () => canvasContext,
  });

  type PendingRequest = {
    resolve: (response: Response) => void;
  };
  const pending: PendingRequest[] = [];
  const aborted: number[] = [];
  const revoked: string[] = [];

  try {
    URL.createObjectURL = (blob) => `blob:${(blob as File).name}`;
    URL.revokeObjectURL = (url) => revoked.push(url);
    Object.assign(globalThis, {
      document: window.document,
      window,
      fetch: (_input: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((resolve, reject) => {
          const index = pending.length;
          init?.signal?.addEventListener("abort", () => {
            aborted.push(index);
            reject(new DOMException("Aborted", "AbortError"));
          }, { once: true });
          pending.push({ resolve });
        }),
    });
    await import(`./client.js?test=${crypto.randomUUID()}`);

    const files = window.document.getElementById("files");
    if (!(files instanceof window.HTMLInputElement)) {
      throw new Error("Expected the file input.");
    }
    const first = new window.File([new Uint8Array([1])], "first.png", {
      type: "image/png",
    });
    const firstSelection = new window.DataTransfer();
    firstSelection.items.add(first);
    files.files = firstSelection.files as never;
    files.dispatchEvent(new window.Event("change") as never);
    await waitFor(() => pending.length === 1);

    const second = new window.File([new Uint8Array([2])], "second.png", {
      type: "image/png",
    });
    const secondSelection = new window.DataTransfer();
    secondSelection.items.add(second);
    files.files = secondSelection.files as never;
    files.dispatchEvent(new window.Event("change") as never);
    await waitFor(() => pending.length === 2);
    assertEquals(aborted, [0]);
    assertEquals(revoked, ["blob:first.png"]);

    pending[1].resolve(Response.json({ hash: "0123456789abcdef" }));
    await waitFor(() =>
      window.document.getElementById("status")?.textContent.includes(
        "Computed 1 hashes",
      ) ?? false
    );

    const card = window.document.querySelector("[data-item-index]");
    if (!(card instanceof window.HTMLElement)) {
      throw new Error("Expected a rendered hash card.");
    }
    card.focus();
    card.dispatchEvent(
      new window.KeyboardEvent("keydown", { key: "Enter" }) as never,
    );

    const activeElement = window.document.activeElement;
    if (!(activeElement instanceof window.HTMLElement)) {
      throw new Error("Expected a focused hash card.");
    }
    assertEquals(
      activeElement.dataset.itemIndex,
      "0",
    );
    assertStringIncludes(
      window.document.getElementById("grid")!.textContent,
      "second.png",
    );
    assertEquals(
      window.document.getElementById("grid")!.textContent.includes("first.png"),
      false,
    );

    const failed = new window.File([new Uint8Array([3])], "failed.png", {
      type: "image/png",
    });
    const failedSelection = new window.DataTransfer();
    failedSelection.items.add(failed);
    files.files = failedSelection.files as never;
    files.dispatchEvent(new window.Event("change") as never);
    await waitFor(() => pending.length === 3);
    pending[2].resolve(Response.json({ error: "Invalid image." }, {
      status: 422,
    }));
    await waitFor(() =>
      window.document.getElementById("status")?.textContent.includes(
        "Some files failed",
      ) ?? false
    );
    assertEquals(
      window.document.querySelector('[aria-pressed="true"]'),
      null,
    );
    assertEquals(
      window.document.getElementById("grid")!.textContent.includes("reference"),
      false,
    );
  } finally {
    Object.assign(globalThis, {
      document: originalDocument,
      fetch: originalFetch,
      window: originalWindow,
    });
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    await window.happyDOM.abort();
  }
});
