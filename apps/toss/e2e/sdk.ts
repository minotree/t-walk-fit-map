// Playwright 전용 SDK 대체. production entry에서는 참조하지 않는다.
const params = () => new URLSearchParams(window.location.search);
export const Storage = {
  getItem: async (key: string) => localStorage.getItem(`test:${key}`),
  setItem: async (key: string, value: string) => { localStorage.setItem(`test:${key}`, value); },
};
const safe = { top: 44, bottom: 20, left: 0, right: 0 };
export const SafeArea = { get: () => safe, subscribe: () => () => {} };
export const getSafeAreaInsets = () => safe;
export const getAppsInTossGlobals = () => ({ brandPrimaryColor: '#3182F6' });
export const closeView = async () => {};
export const graniteEvent = { addEventListener: () => () => {} };
export const Accuracy = { High: 4 };
export const Device = { getLocation: Object.assign(async () => {
  if (params().has('slowLocation')) await new Promise(resolve => setTimeout(resolve, 1500));
  return { coords: { latitude: 37.5, longitude: 127 } };
}, {
  getPermission: async () => params().has('denyLocation') ? 'denied' : 'allowed',
  openPermissionDialog: async () => params().has('denyLocation') ? 'denied' : 'allowed',
}) };
export const loadFullScreenAd = Object.assign((options: { onEvent(event: { type: 'loaded' }): void; onError(error: unknown): void }) => {
  const timer = setTimeout(() => params().has('loadFail') ? options.onError(new Error('fixture load failure')) : options.onEvent({ type: 'loaded' }), 0);
  return () => clearTimeout(timer);
}, { isSupported: () => true });
export const showFullScreenAd = Object.assign((options: { onEvent(event: { type: string }): void; onError(error: unknown): void }) => {
  if (params().has('showFail')) { options.onError(new Error('fixture show failure')); return () => {}; }
  const overlay = document.createElement('div');
  overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-label', '테스트 전면 광고');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:white;display:grid;place-items:center';
  const button = document.createElement('button'); button.textContent = '테스트 광고 닫기';
  button.onclick = () => { overlay.remove(); options.onEvent({ type: 'dismissed' }); };
  overlay.append(button); document.body.append(overlay); options.onEvent({ type: 'show' });
  return () => overlay.remove();
}, { isSupported: () => true });
export const TossAds = {
  initialize: Object.assign((options: { callbacks: { onInitialized(): void } }) => options.callbacks.onInitialized(), { isSupported: () => true }),
  attachBanner: Object.assign((_id: string, target: HTMLElement, options: { callbacks: { onAdRendered(): void; onNoFill(): void } }) => {
    const timer = setTimeout(() => {
      if (params().has('noFill')) { options.callbacks.onNoFill(); return; }
      target.textContent = 'Ad · 테스트 배너';
      target.style.cssText = 'background:#f2f4f6;display:grid;place-items:center';
      options.callbacks.onAdRendered();
    }, 0);
    return { destroy: () => { clearTimeout(timer); target.replaceChildren(); } };
  }, { isSupported: () => true }),
};
