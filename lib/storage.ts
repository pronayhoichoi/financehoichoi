import { writeFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";

// Kept outside /public deliberately: vendor documents (PAN, GST, bank
// cheques) must never be reachable by a guessed URL. Reads go through
// app/api/files/[...path]/route.ts, which checks the session first.
const STORAGE_ROOT = path.join(process.cwd(), "storage", "uploads");

export async function saveUploadedFile(file: File, subdir: string) {
  const dir = path.join(STORAGE_ROOT, subdir);
  await mkdir(dir, { recursive: true });

  const ext = path.extname(file.name);
  const safeBase = path
    .basename(file.name, ext)
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 60);
  const storedName = `${nanoid(10)}-${safeBase}${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, storedName), buffer);

  return {
    // Relative path within STORAGE_ROOT; resolved by resolveStoragePath below.
    fileUrl: `${subdir}/${storedName}`,
    fileName: file.name,
  };
}

export async function readStoredFile(relativePath: string): Promise<Buffer> {
  return readFile(resolveStoragePath(relativePath));
}

function resolveStoragePath(relativePath: string): string {
  const resolved = path.normalize(path.join(STORAGE_ROOT, relativePath));
  if (!resolved.startsWith(STORAGE_ROOT)) {
    throw new Error("Invalid file path");
  }
  return resolved;
}
