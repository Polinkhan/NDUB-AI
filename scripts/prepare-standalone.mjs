import { access, cp, mkdir, readdir, rm } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";

const projectRoot = process.cwd();
const nextDirectory = join(projectRoot, ".next");
const standaloneDirectory = join(nextDirectory, "standalone");

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(join(standaloneDirectory, "server.js")))) {
  throw new Error("Next.js did not produce .next/standalone/server.js. Confirm output: 'standalone' is enabled.");
}

await mkdir(join(standaloneDirectory, ".next"), { recursive: true });
await cp(join(nextDirectory, "static"), join(standaloneDirectory, ".next", "static"), {
  recursive: true,
  force: true,
});

const publicDirectory = join(projectRoot, "public");
if (await exists(publicDirectory)) {
  await cp(publicDirectory, join(standaloneDirectory, "public"), { recursive: true, force: true });
}

for (const entry of await readdir(standaloneDirectory, { withFileTypes: true })) {
  if (entry.isFile() && (entry.name === ".env" || entry.name.startsWith(".env."))) {
    await rm(join(standaloneDirectory, entry.name), { force: true });
  }
}

console.log("Standalone server prepared in .next/standalone");
