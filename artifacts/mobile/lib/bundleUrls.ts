/** URLs dos bundles (js/css) referenciados em um HTML exportado pelo Expo, sem duplicar e em ordem estável. */
export function extractBundleUrls(html: string): string[] {
  const urls = new Set<string>();
  for (const m of html.matchAll(/(?:src|href)="(\/_expo\/static\/[^"]+)"/g)) urls.add(m[1]!);
  return [...urls].sort();
}
