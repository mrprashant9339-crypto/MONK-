-- AISHE's published website policy requires Ministry permission before reproduction.
-- Keep AISHE ingestion disabled until explicit permission or a separately licensed dataset is confirmed.
update public.monk_directory_sources
set notes = concat_ws(' ', notes,
  'AISHE website copyright policy requires Ministry of Education permission before reproducing its website content; keep imports disabled until written permission or an independently licensed dataset is confirmed.')
where source_key = 'aishe';
