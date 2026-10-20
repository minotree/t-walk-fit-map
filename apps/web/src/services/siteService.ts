import { createSiteRepository } from '@walk-fit/data';
import { supabase, requireSupabase } from '../lib/supabaseClient';
export type { SiteDetail, InstallationItem, EquipmentDetail } from '@walk-fit/contracts';

const repository = createSiteRepository(supabase);

export function getPublishedSites() {
  requireSupabase();
  return repository.getPublishedSites();
}

export function getSiteDetail(siteId: string) {
  requireSupabase();
  return repository.getSiteDetail(siteId);
}

export function getEquipmentDetail(siteId: string, installationId: string) {
  requireSupabase();
  return repository.getEquipmentDetail(siteId, installationId);
}
