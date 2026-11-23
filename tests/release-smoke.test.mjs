import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { isApplicationRoute } from "../worker.js";

const root = process.cwd();

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else files.push(fullPath);
  }
  return files;
}

test("homepage exposes essential SEO metadata and app assets", async () => {
  const html = await readFile(join(root, "index.html"), "utf8");
  assert.match(html, /<title>MONK/);
  assert.match(html, /name="description"/);
  assert.match(html, /rel="canonical" href="https:\/\/monk\.monster\//);
  assert.match(html, /rel="manifest" href="\/manifest\.webmanifest"/);
  await readFile(join(root, "public", "favicon.svg"), "utf8");
});

test("web manifest is valid and scoped to the site", async () => {
  const manifest = JSON.parse(await readFile(join(root, "public", "manifest.webmanifest"), "utf8"));
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.display, "standalone");
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0);
});

test("sitemap contains unique canonical public and legal routes", async () => {
  const sitemap = await readFile(join(root, "public", "sitemap.xml"), "utf8");
  const urls = [...sitemap.matchAll(/<loc>(https:\/\/monk\.monster[^<]*)<\/loc>/g)].map(match => match[1]);
  assert.ok(urls.length >= 10, "expected public and legal pages in sitemap");
  assert.equal(new Set(urls).size, urls.length, "sitemap URLs must be unique");
  for (const route of ["/", "/about", "/campus", "/business", "/faq", "/privacy", "/terms", "/security", "/data-rights"]) {
    assert.ok(urls.includes(`https://monk.monster${route === "/" ? "/" : route}`), `missing sitemap route: ${route}`);
  }
});

test("public support and legal navigation remain present", async () => {
  const site = await readFile(join(root, "src", "components", "PublicSite.tsx"), "utf8");
  const legal = await readFile(join(root, "src", "components", "LegalPages.tsx"), "utf8");
  assert.match(site, /admin@monk\.monster/);
  assert.match(site, /monk:open-cookie-settings/);
  assert.match(site, /\/documentation/);
  assert.match(site, /\/updates/);
  assert.match(legal, /Privacy Policy|Privacy policy/);
});

test("browser source contains no privileged Supabase secret key", async () => {
  const files = (await walk(join(root, "src"))).filter(path => /\.(?:ts|tsx|js|jsx)$/.test(path));
  for (const file of files) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, /sb_secret_[A-Za-z0-9_-]{8,}/, `secret key literal found in ${file}`);
    assert.doesNotMatch(source, /(?:SUPABASE_)?SERVICE_ROLE_KEY\s*[:=]/, `service-role key assignment found in ${file}`);
  }
});

test("Cloudflare serves the Vite build through the Worker and real 404 page", async () => {
  const config = await readFile(join(root, "wrangler.jsonc"), "utf8");
  assert.match(config, /"directory"\s*:\s*"\.\/dist"/);
  assert.match(config, /"main"\s*:\s*"\.\/worker\.js"/);
  assert.match(config, /"binding"\s*:\s*"ASSETS"/);
  assert.match(config, /"not_found_handling"\s*:\s*"404-page"/);
  const worker = await readFile(join(root, "worker.js"), "utf8");
  assert.match(worker, /isApplicationRoute/);
  const notFound = await readFile(join(root, "public", "404.html"), "utf8");
  assert.match(notFound, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(notFound, /Back to MONK/);
});

test("robots.txt allows public crawling and points to the canonical sitemap", async () => {
  const robots = await readFile(join(root, "public", "robots.txt"), "utf8");
  assert.match(robots, /User-agent:\s*\*/);
  assert.match(robots, /Allow:\s*\//);
  assert.match(robots, /Sitemap:\s*https:\/\/monk\.monster\/sitemap\.xml/);
  assert.doesNotMatch(robots, /Disallow:\s*\//);
});

test("every sitemap URL is a routable public page", async () => {
  const sitemap = await readFile(join(root, "public", "sitemap.xml"), "utf8");
  const urls = [...sitemap.matchAll(/<loc>(https:\/\/monk\.monster[^<]*)<\/loc>/g)].map(match => new URL(match[1]).pathname);
  for (const path of urls) assert.equal(isApplicationRoute(path), true, "sitemap route is not routed: " + path);
});

test("public route metadata provides distinct titles and descriptions", async () => {
  const source = await readFile(join(root, "src", "components", "PublicSite.tsx"), "utf8");
  assert.match(source, /PUBLIC_PAGE_METADATA/);
  const metadataBlock = source.slice(source.indexOf("const PUBLIC_PAGE_METADATA"), source.indexOf("function updatePublicPageMetadata"));
  const titles = [...metadataBlock.matchAll(/title:\s*"([^"]+)"/g)].map(match => match[1]);
  const descriptions = [...metadataBlock.matchAll(/description:\s*"([^"]+)"/g)].map(match => match[1]);
  assert.ok(titles.length >= 20, "expected route-specific page titles");
  assert.equal(new Set(titles).size, titles.length, "page titles must be unique");
  assert.equal(new Set(descriptions).size, descriptions.length, "page descriptions must be unique");
});

test("social sharing metadata and placeholder image are complete", async () => {
  const html = await readFile(join(root, "index.html"), "utf8");
  assert.match(html, /property="og:image" content="https:\/\/monk\.monster\/brand\/monk-share-placeholder\.svg"/);
  assert.match(html, /property="og:image:width" content="1200"/);
  assert.match(html, /property="og:image:height" content="630"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  const image = await readFile(join(root, "public", "brand", "monk-share-placeholder.svg"), "utf8");
  assert.match(image, /width="1200" height="630"/);
  assert.match(image, /OFFICIAL SHARE IMAGE/);
});

test("every authored image element has an alt attribute", async () => {
  const files = (await walk(join(root, "src"))).filter(path => /\.(?:ts|tsx|js|jsx)$/.test(path));
  for (const file of files) {
    const source = await readFile(file, "utf8");
    for (const match of source.matchAll(/<img\b[^>]*>/g)) {
      assert.match(match[0], /\balt=/, `missing alt text in ${file}: ${match[0]}`);
    }
  }
});
