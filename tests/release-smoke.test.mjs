import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
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

test("thank-you page is private and excluded from the sitemap", async () => {
  const sitemap = await readFile(join(root, "public", "sitemap.xml"), "utf8");
  assert.doesNotMatch(sitemap, /thank-you/);
  const worker = await readFile(join(root, "worker.js"), "utf8");
  assert.ok(worker.includes('"/thank-you"'));
  assert.ok(worker.includes('"/thank-you", "/support/tickets"'));
});

test("server-side support intake enforces honeypot and rate limits", async () => {
  const source = await readFile(join(root, "supabase", "functions", "support-ticket-intake", "index.ts"), "utf8");
  assert.match(source, /clean\(body\.website,\s*200\)/);
  assert.match(source, /validEmail\(email\)/);
  assert.match(source, /p_limit:\s*5/);
  assert.match(source, /message\.length\s*<\s*10/);
  const supportPages = await readFile(join(root, "src", "components", "SupportTrustPages.tsx"), "utf8");
  assert.match(supportPages, /st-honeypot/);
  assert.match(supportPages, /website,captchaToken/);
});

test("GA4 is loaded only after analytics consent and a real measurement ID", async () => {
  const source = await readFile(join(root, "src", "components", "LegalPages.tsx"), "utf8");
  assert.match(source, /G-XXXXXXXXXX/);
  assert.match(source, /if \(!validMeasurementId \|\| !measurementId\) return/);
  assert.match(source, /if \(!analytics\)/);
  assert.match(source, /googletagmanager\.com\/gtag\/js/);
  const privacy = await readFile(join(root, "src", "components", "LegalPages.tsx"), "utf8");
  assert.match(privacy, /no valid Measurement ID is configured/);
  assert.match(privacy, /sessionStorage/);
  assert.match(privacy, /localStorage/);
});

test("thank-you conversions are emitted only for a real submission context and accepted analytics", async () => {
  const support = await readFile(join(root, "src", "components", "SupportTrustPages.tsx"), "utf8");
  const legal = await readFile(join(root, "src", "components", "LegalPages.tsx"), "utf8");
  assert.match(support, /monk:thank-you-conversion/);
  assert.match(support, /monk:thank-you-ready/);
  assert.match(legal, /preferences\.analytics/);
  assert.match(legal, /pending === "signup" \? "sign_up" : "generate_lead"/);
  assert.match(legal, /monk:cookie-preferences-changed/);
});

test("cookie preferences page uses the shared consent record version", async () => {
  const support = await readFile(join(root, "src", "components", "SupportTrustPages.tsx"), "utf8");
  assert.match(support, /version:2/);
  assert.match(support, /monk:cookie-preferences-changed/);
  assert.doesNotMatch(support, /No analytics provider is currently active/);
});

test("FAQ answers are grounded in current published product and policy details", async () => {
  const source = await readFile(join(root, "src", "components", "PublicSite.tsx"), "utf8");
  const faq = source.slice(source.indexOf('faq: { kicker:'), source.indexOf('\n  }[page]'));
  assert.match(faq, /official college portal/);
  assert.match(faq, /not a complete live admission directory/);
  assert.match(faq, /does not offer a paid subscription/);
  assert.match(faq, /email draft/);
  assert.equal((faq.match(/title:/g) || []).length, 9);
});

test("reviews section contains placeholders only and no fabricated customer claims", async () => {
  const source = await readFile(join(root, "src", "components", "PublicSite.tsx"), "utf8");
  const reviews = source.slice(source.indexOf('className="reviews-section"'), source.indexOf('className="closing-cta"', source.indexOf('className="reviews-section"')));
  assert.match(reviews, /No customer reviews are published yet/);
  assert.match(reviews, /REVIEW PLACEHOLDER 01/);
  assert.match(reviews, /REVIEW PLACEHOLDER 02/);
  assert.match(reviews, /REVIEW PLACEHOLDER 03/);
  assert.doesNotMatch(reviews, /five stars|★★★★★|customer name|verified buyer/i);
});

