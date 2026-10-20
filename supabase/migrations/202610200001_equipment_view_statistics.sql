-- 검토용. 명시적 승인 전 운영 DB에 적용하지 않는다.
-- 기존 테이블은 변경하지 않으며 pg_cron이 이미 활성화된 환경에서만 적용한다.
begin;

do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise exception '90일 보관기간 준수를 위한 pg_cron 활성화/대체 스케줄 검토가 필요합니다.';
  end if;
  if coalesce(current_setting('cron.timezone', true), 'GMT') not in ('GMT', 'UTC', 'Etc/UTC') then
    raise exception '삭제 작업은 UTC 기준 스케줄입니다. cron 시간대를 검토하세요.';
  end if;
end $$;

create table public.equipment_view_daily_counts (
  view_date date not null,
  age_band text not null check (age_band in ('under20', '20s', '30s', '40s', '50s', '60s', '70s', '80plus')),
  sido text not null check (sido in ('서울특별시', '부산광역시', '대구광역시', '인천광역시', '광주광역시',
    '대전광역시', '울산광역시', '세종특별자치시', '경기도', '강원특별자치도', '충청북도', '충청남도',
    '전북특별자치도', '전라남도', '경상북도', '경상남도', '제주특별자치도')),
  site_id text not null,
  installation_id text not null,
  consent_version text not null,
  view_count bigint not null default 1 check (view_count > 0),
  primary key (view_date, age_band, sido, site_id, installation_id, consent_version)
);

alter table public.equipment_view_daily_counts enable row level security;
revoke all on public.equipment_view_daily_counts from public, anon, authenticated;
grant select on public.equipment_view_daily_counts to service_role;

create function public.record_equipment_view(
  p_site_id text, p_installation_id text, p_age_band text, p_sido text, p_consent_version text
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_consent_version is distinct from '2026-10-20-v2' then
    raise exception '동의 안내 버전을 확인하세요.';
  end if;
  if not exists (
    select 1 from public.site_equipment installation
    join public.exercise_sites site on site.id = installation.site_id
    where installation.id::text = p_installation_id and site.id::text = p_site_id
      and installation.is_published = true and site.is_published = true
  ) then
    raise exception '공개된 지점/설치 기구가 아닙니다.';
  end if;
  insert into public.equipment_view_daily_counts(view_date, age_band, sido, site_id, installation_id, consent_version)
  values ((now() at time zone 'Asia/Seoul')::date, p_age_band, p_sido, p_site_id, p_installation_id, p_consent_version)
  on conflict (view_date, age_band, sido, site_id, installation_id, consent_version)
  do update set view_count = public.equipment_view_daily_counts.view_count + 1;
end $$;

revoke all on function public.record_equipment_view(text, text, text, text, text) from public;
grant execute on function public.record_equipment_view(text, text, text, text, text) to anon, authenticated;

create function public.purge_equipment_view_statistics()
returns void language sql security definer set search_path = '' as $$
  delete from public.equipment_view_daily_counts
  where view_date <= (now() at time zone 'Asia/Seoul')::date - 90;
$$;
revoke all on function public.purge_equipment_view_statistics() from public, anon, authenticated;
grant execute on function public.purge_equipment_view_statistics() to service_role;

-- UTC 15:00 = 한국 시간 다음 날 00:00. 사용자/공개 클라이언트의 요청과 무관하게 삭제한다.
select cron.schedule('walk-fit-map-equipment-stats-retention', '0 15 * * *',
  'select public.purge_equipment_view_statistics()');

commit;
