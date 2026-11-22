insert into public.monk_directory_categories (category_key, label, domain_keys) values
('allied_health','Allied & Healthcare Professions',array['allied_health','physiotherapy','occupational_therapy','optometry']),
('veterinary','Veterinary Colleges',array['veterinary']),
('rehabilitation','Rehabilitation & Special Education',array['rehabilitation','special_education'])
on conflict (category_key) do update set label = excluded.label, domain_keys = excluded.domain_keys;

insert into public.monk_directory_sources (source_key, authority_name, domain_keys, source_url, notes) values
('ncism','National Commission for Indian System of Medicine',array['ayurveda','siddha','unani','sowa_rigpa'],'https://ncism.org.in/','Use current recognized-college and qualification records.'),
('nch','National Commission for Homoeopathy',array['homoeopathy'],'https://nch.org.in/mqrl','Use the current Medical Qualification Recognition List and academic-year notices.'),
('vci','Veterinary Council of India',array['veterinary'],'https://vci.admissions.nic.in/institutes/','Distinguish recognized and provisionally recognized colleges by session.'),
('rci','Rehabilitation Council of India',array['rehabilitation','special_education'],'https://rehabcouncil.nic.in/regular-mode-inst/','Use current approved institute/course and academic-year records.'),
('ncahp','National Commission for Allied and Healthcare Professions',array['allied_health'],'https://www.mohfw.gov.in/sites/default/files/Public%20notice%20by%20NCAHP-signed.pdf','Use official MoHFW/NCAHP notifications; do not infer institution approval from the Act alone.'),
('ncvet','National Council for Vocational Education and Training',array['vocational','skills'],'https://ncvet.gov.in/','Use approved awarding bodies and qualification/affiliation records.')
on conflict (source_key) do update
set authority_name = excluded.authority_name,
    domain_keys = excluded.domain_keys,
    source_url = excluded.source_url,
    notes = excluded.notes;
