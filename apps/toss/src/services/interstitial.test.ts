import { afterEach, expect, test, vi } from 'vitest';
import { createInterstitial, type FullScreenAds } from './interstitial';

afterEach(() => vi.useRealTimers());
function setup(options: { ready?: boolean; supported?: boolean } = {}) {
  let ready: () => void = () => {};
  let fail: () => void = () => {};
  let shown: () => void = () => {};
  let finish: () => void = () => {};
  const stop = vi.fn();
  const ads: FullScreenAds = {
    supported: () => options.supported !== false,
    load: vi.fn((loaded, failed) => { ready = loaded; fail = failed; return stop; }),
    show: vi.fn((onShow, onFinish) => { shown = onShow; finish = onFinish; return stop; }),
  };
  const controller = createInterstitial(ads, 120_000);
  controller.preload();
  if (options.ready !== false) ready();
  return { ads, controller, ready: () => ready(), fail: () => fail(), shown: () => shown(), finish: () => finish(), stop };
}

test('첫 선택에서 준비된 광고를 표시하고 닫힐 때까지 상세 이동을 기다린다', async () => {
  const s = setup(); const pending = s.controller.beforeDetail();
  expect(s.controller.getState()).toBe('showing');
  s.shown(); s.finish();
  expect(await pending).toBe(true); expect(s.ads.show).toHaveBeenCalledTimes(1); s.controller.dispose();
});

test('실제 표시 후 2분 동안 생략하고 2분 경과 시 다시 표시한다', async () => {
  vi.useFakeTimers(); const s = setup();
  const first = s.controller.beforeDetail(); s.shown(); s.finish(); await first; s.ready();
  await vi.advanceTimersByTimeAsync(119_999);
  expect(await s.controller.beforeDetail()).toBe(true); expect(s.ads.show).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1);
  const second = s.controller.beforeDetail(); s.shown(); s.finish(); await second;
  expect(s.ads.show).toHaveBeenCalledTimes(2); s.controller.dispose();
});

test('광고가 로딩 중이면 기다리지 않고 상세로 이동한다', async () => {
  const s = setup({ ready: false }); expect(await s.controller.beforeDetail()).toBe(true);
  expect(s.ads.show).not.toHaveBeenCalled(); s.controller.dispose();
});

test('로드 실패·미지원은 상세 이동을 막지 않는다', async () => {
  for (const supported of [true, false]) {
    const s = setup({ ready: false, supported }); s.fail();
    expect(await s.controller.beforeDetail()).toBe(true); expect(s.ads.show).not.toHaveBeenCalled(); s.controller.dispose();
  }
});

test('광고 표시 실패도 상세 이동을 완료한다', async () => {
  const s = setup(); const pending = s.controller.beforeDetail(); s.finish();
  expect(await pending).toBe(true); s.controller.dispose();
});

test('광고 중 중복 선택은 상세 이동을 추가 실행하지 않는다', async () => {
  const s = setup(); const pending = s.controller.beforeDetail();
  expect(await s.controller.beforeDetail()).toBe(false); s.finish(); await pending;
  expect(s.ads.show).toHaveBeenCalledTimes(1); s.controller.dispose();
});

test('표시 요청 응답이 없으면 10초 후 이동하되 재생 중인 광고는 제한하지 않는다', async () => {
  vi.useFakeTimers(); const s = setup(); const pending = s.controller.beforeDetail();
  await vi.advanceTimersByTimeAsync(10_000); expect(await pending).toBe(true); s.ready();
  let settled = false; const playing = s.controller.beforeDetail().then(() => { settled = true; });
  s.shown(); await vi.advanceTimersByTimeAsync(180_000); expect(settled).toBe(false);
  s.finish(); await playing; s.controller.dispose();
});

test('화면 종료 시 정리하고 뒤늦은 완료로 이동하지 않는다', async () => {
  const s = setup(); const pending = s.controller.beforeDetail(); s.controller.dispose();
  expect(await pending).toBe(false); s.finish(); expect(s.stop).toHaveBeenCalled();
});

test('준비 타임아웃 뒤의 오래된 콜백은 상태를 덮어쓰지 않는다', async () => {
  vi.useFakeTimers(); const s = setup({ ready: false });
  await vi.advanceTimersByTimeAsync(10_000); s.ready();
  expect(s.controller.getState()).toBe('unavailable'); s.controller.dispose();
});

test('이전 세션의 광고 시각을 복원하면 2분 이내 노출을 생략한다', async () => {
  const s = setup(); s.controller.restoreLastShown(Date.now() - 30_000);
  expect(await s.controller.beforeDetail()).toBe(true); expect(s.ads.show).not.toHaveBeenCalled(); s.controller.dispose();
});
