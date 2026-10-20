export type AdState = 'idle' | 'loading' | 'ready' | 'showing' | 'unavailable';
export interface FullScreenAds {
  supported(): boolean;
  load(ready: () => void, failed: () => void): () => void;
  show(shown: () => void, finished: () => void): () => void;
}

/** 광고 미준비는 이동을 지연하지 않는다. 표시 후에는 닫힘/실패 이벤트를 기다린다. */
export function createInterstitial(ads: FullScreenAds, intervalMs: number, now = Date.now, onShown?: (time: number) => void) {
  let state: AdState = 'idle';
  let lastShown: number | null = null;
  let unsubscribeLoad: (() => void) | undefined;
  let unsubscribeShow: (() => void) | undefined;
  let loadTimer: ReturnType<typeof setTimeout> | undefined;
  let requestTimer: ReturnType<typeof setTimeout> | undefined;
  let generation = 0;
  let pendingResolve: (() => void) | undefined;
  let disposed = false;

  function preload() {
    if (disposed || state === 'loading' || state === 'ready' || state === 'showing') return;
    if (!ads.supported()) { state = 'unavailable'; return; }
    unsubscribeLoad?.();
    clearTimeout(loadTimer);
    const current = ++generation;
    state = 'loading';
    const settle = (next: AdState) => {
      if (disposed || current !== generation || state !== 'loading') return;
      state = next;
      clearTimeout(loadTimer);
    };
    loadTimer = setTimeout(() => settle('unavailable'), 10_000);
    try {
      unsubscribeLoad = ads.load(() => settle('ready'), () => settle('unavailable'));
    } catch { settle('unavailable'); }
  }

  async function beforeDetail(): Promise<boolean> {
    if (disposed || state === 'showing') return false;
    if (state !== 'ready' || (lastShown !== null && now() - lastShown < intervalMs)) {
      preload();
      return true;
    }
    state = 'showing';
    await new Promise<void>(resolve => {
      let finished = false;
      let shown = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(requestTimer);
        pendingResolve = undefined;
        state = 'idle';
        resolve();
      };
      pendingResolve = finish;
      // 표시 요청 자체가 응답하지 않을 때만 빠져나온다. 재생 길이를 강제로 제한하지 않는다.
      requestTimer = setTimeout(() => { if (!shown) finish(); }, 10_000);
      try {
        unsubscribeShow = ads.show(() => {
          if (finished || disposed) return;
          shown = true;
          clearTimeout(requestTimer);
          lastShown = now();
          onShown?.(lastShown);
        }, finish);
      } catch { finish(); }
    });
    unsubscribeShow?.();
    unsubscribeShow = undefined;
    preload();
    return !disposed;
  }

  return {
    preload, beforeDetail,
    getState: () => state,
    restoreLastShown(time: number) {
      if (Number.isFinite(time) && time > 0) lastShown = Math.min(time, now());
    },
    dispose() {
      disposed = true;
      generation++;
      clearTimeout(loadTimer);
      clearTimeout(requestTimer);
      unsubscribeLoad?.();
      unsubscribeShow?.();
      pendingResolve?.();
    },
  };
}
