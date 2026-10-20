import { Preferences } from '@capacitor/preferences';
import { createProfileRepository } from '@walk-fit/data';

// 플랫폼 저장소와 기존 저장 키는 웹 앱의 조립 지점에서 소유한다.
const PROFILE_KEY = 'USER_PROFILE';
const repository = createProfileRepository({
  async get() {
    const { value } = await Preferences.get({ key: PROFILE_KEY });
    return value;
  },
  async set(value) {
    await Preferences.set({ key: PROFILE_KEY, value });
  },
});

export const { getUserProfile, saveUserProfile } = repository;
