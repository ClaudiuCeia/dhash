import { fileURLToPath } from "node:url";

const packageName = "@claudiu-ceia/dhash";
const npm = Deno.build.os === "windows" ? "npm.cmd" : "npm";
const npx = Deno.build.os === "windows" ? "npx.cmd" : "npx";
const fixtureDirectory = fileURLToPath(new URL("../tests", import.meta.url));

async function run(
  command: string,
  args: string[],
  cwd: string,
  env?: Record<string, string>,
) {
  const child = new Deno.Command(command, {
    args,
    cwd,
    env,
    stdin: "null",
    stdout: "inherit",
    stderr: "inherit",
  }).spawn();
  const status = await child.status;

  if (!status.success) {
    throw new Error(`${command} exited with code ${status.code}`);
  }
}

const directory = await Deno.makeTempDir({ prefix: "dhash-npm-" });
const archive = `${directory}/dhash.tgz`;

try {
  await run(
    Deno.execPath(),
    ["pack", "--allow-dirty", "--ignore=deno.lock", "--output", archive],
    Deno.cwd(),
  );

  await Deno.writeTextFile(
    `${directory}/package.json`,
    JSON.stringify({ private: true, type: "module" }),
  );
  await Deno.copyFile(
    new URL("./npm_integration.mjs", import.meta.url),
    `${directory}/integration.mjs`,
  );
  await Deno.writeTextFile(
    `${directory}/consumer.ts`,
    `import { type DHashOptions, dhash } from "${packageName}";
const options: DHashOptions = { invert: true };
const hash: Promise<string> = dhash(new Uint8Array(), options);
void hash;
`,
  );
  await Deno.writeTextFile(
    `${directory}/tsconfig.json`,
    JSON.stringify({
      compilerOptions: {
        module: "NodeNext",
        moduleResolution: "NodeNext",
        noEmit: true,
        strict: true,
        target: "ES2022",
      },
      include: ["consumer.ts"],
    }),
  );

  await run(npm, ["install", "--no-audit", "--no-fund", archive], directory);
  await run(npm, ["audit", "--omit=dev", "--audit-level=high"], directory);
  await run(
    npx,
    ["--yes", "--package=typescript@7.0.2", "tsc", "--project", "."],
    directory,
  );

  const versions = Deno.args.length > 0 ? Deno.args : [null];
  for (const version of versions) {
    const command = version === null ? "node" : npx;
    const args = version === null
      ? ["integration.mjs"]
      : ["--yes", `--package=node@${version}`, "node", "integration.mjs"];
    await run(command, args, directory, {
      DHASH_FIXTURES: fixtureDirectory,
    });
  }

  console.log(`Verified ${packageName} from a packed npm tarball.`);
} finally {
  await Deno.remove(directory, { recursive: true });
}
