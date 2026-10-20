import type { LocationProvider } from '@walk-fit/contracts';

export const browserLocationProvider: LocationProvider = {
  getCurrentLocation() {
    if (!navigator.geolocation) return Promise.reject(new Error('현재 위치를 지원하지 않는 환경입니다.'));
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        position => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
        () => reject(new Error('현재 위치를 확인할 수 없습니다. 위치 권한과 기기 설정을 확인해 주세요.')),
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
  },
};
