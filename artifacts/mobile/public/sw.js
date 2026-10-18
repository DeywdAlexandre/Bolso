/* Service worker do Prisma (PWA).
 *
 * - Navegação (HTML): rede primeiro, com cópia offline. Assim cada deploy novo é
 *   carregado na hora, e sem internet o app ainda abre.
 * - Arquivos com hash (/_expo/static, /assets): cache primeiro, são imutáveis.
 * - Demais arquivos do mesmo domínio (ícones, manifest): usa o cache e atualiza em segundo plano.
 * - Requisições para outros domínios (ex.: OpenRouter) nunca passam pelo cache.
 *
 * Este arquivo não precisa mudar a cada deploy. Para invalidar tudo à força, aumente VERSION.
 */
const VERSION = "v1";
const SHELL_CACHE = `prisma-shell-${VERSION}`;
const ASSET_CACHE = `prisma-assets-${VERSION}`;
const SHELL_URLS = ["/manifest.json", "/favicon.png", "/icon-192.png", "/icon-512.png"];
const NAVIGATION_TIMEOUT_MS = 4000;

const isHashedAsset = (pathname) =>
  pathname.startsWith("/_expo/static/") || pathname.startsWith("/assets/");

/** URLs dos bundles (js/css) referenciados por um HTML exportado pelo Expo. */
function bundleUrls(html) {
  const urls = new Set();
  for (const m of html.matchAll(/(?:src|href)="(\/_expo\/static\/[^"]+)"/g)) urls.add(m[1]);
  return [...urls].sort();
}

async function cacheBundles(urls) {
  const assets = await caches.open(ASSET_CACHE);
  await Promise.all(urls.map((u) => assets.add(u).catch(() => {})));
}

async function pruneBundles(keepUrls) {
  const assets = await caches.open(ASSET_CACHE);
  const keep = new Set(keepUrls);
  for (const req of await assets.keys()) {
    const { pathname } = new URL(req.url);
    if (pathname.startsWith("/_expo/static/") && !keep.has(pathname)) await assets.delete(req);
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const shell = await caches.open(SHELL_CACHE);
      try {
        const res = await fetch("/", { cache: "reload" });
        if (res.ok) {
          const html = await res.clone().text();
          await shell.put("/", res);
          await cacheBundles(bundleUrls(html));
        }
      } catch {
        // sem rede na instalação: o cache é montado na próxima visita
      }
      await Promise.all(SHELL_URLS.map((u) => shell.add(u).catch(() => {})));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, ASSET_CACHE]);
      for (const name of await caches.keys()) {
        if (name.startsWith("prisma-") && !keep.has(name)) await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Verificação de versão feita pelo app (lib/pwa.ts): sempre direto na rede.
  if (url.searchParams.has("__v")) return;

  if (req.mode === "navigate") {
    event.respondWith(handleNavigation(event, req));
  } else if (isHashedAsset(url.pathname)) {
    event.respondWith(cacheFirst(req));
  } else {
    event.respondWith(staleWhileRevalidate(req));
  }
});

async function handleNavigation(event, req) {
  const shell = await caches.open(SHELL_CACHE);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), NAVIGATION_TIMEOUT_MS);
    const res = await fetch(new Request(req, { cache: "no-cache" }), { signal: controller.signal });
    clearTimeout(timer);

    const isHtml = (res.headers.get("content-type") || "").includes("text/html");
    if (res.ok && isHtml) {
      event.waitUntil(refreshShell(shell, res.clone()));
      return res;
    }
  } catch {
    // offline ou rede lenta: cai para a cópia guardada
  }
  return (await shell.match("/")) || Response.error();
}

async function refreshShell(shell, res) {
  const html = await res.clone().text();
  const urls = bundleUrls(html);
  const previous = await shell.match("/");
  const previousUrls = previous ? bundleUrls(await previous.text()) : [];
  if (urls.join("|") === previousUrls.join("|")) return;

  await cacheBundles(urls);
  await shell.put("/", res);
  await pruneBundles(urls);
}

async function cacheFirst(req) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res.ok) await cache.put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(req);
  const network = fetch(req)
    .then(async (res) => {
      if (res.ok) await cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);
  return cached || (await network) || Response.error();
}
