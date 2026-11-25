import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

test("Business document panel uses private tenant-scoped storage and signed downloads", async () => {
  const panel = await readFile(join(root, "src/components/BusinessDocumentsPanel.tsx"), "utf8");
  assert.match(panel, /from\("business-private"\)/);
  assert.match(panel, /createSignedUrl\(row\.storage_path, 60/);
  assert.match(panel, /canUpload/);
  assert.match(panel, /canDelete/);
  assert.match(panel, /MAX_FILE_SIZE = 25 \* 1024 \* 1024/);
  assert.match(panel, /storagePath = `\$\{organizationId\}\/\$\{documentId\}\//);
  assert.doesNotMatch(panel, /getPublicUrl\(/);
});

test("Business workspace exposes Documents only to users with read permission", async () => {
  const workspace = await readFile(join(root, "src/components/BusinessOperationsLive.tsx"), "utf8");
  assert.match(workspace, /"Documents"/);
  assert.match(workspace, /documents\.document\.read/);
  assert.match(workspace, /documents\.document\.upload/);
  assert.match(workspace, /documents\.document\.approve/);
  assert.match(workspace, /<BusinessDocumentsPanel/);
});

test("Private business document migration enforces tenant RLS and a private bucket", async () => {
  const migration = await readFile(join(root, "supabase/migrations/20261125075129_business_private_document_storage.sql"), "utf8");
  assert.match(migration, /business-private/);
  assert.match(migration, /public = false/);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /current_organization_id\(\)/);
  assert.match(migration, /documents\.document\.read/);
  assert.match(migration, /documents\.document\.upload/);
});
