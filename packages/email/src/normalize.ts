import { createHash } from "node:crypto";
import type {
  ExtractedEmailMetadata,
  NormalizedEmailMessage,
  RawEmailMessage,
} from "./types";

const MAX_TEXT_CHARS = 20_000;
const MAX_LINKS = 12;
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "for",
  "from",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "our",
  "the",
  "to",
  "we",
  "with",
  "you",
  "your",
]);

export function sha256Hex(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function stripHtml(value: string) {
  return normalizeWhitespace(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/gi, '"'),
  );
}

export function extractEmailAddress(value: string) {
  const match = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0].toLowerCase() ?? null;
}

export function domainFromEmail(email: string | null) {
  return (
    email
      ?.split("@")[1]
      ?.replace(/^www\./, "")
      .toLowerCase() ?? null
  );
}

export function tokenize(value: string) {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^\w\s.-]/g, " ")
        .split(/\s+/)
        .map((token) => token.replace(/^[.-]+|[.-]+$/g, ""))
        .filter((token) => token.length >= 3 && !STOP_WORDS.has(token)),
    ),
  );
}

function extractLinks(value: string) {
  const matches = value.match(/https?:\/\/[^\s<>"')]+/gi) ?? [];
  return Array.from(new Set(matches)).slice(0, MAX_LINKS);
}

function domainsFromLinks(links: string[]) {
  return Array.from(
    new Set(
      links.flatMap((link) => {
        try {
          return [new URL(link).hostname.replace(/^www\./, "").toLowerCase()];
        } catch {
          return [];
        }
      }),
    ),
  );
}

export function normalizeEmailMessage(
  message: RawEmailMessage,
): NormalizedEmailMessage {
  const fromEmail = extractEmailAddress(message.from);
  const textSource = message.text?.trim() || stripHtml(message.html ?? "");
  return {
    provider: message.provider,
    providerMessageId: message.providerMessageId,
    threadId: message.threadId ?? null,
    fromEmail,
    fromDomain: domainFromEmail(fromEmail),
    subject: message.subject ? normalizeWhitespace(message.subject) : null,
    receivedAt: message.receivedAt,
    text: normalizeWhitespace(textSource).slice(0, MAX_TEXT_CHARS),
  };
}

export function extractEmailMetadata(
  message: NormalizedEmailMessage,
): ExtractedEmailMetadata {
  const links = extractLinks(message.text);
  const domains = domainsFromLinks(links);
  return {
    provider: message.provider,
    providerMessageId: message.providerMessageId,
    threadId: message.threadId,
    fromEmail: message.fromEmail,
    fromDomain: message.fromDomain,
    subject: message.subject,
    subjectHash: sha256Hex(message.subject ?? ""),
    receivedAt: message.receivedAt,
    subjectTokens: tokenize(message.subject ?? ""),
    bodyTokens: tokenize(message.text),
    links,
    domains,
  };
}