test("built public assets contain no insecure HTTP resource URLs", async () => {
  const dist = join(root, "dist");
  const files = await walk(dist);
  for (const file of files) {
    if (!/\.(?:html|css|js|mjs|json|svg)$/i.test(file)) continue;
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, /(?:src|href)\s*=\s*["']http:\/\/|url\(\s*["']?http:\/\//i, `insecure HTTP resource in ${file}`);
  }
});

test("privacy policy describes current collection rather than hypothetical future services", async () => {
  const source = await readFile(join(root, "src", "components", "LegalPages.tsx"), "utf8");
  const privacy = source.slice(source.indexOf('"/privacy":'), source.indexOf('"/terms":'));
  assert.match(privacy, /support request details/);
  assert.match(privacy, /hashed network identifier/);
  assert.match(privacy, /no valid GA4 Measurement ID is configured/);
  assert.doesNotMatch(privacy, /When paid checkout is introduced|Newsletter email addresses will be processed|If analytics, newsletter or payment services are added/);
});

test("authentication callback exchanges PKCE codes once and preserves onboarding context", async () => {
  const auth = await readFile(join(root, "src", "components", "AuthExperience.tsx"), "utf8");
  const client = await readFile(join(root, "src", "lib", "supabase.ts"), "utf8");
  assert.match(client, /detectSessionInUrl:\s*false/);
  assert.match(auth, /exchangeAuthCodeOnce\(code\)/);
  assert.match(auth, /pendingAuthCodeExchange\?\.code === code/);
  assert.match(auth, /localStorage\.setItem\("monk:oauth-consent"/);
  assert.match(auth, /localStorage\.getItem\("monk:oauth-consent"/);
  assert.match(auth, /institutionOptions\.map/);
  assert.match(auth, /monk_directory_institutions/);
  assert.match(auth, /Switch to MONK Campus/);
  assert.match(auth, /Switch to MONK Business/);
  assert.match(auth, /Enter your full name before continuing with Google/);
  assert.match(auth, /Your Google account was not linked to a completed MONK profile/);
  assert.match(auth, /update_my_profile/);
  assert.match(auth, /Retry security verification/);
  const app = await readFile(join(root, "src", "App.tsx"), "utf8");
  assert.match(app, /canCreateBusinessWorkspace = organizationVertical === "business" && intendedRole === "owner"/);
  const migration = await readFile(join(root, "supabase", "migrations", "20261125041500_harden_organization_self_service_creation.sql"), "utf8");
  assert.match(migration, /current_user_email_verified/);
  assert.match(migration, /Campus workspaces require institution verification/);
  assert.match(migration, /intended_role' is distinct from 'owner'/);
  const profileMigration = await readFile(join(root, "supabase", "migrations", "20261125042000_add_secure_own_profile_completion.sql"), "utf8");
  assert.match(profileMigration, /auth\.uid\(\)/);
  assert.match(profileMigration, /revoke all on function public\.update_my_profile/);
});

test("India directory CSV importer normalizes official AISHE university records without storing source files", async () => {
  const directory = await mkdtemp(join(tmpdir(), "monk-directory-"));
  try {
    const csv = join(directory, "aishe-sample.csv");
    await writeFile(csv, [
      "AISHE Code,Name of Institution,State,District,Year of Establishment,Location",
      'U-0003,"Acharya Nagarjuna University, Guntur",Andhra Pradesh,Guntur,1976,Rural',
      'BAD-1,"Unmapped State College",Unknown State,Unknown,2001,Urban'
    ].join("\n"));
    const run = spawnSync(process.execPath, [
      join(root, "scripts", "import-india-directory.mjs"),
      "--input", csv,
      "--source", "aishe_aikosh_universities",
      "--dry-run"
    ], { cwd: root, encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr);
    const result = JSON.parse(run.stdout);
    assert.equal(result.accepted, 1);
    assert.equal(result.rejectedRows, 1);
    assert.equal(result.preview[0].aishe_code, "U-0003");
    assert.equal(result.preview[0].state_code, "AP");
    assert.equal(result.preview[0].canonical_name, "Acharya Nagarjuna University, Guntur");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("directory ingestion is service-role-only, bounded, idempotent and does not write generated search vectors", async () => {
  const migration = await readFile(join(root, "supabase", "migrations", "20261125050000_compact_directory_import_pipeline.sql"), "utf8");
  assert.match(migration, /jsonb_array_length\(p_records\) > 250/);
  assert.match(migration, /octet_length\(p_records::text\) > 1000000/);
  assert.match(migration, /terms_review_status = 'approved'/);
  assert.match(migration, /on conflict \(source_id, source_record_id, snapshot_hash\) do nothing/);
  assert.match(migration, /grant execute on function public\.ingest_monk_directory_batch\(text,jsonb\) to service_role/);
  assert.doesNotMatch(migration, /search_document\s*=/);
  assert.doesNotMatch(migration, /search_document,\s*primary_source_id/);
});

test("national directory uses live published rows and keeps unlicensed sources disabled", async () => {
  const directory = await readFile(join(root, "src", "components", "InstitutionDirectory.tsx"), "utf8");
  assert.match(directory, /\.eq\("published", true\)/);
  assert.match(directory, /Official directory records are being prepared/);
  assert.match(directory, /Course recognition and intake are checked separately/);
  const importer = await readFile(join(root, "supabase", "functions", "directory-import", "index.ts"), "utf8");
  assert.match(importer, /platform_role/);
  assert.match(importer, /action === "sync_aicte"/);
  assert.match(importer, /AICTE bulk import is disabled until its data-reuse terms are approved/);
  const policy = await readFile(join(root, "supabase", "migrations", "20261125050400_directory_source_reuse_and_status_policy.sql"), "utf8");
  assert.match(policy, /aishe_aikosh_universities/);
  assert.match(policy, /import_enabled = false/);
  assert.match(policy, /ogd_aishe_colleges_2012_2013/);
  assert.match(policy, /nmc_crmi_mbbs_2026_27/);
});
