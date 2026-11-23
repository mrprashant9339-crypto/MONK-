import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

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

test("Cloudflare serves the Vite build with SPA route fallback", async () => {
  const config = await readFile(join(root, "wrangler.jsonc"), "utf8");
  assert.match(config, /"directory"\s*:\s*"\.\/dist"/);
  assert.match(config, /"not_found_handling"\s*:\s*"single-page-application"/);
});

test("Phase 6 business migrations define tenant-scoped commerce and finance workflows", async () => {
  const foundation = await readFile(join(root, "supabase", "migrations", "20261123033736_phase_6_business_operations.sql"), "utf8");
  const fulfilment = await readFile(join(root, "supabase", "migrations", "20261123033825_phase_6_order_fulfilment_and_billing_controls.sql"), "utf8");
  for (const table of ["business_branches","business_departments","business_deals","business_activities","business_products","business_warehouses","business_inventory_movements","business_orders","business_order_items","business_invoices","business_invoice_items","business_payments","business_finance_accounts","business_journal_entries","business_journal_lines"]) {
    assert.match(foundation, new RegExp("create table if not exists public\\." + table));
  }
  assert.match(foundation, /enable row level security/);
  assert.match(foundation, /revoke all on public\.%I from anon/);
  assert.match(foundation, /security_invoker=true/);
  assert.match(foundation, /business_create_order/);
  assert.match(foundation, /business_record_payment/);
  assert.match(foundation, /business_create_journal_entry/);
  assert.match(fulfilment, /business_fulfill_order/);
  assert.match(fulfilment, /business_cancel_order/);
  assert.match(fulfilment, /business_void_invoice/);
  assert.match(fulfilment, /for update/);
});

test("Phase 6 business UI includes all operational views and reduced-motion support", async () => {
  const component = await readFile(join(root, "src", "components", "BusinessOperationsLive.tsx"), "utf8");
  const styles = await readFile(join(root, "src", "business-operations-live.css"), "utf8");
  for (const view of ["Command","Organization","Deals","Activities","Products","Inventory","Orders","Invoices","Finance","Reports"]) {
    assert.match(component, new RegExp('name:"' + view + '"'));
  }
  assert.match(component, /business_fulfill_order/);
  assert.match(component, /business_record_payment/);
  assert.match(component, /business_create_journal_entry/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /bol-art-deals/);
  assert.match(styles, /bol-art-finance/);
});
