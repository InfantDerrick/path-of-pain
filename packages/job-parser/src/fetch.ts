import { lookup } from "node:dns/promises";
import net from "node:net";

const MAX_BYTES = 1_500_000;
const TIMEOUT_MS = 8_000;
const MAX_REDIRECTS = 3;

function isBlockedIp(address: string) {
  if (net.isIPv4(address)) {
    const [a = 0, b = 0] = address.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      a === 0
    );
  }
  const lower = address.toLowerCase();
  return (
    lower === "::1" ||
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    lower.startsWith("fe80:")
  );
}

export async function assertPublicHttpUrl(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http(s) URLs can be enriched.");
  }
  const records = await lookup(url.hostname, { all: true, verbatim: true });
  if (
    records.length === 0 ||
    records.some((record) => isBlockedIp(record.address))
  ) {
    throw new Error("This URL resolves to a blocked network address.");
  }
}

export async function fetchHtml(url: URL, redirects = 0): Promise<string> {
  await assertPublicHttpUrl(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      redirect: "manual",
      signal: controller.signal,
      headers: { accept: "text/html,application/xhtml+xml" },
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (redirects >= MAX_REDIRECTS) {
        throw new Error("Too many redirects while fetching the job URL.");
      }
      const location = response.headers.get("location");
      if (!location) {
        throw new Error("Redirect response did not include a location.");
      }
      return fetchHtml(new URL(location, url), redirects + 1);
    }

    if (!response.ok) {
      throw new Error(`Job URL returned HTTP ${response.status}.`);
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml")
    ) {
      throw new Error("Job URL did not return HTML.");
    }

    const reader = response.body?.getReader();
    if (!reader) {
      return "";
    }
    const chunks: Uint8Array[] = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      received += value.byteLength;
      if (received > MAX_BYTES) {
        throw new Error("Job page is too large to enrich.");
      }
      chunks.push(value);
    }
    return new TextDecoder().decode(Buffer.concat(chunks));
  } finally {
    clearTimeout(timeout);
  }
}
