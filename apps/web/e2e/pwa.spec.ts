import { expect, test } from "@playwright/test";

test("manifest exposes install metadata", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBeTruthy();

  const manifest = (await response.json()) as {
    id?: string;
    name?: string;
    display?: string;
    start_url?: string;
    icons?: Array<{
      src: string;
      sizes?: string;
      type?: string;
      purpose?: string;
    }>;
  };

  expect(manifest.name).toBe("Path of Pain");
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("/applications");
  expect(manifest.id).toBeTruthy();

  const icons = manifest.icons ?? [];
  expect(icons.some((icon) => icon.purpose === "maskable")).toBe(true);
  // Installability and splash screens rely on raster icons at both sizes.
  for (const size of ["192x192", "512x512"]) {
    expect(
      icons.some((icon) => icon.type === "image/png" && icon.sizes === size),
    ).toBe(true);
  }
});

test("iOS home screen icon is a reachable PNG", async ({ request }) => {
  // iOS ignores an SVG apple-touch-icon and screenshots the page instead.
  const response = await request.get("/apple-touch-icon.png");
  expect(response.ok()).toBeTruthy();
  expect(response.headers()["content-type"]).toContain("image/png");
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

  // Navigations render private data, so they must never be written to a cache.
  expect(body).toContain("handleNavigation");
  expect(body).not.toMatch(/cache\.put\(request[\s\S]{0,40}navigate/);
});

test("service worker waits for the page before applying an update", async ({
  request,
}) => {
  const response = await request.get("/sw.js");
  const body = await response.text();

  // skipWaiting only runs on an explicit message from the client, never as
  // part of install, so an update cannot swap the app out mid-edit.
  expect(body).toContain("SKIP_WAITING");
  const installHandler =
    body.match(/addEventListener\("install"[\s\S]*?\n\}\);/)?.[0] ?? "";
  expect(installHandler).not.toBe("");
  expect(installHandler).not.toContain("skipWaiting");
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
