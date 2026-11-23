# Phase 7 — MONK Campus Workspace

**Status:** Started — implementation branch created  
**Branch:** `phase-7-campus-workspace`  
**Base:** `frontend-first-complete`  
**Product scope:** Complete the Campus experience across institution administration, faculty, students and guardians, while preserving the existing Business workspace and tenant boundaries.

## Product direction

Phase 7 follows the approved MONK roadmap: Phase 6 Business Operations, Phase 7 Campus Workspace, Phase 8 AI and Automation. This phase does not implement AI agent runtime or business finance extensions.

The existing repository already contains a substantial education foundation: institution/campus/department setup, academic years, programmes, batches, subjects, student/faculty records, admissions, guardian linking, timetable, attendance, private documents, examinations, draft marks and published results. Phase 7 must extend and harden this foundation rather than duplicate it.

## Phase 7 work sequence

### 7.0 — Audit and architecture
- Map every existing education table, RPC, trigger, RLS policy, storage policy and UI route.
- Identify which workflows are genuinely persistent and which are preview/local-only.
- Verify the existing role model: platform admin, institution owner/admin, principal, HOD, faculty, student and parent/guardian.
- Define typed service boundaries for campus modules; avoid direct table access from newly built presentation components.
- Record gaps, dependencies and migration compatibility before schema changes.

**Exit criteria:** verified implementation matrix; no duplicate schema; migration plan reviewed.

### 7.1 — Campus navigation and role dashboards
- Build a dedicated Campus workspace shell with role-aware navigation and dashboard.
- Principal/admin: institution health, admissions, attendance, fees and academic overview.
- HOD: department, assigned programmes, faculty, timetable and attendance.
- Faculty: assigned classes, workload, timetable, attendance, assignments and marks.
- Student: profile, ID-card view, timetable, attendance, assignments, notices and results.
- Parent/guardian: linked children only, attendance, published results, notices and authorized documents.
- All counts and status indicators must come from authorized records; never fabricate operational metrics.

### 7.2 — Student lifecycle
- Student directory search, filters, detail profile and status history.
- Admission-to-enrollment workflow and duplicate-safe enrollment.
- Student ID card preview with institution identity and verified student attributes.
- Guardian relationship management with explicit authorization.
- Student profile correction request and audit trail.
- Bulk import preview with row validation and duplicate detection; no silent partial import.

### 7.3 — Teaching and learning
- Assignment creation, instructions, due dates, attachments and student submissions.
- Learning materials by programme, batch, semester and subject.
- Faculty workload and leave request/review.
- Academic calendar and notices with audience targeting.
- Class/online session links with safe external-link handling.
- Submission states and feedback; do not claim video hosting or LMS integration unless connected.

### 7.4 — Campus services
- Fees ledger and fee schedules, scholarships and payment status.
- Complaints/grievances with private case visibility and resolution history.
- Transport routes/stops and student allocation.
- Hostel allocation and occupancy.
- Library catalogue, issue/return and due-date workflow.
- Certificates and document requests with approval and verification.
- These are real persistent modules only after server-side schema, RLS and transactional operations are implemented. Payment gateway, statutory filing and third-party integrations remain separately gated.

### 7.5 — India-wide institution directory
- Build a national institution directory covering relevant institution types and states/UTs, not a fixed Bihar-only list.
- Institution categories include engineering, medical, law, commerce, arts/science, management, polytechnic, universities and other recognized higher-education institutions.
- Each record must carry source, source URL/reference, source date, verification status, institution identifiers where available, location, category and affiliation/recognition fields.
- Prefer authoritative sources such as UGC, AICTE, NMC, BCI, PCI, state technical education boards and official university/institution websites, according to institution type.
- Deduplicate by official identifier and normalized name/address; retain aliases and source provenance.
- Separate verified, needs-review, closed/merged and unverified records. Do not describe partial coverage as the complete national directory.
- Do not scrape or republish restricted personal data. Public institution data only.

### 7.6 — Security, accessibility and QA
- RLS and tenant-isolation tests for every new table and RPC.
- Role matrix tests for principal, HOD, faculty, student and parent.
- Parent-child isolation and assigned faculty/batch/subject isolation.
- Private storage authorization, file-type/size validation and signed URL expiry.
- Audit logs for admissions, student status, marks publication, fees and grievance decisions.
- Responsive Android/mobile and desktop layouts, keyboard navigation, reduced motion and screen-reader status.
- Playwright E2E for critical role journeys plus SQL regression tests.
- CI build, smoke and browser E2E must pass on the exact Phase 7 head commit.

## Data and security invariants

1. Every institution-owned record is scoped to the authenticated organization on the server.
2. Client-provided organization IDs, roles, student IDs or guardian links are never trusted as authorization.
3. Students see only their own records; guardians see only explicitly linked children; faculty see only assigned classes/batches/subjects.
4. Draft marks are not visible as published results. Publication requires authorized validation and an auditable transition.
5. Student documents remain in private storage with tenant/student-scoped policies and short-lived signed URLs.
6. No real student, parent, faculty, fee or attendance data is used as demo content.
7. No frontend success state is shown until the server confirms the mutation.
8. Existing Phase 6 Business tables, policies and routes must remain unaffected.

## Explicitly out of scope

- Phase 8 AI Copilot, agents, workflow automation and autonomous execution.
- Real payment gateway processing until a provider and webhook verification are approved.
- Government statutory filings or certification guarantees.
- Production deployment or public launch claims without verified deployment evidence.

## Definition of done

Phase 7 is complete only when all accepted Campus modules are implemented end-to-end, all role and tenant security tests pass, data provenance for the institution directory is auditable, CI is green on the exact head commit, and production release checks are separately verified. A roadmap document or a rendered screen alone does not count as implementation completion.

## Implementation log

### 2026-11-23 — Phase 7.0 guardian scope hardening
- The guardian portal now resolves the authenticated guardian profile before requesting guardian-child links.
- The browser query explicitly filters `education_student_guardians.guardian_id` to the resolved guardian profile; RLS remains the authoritative server-side boundary.
- Added `supabase/tests/phase_7_guardian_portal_scope.sql` to assert RLS on guardian/student records, guardian-specific parent policies for attendance, documents and published results, private storage scope, and the private bucket limit.
- Read-only verification against the active Supabase database confirmed all guardian-link, parent-record, private-storage and bucket assertions.
- CI now runs on pushes to `phase-7-campus-workspace` and pull requests targeting `frontend-first-complete`; previously this branch/PR base was not included in the workflow triggers.

This is one completed hardening vertical, not a claim that all Phase 7 acceptance items—or all Phase 0–7 roadmap items—are complete.
