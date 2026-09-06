import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const packageName = "@claudiu-ceia/dhash";
const npm = Deno.build.os === "windows" ? "npm.cmd" : "npm";
const npx = Deno.build.os === "windows" ? "npx.cmd" : "npx";
const fixtureDirectory = fileURLToPath(new URL("../tests", import.meta.url));
const expectedPackage = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
);
const args = [...Deno.args];
const archiveArgument = args.indexOf("--archive");
let suppliedArchive: string | undefined;

if (archiveArgument !== -1) {
  const value = args[archiveArgument + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error("--archive requires a path.");
  }
  suppliedArchive = resolve(value);
  args.splice(archiveArgument, 2);
}

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
const archive = suppliedArchive ?? `${directory}/dhash.tgz`;

try {
  if (suppliedArchive === undefined) {
    await run(
      Deno.execPath(),
      [
        "run",
        "-A",
        fileURLToPath(new URL("./pack_npm.ts", import.meta.url)),
        archive,
      ],
      Deno.cwd(),
    );
  }

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
    `import { type DHashOptions, dhash, toAscii } from "${packageName}";
const options: DHashOptions = {
  invert: true,
  maxInputBytes: false,
  limitInputPixels: 1_000_000,
};
const hash: Promise<string> = dhash(new Uint8Array(), options);
const ascii: string = toAscii("0", [".", "#"]);
void hash;
void ascii;
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

  await run("bun", ["add", archive], directory);
  const runtimeEnvironment = { DHASH_FIXTURES: fixtureDirectory };
  await run("bun", ["integration.mjs"], directory, runtimeEnvironment);
  await Deno.remove(`${directory}/node_modules`, { recursive: true });
  await Deno.remove(`${directory}/bun.lock`);

  await run(npm, ["install", "--no-audit", "--no-fund", archive], directory);
  const installedPackage = JSON.parse(
    await Deno.readTextFile(
      `${directory}/node_modules/@claudiu-ceia/dhash/package.json`,
    ),
  );
  if (
    installedPackage.version !== expectedPackage.version ||
    installedPackage.description !== expectedPackage.description ||
    installedPackage.dependencies?.sharp !==
      expectedPackage.dependencies.sharp ||
    installedPackage.engines?.bun !== expectedPackage.engines.bun ||
    installedPackage.engines?.node !== expectedPackage.engines.node ||
    installedPackage.repository?.url !==
      "git+https://github.com/ClaudiuCeia/dhash.git" ||
    !installedPackage.keywords?.includes("perceptual-hash")
  ) {
    throw new Error("Packed npm metadata is incomplete.");
  }
  await run(npm, ["audit", "--omit=dev", "--audit-level=high"], directory);
  await run(
    npx,
    ["--yes", "--package=typescript@7.0.2", "tsc", "--project", "."],
    directory,
  );

  const versions = args.length > 0 ? args : [null];
  for (const version of versions) {
    const command = version === null ? "node" : npx;
    const args = version === null
      ? ["integration.mjs"]
      : ["--yes", `--package=node@${version}`, "node", "integration.mjs"];
    await run(command, args, directory, runtimeEnvironment);
  }

  console.log(`Verified ${packageName} from a packed npm tarball.`);
} finally {
  await Deno.remove(directory, { recursive: true });
}
