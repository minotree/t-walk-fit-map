import { beforeEach, expect, test, vi } from 'vitest';
import { Preferences } from '@capacitor/preferences';
import { getUserProfile, saveUserProfile } from './userProfileService';

vi.mock('@capacitor/preferences', () => ({ Preferences: { get: vi.fn(), set: vi.fn() } }));
beforeEach(() => vi.resetAllMocks());

test('기존 저장 키를 유지하며 프로필을 저장하고 복원한다', async () => {
  const profile = { birthYear: 1990, gender: 'NONE' as const, region: '서울특별시', useCurrentLocation: true };
  const saved = await saveUserProfile(profile);
  expect(Preferences.set).toHaveBeenCalledWith({ key: 'USER_PROFILE', value: JSON.stringify(saved) });
  vi.mocked(Preferences.get).mockResolvedValue({ value: JSON.stringify(saved) });
  expect(await getUserProfile()).toEqual({ ...profile, isConfigured: true });
});

test.each(['{broken', 'null', JSON.stringify({ birthYear: '1990', gender: 'invalid', region: [], useCurrentLocation: 'yes', isConfigured: 'true' })])('손상된 저장 데이터에서 위치 권한이나 설정 완료를 추정하지 않는다: %s', async value => {
  vi.mocked(Preferences.get).mockResolvedValue({ value });
  expect(await getUserProfile()).toEqual({ birthYear: null, gender: 'NONE', region: '', useCurrentLocation: false, isConfigured: false });
});

test('저장소 읽기 실패 시에도 기본 프로필로 조회를 계속할 수 있다', async () => {
  vi.mocked(Preferences.get).mockRejectedValue(new Error('storage blocked'));
  expect((await getUserProfile()).isConfigured).toBe(false);
});
