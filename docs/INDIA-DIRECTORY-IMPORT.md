# MONK India-wide institution directory

## Data policy

MONK separates **institution listing** from **course/programme approval**. An AISHE listing establishes that an institution appears in that survey directory; it does not prove that a specific engineering, medical, law, pharmacy, nursing, teacher-education or other professional programme is currently approved. Approval rows must be tied to the relevant regulator, programme, academic year, intake and source document.

Never mark a record fully verified from a search result, NIRF participation, a college's own website, a commercial directory, or an old AISHE survey alone.

## Sources and reuse

| Source | Coverage | Use in MONK |
|---|---|---|
| AIKosh AISHE university dataset | Universities from the AISHE Institutional Directory; Open Government License, India | License is confirmed, but the current landing page reports no downloadable data file. Import is disabled until the official file is available; never synthesize records from search snippets. |
| OGD India AISHE 2011-12 and 2012-13 college datasets | Historical colleges | OGD catalog states Government Open Data License - India. Import only as `stale`, unpublished discovery candidates. Not current recognition. |
| AISHE live institutional directory | Universities, colleges and standalone institutions | Current dashboard lists the national universe, but no bulk export file was obtained. Do not scrape/rehost until a lawful export or documented API/reuse route is available. |
| AICTE public approved-institutes API | Technical institutions across states | Public endpoint identified; the upstream data is owned by AICTE and no explicit bulk-reuse license was found. State-wise sync code is ready but disabled until reuse terms are confirmed. |
| UGC | University legal status, categories, notices and fake-university warnings | Cross-check university identity/status; store notices as evidence, not blanket course approvals. |
| NMC | Medical institution and course notices | The 10 Mar 2026 CRMI notice contains MBBS seat history through AY 2025-26 and CRMI slots for AY 2026-27. It is not proof of 2026-27 MBBS approval; bulk import is disabled pending reuse review. |
| NMC / DCI / PCI / INC / NCISM / NCH | Medical, dental, pharmacy, nursing and AYUSH | Course-wise approval and annual intake evidence. |
| BCI / NCTE / RCI / CoA / VCI / ICAR / DGT-NCVT / NCVET | Law, teacher education, rehabilitation, architecture, veterinary, agriculture and vocational | Relevant regulator's own current list/order only. |
| NIRF | Participating/ranked institutions | Discovery/ranking signal only; not statutory recognition. Import disabled until reuse terms are reviewed. |

Official public references:
- AISHE directory: https://dashboard.aishe.gov.in/hedirectory/#/institutionDirectory
- AISHE documents: https://aishe.gov.in/documents/
- AIKosh AISHE universities dataset: https://aikosh.indiaai.gov.in/home/datasets/details/all_universities_as_per_aishe_dashboard.html
- OGD AISHE college catalog: https://data.gov.in/catalog/list-colleges-aishe-survey
- Government Open Data License, India: https://data.gov.in/Godl
- AICTE approved-institutes endpoint: https://facilities.aicte-india.org/dashboard/pages/php/approvedinstituteserver.php
- NMC CRMI/MBBS seat notice (10 Mar 2026): https://www.nmc.org.in/MCIRest/open/getDocument?path=%2FDocuments%2FPublic%2FPortal%2FLatestNews%2FCRMI_mergedPublicNotice.pdf
- UGC university details: https://www.ugc.gov.in/universitydetails/
- UGC fake/violating HEI notices: https://www.ugc.gov.in/universitydetails/HEIs_Violating_Regulations?tab=fakeuni
- AICTE: https://www.aicte-india.org/
- NMC college/course search: https://oldnmc.nmc.org.in/information-desk/college-and-course-search/
- PCI approved institutions: https://www.pci.gov.in/en/approved-institute/
- NCTE recognized institutions: https://web.ncte.gov.in/page/recognized-institutions
- NIRF 2025 college participants: https://www.nirfindia.org/Rankings/2025/CollegeRankingALL.html

## Storage and deduplication

- Keep the original XLSX/CSV/PDF outside Postgres; do not put files or full source rows into table columns.
- Convert each row to a compact normalized record and send batches of at most 200 (RPC hard limit: 250; payload limit: 1 MB).
- The database stores only canonical name, normalized name, region, type, ownership, public website, AISHE identifier, source identity, and a bounded provenance snapshot.
- Snapshots store a hash plus normalized selected fields, not the full input file. Identical source records with identical hashes do not create duplicate snapshots.
- Source record IDs are unique per source. Cross-source matching is exact and conservative; ambiguous same-name campuses are not auto-merged.
- Existing GIN search and geography indexes are reused. The migration adds a published-directory composite index and a verified-programme lookup index.
- Source identity is kept separately from institution identity, allowing multiple regulator records to refer to one canonical institution.

## Import procedure

1. Download a dataset only from a source whose `terms_review_status` is `approved` and `import_enabled` is true.
2. At present, the AIKosh university source is disabled because its page has no downloadable file; AICTE and NMC sources are disabled pending reuse review. The OGD 2011-12 and 2012-13 historical college datasets are the only currently enabled bulk-file sources.
3. Keep the original file in a secure working folder, not Git.
4. Convert XLSX to CSV locally if the source does not provide CSV. Keep the original untouched.
5. Run a dry-run first:
   ```bash
   node scripts/import-india-directory.mjs --input ./official-ogd-colleges.csv --source ogd_aishe_colleges_2011_2012 --dry-run
   ```
5. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in a trusted shell environment. Never paste the service-role key into chat, commit it, or use a `VITE_*` variable.
6. After the dry-run and source approval checks, run the import:
   ```bash
   node scripts/import-india-directory.mjs --input ./official-ogd-colleges.csv --source ogd_aishe_colleges_2011_2012
   ```
7. Check counts in `monk_directory_institutions`, `monk_directory_source_records`, and `monk_directory_source_snapshots`. Review rejected rows and duplicates before publishing any new source type.

For the historical OGD file, use `--source ogd_aishe_colleges_2011_2012`. It is deliberately imported as stale and unpublished. Do not change that policy merely to inflate the public count.

## Admin endpoint

`directory-import` is deployed with JWT verification. It accepts requests only from users whose server-managed `app_metadata.platform_role` is `platform_admin` or `directory_admin`. User-editable `user_metadata` cannot grant this role. The endpoint supports an admin-only status action and batches through the service-role-only RPC.

## AICTE live sync (currently gated)
The Edge Function also supports `action: "sync_aicte"` and fetches one state per request from the official AICTE endpoint for the selected academic year. It intentionally does not synchronize all 36 states concurrently. The AICTE source is currently `terms_review_status=pending` and `import_enabled=false` because the API's bulk-reuse terms were not established. The endpoint returns a clear 403/422 until a source owner/license review authorizes reuse. Do not flip this flag merely to populate the count.

Example after reuse approval and assignment of a server-managed directory-admin role:
```json
{
  "action": "sync_aicte",
  "state": "Bihar",
  "academicYear": "2025-2026"
}
```

The AICTE source is an institution-listing signal only. It does not approve every programme at an institution. Do not infer a course approval from an institute's presence in this list.

## Verification lifecycle

- `unverified`: discovered/imported, no current regulator evidence.
- `partially_verified`: official institution identity/listing verified, but not every course/approval.
- `verified`: required institution fields and applicable current regulator evidence have been checked.
- `stale`: source evidence is old or has passed review date.
- `disputed`: conflicting official evidence or a formal dispute.
- `closed`: official closure evidence.

Do not set `verified` or publish an approval badge until the current regulator evidence has been reviewed. Never infer approval from NIRF participation, AISHE existence, UGC university status alone, or a commercial listing.
