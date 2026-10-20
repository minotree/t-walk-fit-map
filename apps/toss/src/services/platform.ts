import { Accuracy, Device, Storage } from '@apps-in-toss/web-framework';
import { createClient } from '@supabase/supabase-js';
import { createProfileRepository, createSiteRepository, createEquipmentViewStatistics } from '@walk-fit/data';
import type { LocationProvider } from '@walk-fit/contracts';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const hasConnection = Boolean(url && key);
const client = createClient(url || 'https://placeholder.supabase.co', key || 'placeholder', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
export const sites = createSiteRepository(client);
export const profiles = createProfileRepository({
  get: () => Storage.getItem('USER_PROFILE'),
  set: value => Storage.setItem('USER_PROFILE', value),
});
// DB 마이그레이션·정책·보관기간 삭제 작업 검증 후에만 활성화한다.
export const statisticsEnabled = import.meta.env.VITE_ENABLE_VIEW_STATISTICS === 'true';
const saveView = createEquipmentViewStatistics(client);
export async function recordEquipmentView(siteId: string, installationId: string) {
  if (!statisticsEnabled) return;
  const profile = await profiles.getUserProfile();
  const year = Number(new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Asia/Seoul' }).format(new Date()));
  await saveView(profile, siteId, installationId, year);
}
export const locationProvider: LocationProvider = {
  async getCurrentLocation() {
    const permission = await Device.getLocation.getPermission();
    if (permission !== 'allowed') {
      const result = await Device.getLocation.openPermissionDialog();
      if (result !== 'allowed') throw new Error('위치 권한을 허용해 주세요.');
    }
    const position = await Device.getLocation({ accuracy: Accuracy.High });
    return { lat: position.coords.latitude, lng: position.coords.longitude };
  },
};
