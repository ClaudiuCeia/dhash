import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { publicPackageMetadata } from "./package_metadata.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const developmentPackageJson = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
);
const npm = Deno.build.os === "windows" ? "npm.cmd" : "npm";
const output = resolve(Deno.args[0] ?? "dhash.tgz");
const directory = await Deno.makeTempDir({ prefix: "dhash-pack-" });
const rawArchive = join(directory, "raw.tgz");
const unpacked = join(directory, "unpacked");
const packed = join(directory, "packed");

async function run(command: string, args: string[], cwd: string) {
  const result = await new Deno.Command(command, {
    args,
    cwd,
    stdout: "piped",
    stderr: "piped",
  }).output();

  if (!result.success) {
    const stderr = new TextDecoder().decode(result.stderr).trim();
    throw new Error(`${command} exited with code ${result.code}: ${stderr}`);
  }

  return new TextDecoder().decode(result.stdout).trim();
}

try {
  await Deno.mkdir(unpacked);
  await Deno.mkdir(packed);
  await run(
    Deno.execPath(),
    [
      "pack",
      "--allow-dirty",
      "--ignore=deno.lock",
      "--output",
      rawArchive,
    ],
    root,
  );
  await run("tar", ["-xzf", rawArchive, "-C", unpacked], root);

  const packageDirectory = join(unpacked, "package");
  const packageJsonPath = join(packageDirectory, "package.json");
  const packageJson = JSON.parse(await Deno.readTextFile(packageJsonPath));
  Object.assign(
    packageJson,
    publicPackageMetadata(developmentPackageJson, packageJson),
  );
  delete packageJson.private;
  await Deno.writeTextFile(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2) + "\n",
  );

  const npmOutput = await run(
    npm,
    ["pack", packageDirectory, "--json", "--pack-destination", packed],
    root,
  );
  const [{ filename }] = JSON.parse(npmOutput) as [{ filename: string }];
  await Deno.mkdir(dirname(output), { recursive: true });
  await Deno.copyFile(join(packed, filename), output);
  console.log(`Packed ${output}`);
} finally {
  await Deno.remove(directory, { recursive: true });
}
