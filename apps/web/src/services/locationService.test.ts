import { afterEach, expect, test, vi } from 'vitest';
import { browserLocationProvider } from './locationService';

afterEach(() => vi.unstubAllGlobals());

test('브라우저 위치 결과를 공통 좌표로 변환한다', async () => {
  const getCurrentPosition = vi.fn((success: (value: { coords: { latitude: number; longitude: number } }) => void) => success({ coords: { latitude: 37.5, longitude: 127 } }));
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });
  expect(await browserLocationProvider.getCurrentLocation()).toEqual({ lat: 37.5, lng: 127 });
  expect(getCurrentPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), { enableHighAccuracy: true, timeout: 10000 });
});

test('위치 권한 거부를 실패로 전달한다', async () => {
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: (_success: unknown, failure: () => void) => failure() } });
  await expect(browserLocationProvider.getCurrentLocation()).rejects.toThrow('위치 권한');
});

test('위치 API가 없는 환경을 처리한다', async () => {
  vi.stubGlobal('navigator', {});
  await expect(browserLocationProvider.getCurrentLocation()).rejects.toThrow('지원하지 않는');
});
