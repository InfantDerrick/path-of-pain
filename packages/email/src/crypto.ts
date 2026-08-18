import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const VERSION = "v1";
const IV_BYTES = 12;
const TAG_BYTES = 16;

function deriveKey(secret: string) {
  if (secret.length < 32) {
    throw new Error("ENCRYPTION_KEY must be at least 32 characters.");
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptJson(value: unknown, secret: string) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(secret), iv, {
    authTagLength: TAG_BYTES,
  });
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptJson<T>(sealed: string, secret: string): T {
  const [version, ivPart, tagPart, encryptedPart] = sealed.split(".");
  if (version !== VERSION || !ivPart || !tagPart || !encryptedPart) {
    throw new Error("Encrypted payload format is not supported.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    deriveKey(secret),
    Buffer.from(ivPart, "base64url"),
    { authTagLength: TAG_BYTES },
  );
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, "base64url")),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString("utf8")) as T;
}
