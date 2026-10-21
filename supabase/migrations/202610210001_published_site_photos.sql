-- REVIEW ONLY: audit existing policies and client compatibility before approval.
begin;

do $$
begin
  if exists (
    select 1 from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where ((n.nspname = 'public' and c.relname in ('exercise_sites', 'survey_locations'))
      or (n.nspname = 'storage' and c.relname = 'objects')) and not c.relrowsecurity
  ) then
    raise exception 'Required RLS is disabled. Review existing app policies before applying.';
  end if;
end $$;

-- Deliberately bypass survey RLS only inside a fixed, read-only projection.
-- Must be installed by postgres (trusted owner); never grant table access to anon.
create function public.get_published_site_photo(p_site_id uuid)
returns text language sql stable security definer set search_path = ''
as $$
  select coalesce(nullif(btrim(q.stamped_photo_path), ''), nullif(btrim(s.site_image_path), ''))
  from public.exercise_sites s
  left join public.survey_locations q on q.id = s.survey_location_id
  where s.id = p_site_id and s.is_published is true
$$;
revoke all on function public.get_published_site_photo(uuid) from public;
grant execute on function public.get_published_site_photo(uuid) to anon, authenticated;

create function public.is_published_site_photo(p_object_name text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.exercise_sites s
    left join public.survey_locations q on q.id = s.survey_location_id
    where s.is_published is true
    and coalesce(nullif(btrim(q.stamped_photo_path), ''), nullif(btrim(s.site_image_path), '')) = p_object_name
  )
$$;
revoke all on function public.is_published_site_photo(text) from public;
grant execute on function public.is_published_site_photo(text) to anon, authenticated;

-- No bucket visibility change here: public buckets bypass download RLS.
-- Restrictive cap prevents older permissive policies from widening ANON reads.
create policy walkfit_anon_photo_cap on storage.objects as restrictive
for select to anon using (
  bucket_id <> 'survey-photos' or public.is_published_site_photo(name)
);
create policy walkfit_public_site_photo on storage.objects
for select to anon, authenticated using (
  bucket_id = 'survey-photos' and public.is_published_site_photo(name)
);

-- Block anonymous survey rows even if an older permissive policy exists.
-- Requires survey_locations RLS to be enabled (audit prerequisite).
create policy walkfit_no_anon_surveys on public.survey_locations as restrictive
for select to anon using (false);

notify pgrst, 'reload schema';
commit;
