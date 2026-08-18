import { expect, test } from "@playwright/test";

test("manifest exposes install metadata", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBeTruthy();

  const manifest = (await response.json()) as {
    name?: string;
    display?: string;
    start_url?: string;
    icons?: Array<{ src: string; purpose?: string }>;
  };

  expect(manifest.name).toBe("Path of Pain");
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("/applications");
  expect(manifest.icons?.some((icon) => icon.purpose === "maskable")).toBe(
    true,
  );
});

test("service worker keeps private API data out of cache rules", async ({
  request,
}) => {
  const response = await request.get("/sw.js");
  expect(response.ok()).toBeTruthy();
  const body = await response.text();

  expect(body).toContain('url.pathname.startsWith("/api/")');
  const shellUrls = body.match(/const SHELL_URLS = \[([\s\S]*?)\];/)?.[1] ?? "";
  expect(shellUrls).not.toContain("/api/");
});

for (const width of [375, 390]) {
  test(`public mobile shell has no horizontal scroll at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/login");
    await expect(page.getByLabel("Email")).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(
      dimensions.clientWidth + 1,
    );
  });
}
