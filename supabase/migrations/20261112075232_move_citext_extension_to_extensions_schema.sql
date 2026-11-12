-- Keep extension-owned types and functions out of the exposed public schema.
alter extension citext set schema extensions;
