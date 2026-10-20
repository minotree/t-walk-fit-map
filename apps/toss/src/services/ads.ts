import { loadFullScreenAd, showFullScreenAd, Storage, TossAds } from '@apps-in-toss/web-framework';
import { createInterstitial } from './interstitial';

type Screen = 'home' | 'site' | 'equipment';
const mode = import.meta.env.VITE_AD_MODE;
const test = mode === 'test';
const enabled = test || mode === 'production';
const id = test ? 'ait-ad-test-interstitial-id' : import.meta.env.VITE_INTERSTITIAL_ID;
const seconds = Number(import.meta.env.VITE_INTERSTITIAL_INTERVAL_SECONDS);
export const intervalMs = Number.isFinite(seconds) && seconds >= 120 ? seconds * 1000 : 120_000;

export function makeInterstitial() {
  let disposed = false;
  let restoredState = false;
  const controller = createInterstitial({
    supported: () => Boolean(enabled && id && loadFullScreenAd.isSupported() && showFullScreenAd.isSupported()),
    load: (ready, failed) => loadFullScreenAd({
      options: { adGroupId: id }, onEvent: () => ready(), onError: failed,
    }),
    show: (shown, finished) => showFullScreenAd({
      options: { adGroupId: id },
      onEvent: event => {
        if (event.type === 'show') shown();
        if (event.type === 'dismissed' || event.type === 'failedToShow') finished();
      },
      onError: finished,
    }),
  }, intervalMs, Date.now, time => {
    void Storage.setItem('LAST_INTERSTITIAL_SHOWN_AT', String(time)).catch(() => {
      console.warn('[ads] 광고 간격 저장에 실패했습니다. 현재 세션의 간격은 유지합니다.');
    });
  });
  let restored: Promise<void> | undefined;
  return {
    preload() {
      if (!enabled) return;
      // 이전 세션 시각을 복원하는 동안에도 상세 이동은 광고 없이 즉시 허용한다.
      restored ??= Promise.resolve().then(() => Storage.getItem('LAST_INTERSTITIAL_SHOWN_AT')).then(value => {
        if (value) controller.restoreLastShown(Number(value));
      }).catch(() => {
        controller.restoreLastShown(Date.now());
        console.warn('[ads] 광고 간격 복원에 실패해 첫 광고를 잠시 생략합니다.');
      }).then(() => { restoredState = true; if (!disposed) controller.preload(); });
    },
    beforeDetail: () => restoredState ? controller.beforeDetail() : Promise.resolve(true),
    dispose() { disposed = true; controller.dispose(); },
  };
}

let initialization: Promise<boolean> | undefined;
export function initializeBanner(): Promise<boolean> {
  if (!enabled || !TossAds.initialize.isSupported() || !TossAds.attachBanner.isSupported()) return Promise.resolve(false);
  initialization ??= new Promise(resolve => {
    const timer = setTimeout(() => resolve(false), 10_000);
    try {
      TossAds.initialize({ callbacks: {
        onInitialized: () => { clearTimeout(timer); resolve(true); },
        onInitializationFailed: () => { clearTimeout(timer); resolve(false); },
      } });
    } catch { clearTimeout(timer); resolve(false); }
  });
  return initialization;
}

export function bannerId(screen: Screen): string | undefined {
  if (!enabled) return undefined;
  if (test) return 'ait-ad-test-banner-id';
  return { home: import.meta.env.VITE_BANNER_HOME_ID, site: import.meta.env.VITE_BANNER_SITE_ID,
    equipment: import.meta.env.VITE_BANNER_EQUIPMENT_ID }[screen];
}
