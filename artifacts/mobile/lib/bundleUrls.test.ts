import { describe, expect, it } from "vitest";

import { extractBundleUrls } from "./bundleUrls";

describe("extractBundleUrls", () => {
  it("lista os bundles do export do Expo, sem duplicar e em ordem estável", () => {
    const html = `<link rel="preload" href="/_expo/static/css/app-1.css"><script src="/_expo/static/js/web/entry-abc.js" defer></script>
      <script src="/_expo/static/js/web/entry-abc.js"></script><img src="/favicon.png">`;
    expect(extractBundleUrls(html)).toEqual([
      "/_expo/static/css/app-1.css",
      "/_expo/static/js/web/entry-abc.js",
    ]);
  });

  it("detecta mudança de versão pela troca do hash", () => {
    const a = extractBundleUrls('<script src="/_expo/static/js/web/entry-1.js">').join("|");
    const b = extractBundleUrls('<script src="/_expo/static/js/web/entry-2.js">').join("|");
    expect(a).not.toBe(b);
  });
});
