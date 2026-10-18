import { Preferences } from '@capacitor/preferences';
import { UserProfile } from '../types/userProfile';

const PROFILE_KEY = 'USER_PROFILE';

const DEFAULT_PROFILE: UserProfile = {
  birthYear: null,
  gender: 'NONE',
  region: '',
  useCurrentLocation: false,
  isConfigured: false,
};

/**
 * 로컬 저장소에서 사용자 프로필 정보를 불러옵니다.
 */
export const getUserProfile = async (): Promise<UserProfile> => {
  try {
    const { value } = await Preferences.get({ key: PROFILE_KEY });
    if (!value) return { ...DEFAULT_PROFILE };
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_PROFILE };
    const stored = parsed as Record<string, unknown>;
    return {
      birthYear: typeof stored.birthYear === 'number' && Number.isInteger(stored.birthYear)
        && stored.birthYear >= 1940 && stored.birthYear <= new Date().getFullYear() ? stored.birthYear : null,
      gender: stored.gender === 'M' || stored.gender === 'F' ? stored.gender : 'NONE',
      region: typeof stored.region === 'string' ? stored.region : '',
      useCurrentLocation: stored.useCurrentLocation === true,
      isConfigured: stored.isConfigured === true,
    };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
};

/**
 * 사용자 프로필 정보를 로컬 저장소에 저장합니다.
 */
export const saveUserProfile = async (
  profile: Omit<UserProfile, 'isConfigured'>
): Promise<UserProfile> => {
  const updatedProfile: UserProfile = {
    ...profile,
    isConfigured: true,
  };
  await Preferences.set({
    key: PROFILE_KEY,
    value: JSON.stringify(updatedProfile),
  });
  return updatedProfile;
};
