-- Read-only metadata audit: do not include credentials or survey row contents.
select n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where (n.nspname = 'public' and c.relname in
  ('exercise_sites', 'site_equipment', 'equipment_catalog', 'survey_locations'))
  or (n.nspname = 'storage' and c.relname = 'objects');

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies where (schemaname = 'public' and tablename in
  ('exercise_sites', 'site_equipment', 'equipment_catalog', 'survey_locations'))
  or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;

select table_schema, table_name, grantee, privilege_type from information_schema.role_table_grants
where grantee in ('anon', 'authenticated', 'PUBLIC') and table_schema in ('public', 'storage')
order by table_schema, table_name, grantee;

select id, public from storage.buckets where id in ('survey-photos', 'equipment-images');

-- Path format counts only. Full URLs require review before private-bucket cutover.
select count(*) filter (where p ~ '^https?://') as full_urls,
       count(*) filter (where p is not null and p !~ '^https?://') as relative_paths
from (
  select coalesce(nullif(btrim(q.stamped_photo_path), ''), nullif(btrim(s.site_image_path), '')) p
  from public.exercise_sites s left join public.survey_locations q on q.id = s.survey_location_id
  where s.is_published is true
) photos;
