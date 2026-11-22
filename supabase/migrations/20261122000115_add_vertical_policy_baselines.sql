-- Every workspace vertical has baseline obligations, regardless of a self-selected entity subtype.
insert into public.monk_policy_rules(rule_key,priority,conditions,required_policy_keys,active) values
  ('education_workspace',5,'{"vertical":"education"}'::jsonb,array['education','student_data','data_processing'],true),
  ('business_workspace',5,'{"vertical":"business"}'::jsonb,array['business_services','customer_data','data_processing'],true)
on conflict(rule_key) do update
set priority=excluded.priority,
    conditions=excluded.conditions,
    required_policy_keys=excluded.required_policy_keys,
    active=excluded.active;
