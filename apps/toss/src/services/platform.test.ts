import { beforeEach, expect, test, vi } from 'vitest';
import { Device, Storage } from '@apps-in-toss/web-framework';
import { locationProvider, profiles } from './platform';

vi.mock('@apps-in-toss/web-framework', () => ({
  Accuracy: { High: 4 },
  Device: { getLocation: Object.assign(vi.fn(), { getPermission: vi.fn(), openPermissionDialog: vi.fn() }) },
  Storage: { getItem: vi.fn(), setItem: vi.fn() },
}));
beforeEach(() => vi.resetAllMocks());

test('위치 허용 상태에서는 권한 요청을 반복하지 않는다', async () => {
  vi.mocked(Device.getLocation.getPermission).mockResolvedValue('allowed');
  vi.mocked(Device.getLocation).mockResolvedValue({ timestamp: 1, coords: { latitude: 37.5, longitude: 127,
    altitude: 0, accuracy: 10, altitudeAccuracy: 0, heading: 0 } });
  expect(await locationProvider.getCurrentLocation()).toEqual({ lat: 37.5, lng: 127 });
  expect(Device.getLocation.openPermissionDialog).not.toHaveBeenCalled();
});

test('위치 권한 거부 시 조회하지 않고 오류를 전달한다', async () => {
  vi.mocked(Device.getLocation.getPermission).mockResolvedValue('notDetermined');
  vi.mocked(Device.getLocation.openPermissionDialog).mockResolvedValue('denied');
  await expect(locationProvider.getCurrentLocation()).rejects.toThrow('위치 권한');
  expect(Device.getLocation).not.toHaveBeenCalled();
});

test('프로필은 토스 Storage의 기존 키로 저장하고 복원한다', async () => {
  const input = { birthYear: 1990, gender: 'NONE' as const, region: '서울', useCurrentLocation: false };
  const saved = await profiles.saveUserProfile(input);
  expect(Storage.setItem).toHaveBeenCalledWith('USER_PROFILE', JSON.stringify(saved));
  vi.mocked(Storage.getItem).mockResolvedValue(JSON.stringify(saved));
  expect(await profiles.getUserProfile()).toEqual(saved);
});
