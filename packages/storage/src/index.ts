import { createHash } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import {
  dirname,
  isAbsolute,
  join,
  normalize,
  relative,
  resolve,
} from "node:path";

export type StorageObject = {
  key: string;
  filename: string;
  contentType: string;
  size: number;
};

export type StorageAdapter = {
  put(
    key: string,
    body: Uint8Array,
    metadata: Omit<StorageObject, "key" | "size">,
  ): Promise<StorageObject>;
  get(key: string): Promise<Uint8Array>;
  delete(key: string): Promise<void>;
};

export type StorageDriver = "local" | "s3";

const DEFAULT_STORAGE_PATH = "/data";

function cleanKeySegment(value: string) {
  return sanitizeFilename(value).replace(/\.+$/g, "") || "object";
}

function assertSafeKey(key: string) {
  const normalized = normalize(key);
  if (
    isAbsolute(normalized) ||
    normalized
      .split(/[\\/]/)
      .some((segment) => segment === ".." || segment === "")
  ) {
    throw new Error("Storage key escapes the storage root.");
  }
  return normalized;
}

export function sanitizeFilename(value: string) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/g, "")
    .replace(/^-+|-+$/g, "")
    .trim();
  return normalized.slice(0, 160) || "file";
}

export function storageKey(parts: string[]) {
  return parts.map(cleanKeySegment).join("/");
}

export function sha256Hex(body: Uint8Array) {
  return createHash("sha256").update(body).digest("hex");
}

export function createLocalStorageAdapter(rootPath?: string): StorageAdapter {
  const root = resolve(
    /*turbopackIgnore: true*/
    rootPath ?? process.env.STORAGE_PATH ?? DEFAULT_STORAGE_PATH,
  );

  function pathForKey(key: string) {
    const safeKey = assertSafeKey(key);
    const target = resolve(
      /*turbopackIgnore: true*/
      join(
        /*turbopackIgnore: true*/
        root,
        safeKey,
      ),
    );
    const relativeTarget = relative(root, target);
    if (relativeTarget.startsWith("..") || isAbsolute(relativeTarget)) {
      throw new Error("Storage key escapes the storage root.");
    }
    return target;
  }

  return {
    async put(key, body, metadata) {
      const target = pathForKey(key);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, body);
      return {
        key,
        filename: sanitizeFilename(metadata.filename),
        contentType: metadata.contentType,
        size: body.byteLength,
      };
    },
    async get(key) {
      return new Uint8Array(
        await readFile(
          /*turbopackIgnore: true*/
          pathForKey(key),
        ),
      );
    },
    async delete(key) {
      try {
        await unlink(pathForKey(key));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          throw error;
        }
      }
    },
  };
}

export function getStorage(): StorageAdapter {
  const driver = (process.env.STORAGE_DRIVER ?? "local") as StorageDriver;
  if (driver === "local") {
    return createLocalStorageAdapter();
  }
  throw new Error("S3 storage is not configured yet.");
}
