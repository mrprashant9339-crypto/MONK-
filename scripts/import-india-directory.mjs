#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const args = process.argv.slice(2);
const inputIndex = args.indexOf("--input");
const sourceIndex = args.indexOf("--source");
const dryRun = args.includes("--dry-run");
const inputPath = inputIndex >= 0 ? args[inputIndex + 1] : "";
const sourceKey = sourceIndex >= 0 ? args[sourceIndex + 1] : "";
if (!inputPath || !sourceKey) {
  console.error("Usage: node scripts/import-india-directory.mjs --input <official.csv> --source <source_key> [--dry-run]");
  process.exit(2);
}

const stateCodes = new Map(Object.entries({
  "andaman and nicobar islands":"AN","andhra pradesh":"AP","arunachal pradesh":"AR","assam":"AS","bihar":"BR",
  "chandigarh":"CH","chhattisgarh":"CT","dadra and nagar haveli and daman and diu":"DN","dadra & nagar haveli and daman & diu":"DN","jammu & kashmir":"JK","andaman & nicobar islands":"AN","uttaranchal":"UK","orissa":"OD","delhi":"DL","goa":"GA",
  "gujarat":"GJ","haryana":"HR","himachal pradesh":"HP","jammu and kashmir":"JK","jharkhand":"JH","karnataka":"KA",
  "kerala":"KL","ladakh":"LA","lakshadweep":"LD","madhya pradesh":"MP","maharashtra":"MH","manipur":"MN",
  "meghalaya":"ML","mizoram":"MZ","nagaland":"NL","odisha":"OD","puducherry":"PY","punjab":"PB","rajasthan":"RJ",
  "sikkim":"SK","tamil nadu":"TN","telangana":"TS","tripura":"TR","uttar pradesh":"UP","uttarakhand":"UK",
  "west bengal":"WB"
}));

function parseCsv(source) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"' && source[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell.length || row.length) { row.push(cell.replace(/\r$/, "")); rows.push(row); }
  return rows.filter(r => r.some(v => String(v).trim() !== ""));
}
function key(value) {
  return String(value ?? "").replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
function first(record, aliases) {
  for (const alias of aliases) {
    const value = record[key(alias)];
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return "";
}
function ownership(value) {
  const v = value.toLowerCase();
  if (v.includes("central")) return "central_government";
  if (v.includes("state government") || v === "state govt") return "state_government";
  if (v.includes("local body") || v.includes("municipal")) return "local_body";
  if (v.includes("aided")) return "government_aided";
  if (v.includes("private")) return "private";
  if (v.includes("deemed")) return "deemed";
  if (v.includes("autonomous")) return "autonomous";
  if (v.includes("trust") || v.includes("society")) return "trust_society";
  return "other";
}

const raw = (await readFile(inputPath, "utf8")).replace(/^\uFEFF/, "");
if (Buffer.byteLength(raw, "utf8") > 30_000_000) throw new Error("Input file exceeds 30 MB; split it into smaller CSV files.");
const parsed = parseCsv(raw);
if (parsed.length < 2) throw new Error("CSV has no data rows.");
const headers = parsed[0].map(key);
const mapped = parsed.slice(1).map(values => Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""])));
const records = [];
const rejected = [];
for (let i = 0; i < mapped.length; i++) {
  const row = mapped[i];
  const name = first(row, ["Name of Institution","Institution Name","College Name","University Name","Name"]);
  const code = first(row, ["AISHE Code","AISHE Code (Id)","Institute Code","College Code","University Code","Code"]);
  const stateName = first(row, ["State","State Name","State/UT","State / UT"]);
  const district = first(row, ["District","District Name"]);
  if (!name || !code || !stateName) { rejected.push(i + 2); continue; }
  const stateCode = stateCodes.get(stateName.toLowerCase());
  if (!stateCode) { rejected.push(i + 2); continue; }
  const isUniversity = sourceKey === "aishe_aikosh_universities";
  const year = first(row, ["Year of Establishment","Year of Establishment of Institution","Establishment Year"]);
  const website = first(row, ["Website","Website URL","URL"]);
  const locationType = first(row, ["Location","Location Type"]);
  records.push({
    source_record_id: code,
    canonical_name: name,
    state_code: stateCode,
    district: district || null,
    city: first(row, ["City","Town"]) || null,
    category_key: isUniversity ? "university" : "other",
    institution_kind: isUniversity ? "university" : "college",
    ownership_key: ownership(first(row, ["Management","Management Type","Ownership"])),
    aishe_code: code,
    website_url: website || null,
    year_of_establishment: /^\d{4}$/.test(year) ? year : null,
    location_type: locationType || null
  });
}
if (!records.length) throw new Error("No valid records. Check CSV headers and state names.");
console.log(JSON.stringify({sourceKey,inputRows:mapped.length,accepted:records.length,rejectedRows:rejected.length,preview:records.slice(0,3)},null,2));
if (dryRun) process.exit(0);

const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!baseUrl || !serviceKey) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the trusted shell environment.");
const endpoint = baseUrl + "/rest/v1/rpc/ingest_monk_directory_batch";
let total = {inserted:0,updated:0,rejected:0,published_from_official_university_directory:0};
for (let offset = 0; offset < records.length; offset += 200) {
  const batch = records.slice(offset, offset + 200);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      authorization: "Bearer " + serviceKey,
      "content-type": "application/json",
      "prefer": "return=representation"
    },
    body: JSON.stringify({p_source_key:sourceKey,p_records:batch})
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("Import batch " + (Math.floor(offset / 200) + 1) + " failed (" + response.status + "): " + JSON.stringify(result));
  for (const field of Object.keys(total)) total[field] += Number(result[field] ?? 0);
  console.log("Imported batch " + (Math.floor(offset / 200) + 1) + "/" + Math.ceil(records.length / 200));
}
console.log(JSON.stringify({sourceKey,processed:records.length,rejectedRows:rejected.length,...total},null,2));
