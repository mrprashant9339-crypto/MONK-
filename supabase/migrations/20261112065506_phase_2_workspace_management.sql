-- Historical no-op migration marker.
-- The initial Phase 2 migration registration executed SELECT 1 only; it made no schema changes.
select 1;
