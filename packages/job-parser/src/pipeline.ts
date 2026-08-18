import { normalizeSourceUrl } from "@jobtracker/domain";
import { adapters } from "./adapters";
import { assertPublicHttpUrl, fetchHtml } from "./fetch";
import { parseHtml } from "./html";
import { normalizeExtractedJob } from "./normalize";
import type { ExtractedJob } from "./types";

export const PARSER_VERSION = "2026-08-18.phase3-greenhouse";

async function renderHtmlWithPlaywright(url: URL) {
  const playwright = await import("playwright");
  const browser = await playwright.chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.route("**/*", async (route) => {
      try {
        await assertPublicHttpUrl(new URL(route.request().url()));
        await route.continue();
      } catch {
        await route.abort();
      }
    });
    await page.goto(url.toString(), {
      waitUntil: "networkidle",
      timeout: 12_000,
    });
    return await page.content();
  } finally {
    await browser.close();
  }
}

export async function extractJobFromUrl(value: string): Promise<ExtractedJob> {
  const normalized = normalizeSourceUrl(value);
  if (!normalized) {
    throw new Error("Enter a valid http(s) job URL.");
  }

  const url = new URL(normalized);
  const html = await fetchHtml(url);
  const adapter = adapters.find((candidate) => candidate.matches(url));
  const firstPass = adapter
    ? await adapter.extract({ url, html })
    : parseHtml(html, url);
  const normalizedFirstPass = normalizeExtractedJob(firstPass);
  if (normalizedFirstPass.title && normalizedFirstPass.descriptionText) {
    return {
      ...normalizedFirstPass,
      method: normalizedFirstPass.method ?? adapter?.id ?? "static-html",
      snapshotHtml: html,
      snapshotContentType: "text/html; charset=utf-8",
    };
  }

  try {
    const rendered = await renderHtmlWithPlaywright(url);
    return normalizeExtractedJob({
      ...parseHtml(rendered, url),
      method: "playwright",
      snapshotHtml: rendered,
      snapshotContentType: "text/html; charset=utf-8",
    });
  } catch {
    return {
      ...normalizedFirstPass,
      method: normalizedFirstPass.method ?? adapter?.id ?? "static-html",
      snapshotHtml: html,
      snapshotContentType: "text/html; charset=utf-8",
    };
  }
}
