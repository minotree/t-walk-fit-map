import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from '@walk-fit/contracts';
import { KOREA_REGIONS } from './koreaRegions';

export const STATISTICS_POLICY_VERSION = '2026-10-20-v2';

export function equipmentViewParameters(profile: UserProfile, siteId: string, installationId: string, year: number) {
  if (!profile.statisticsConsent || profile.statisticsConsentVersion !== STATISTICS_POLICY_VERSION ||
    profile.birthYear === null || !Number.isInteger(profile.birthYear) || profile.birthYear < 1940 ||
    profile.birthYear > year || !Number.isInteger(year) || !siteId || !installationId) return null;
  const sido = profile.region.trim().split(/\s+/)[0];
  if (!KOREA_REGIONS.some(region => region.sido === sido)) return null;
  const age = year - profile.birthYear;
  const ageBand = age < 20 ? 'under20' : age >= 80 ? '80plus' : `${Math.floor(age / 10) * 10}s`;
  return { p_site_id: siteId, p_installation_id: installationId, p_age_band: ageBand,
    p_sido: sido, p_consent_version: STATISTICS_POLICY_VERSION };
}

export function createEquipmentViewStatistics(client: SupabaseClient) {
  return async (profile: UserProfile, siteId: string, installationId: string, year: number) => {
    const parameters = equipmentViewParameters(profile, siteId, installationId, year);
    if (!parameters) return;
    const { error } = await client.rpc('record_equipment_view', parameters);
    if (error) throw new Error('기구 조회 통계를 저장하지 못했습니다.');
  };
}
