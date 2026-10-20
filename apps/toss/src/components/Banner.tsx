import { useEffect, useRef, useState } from 'react';
import { TossAds } from '@apps-in-toss/web-framework';
import { bannerId, initializeBanner } from '../services/ads';

export function Banner({ screen }: { screen: 'home' | 'site' | 'equipment' }) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let active = true;
    let slot: ReturnType<typeof TossAds.attachBanner> | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setVisible(false);
    const id = bannerId(screen);
    const hide = () => { if (active) setVisible(false); clearTimeout(timer); };
    if (id) {
      void initializeBanner().then(ready => {
        if (!active || !ready || !container.current) return;
        try {
          timer = setTimeout(hide, 10_000);
          slot = TossAds.attachBanner(id, container.current, {
            theme: 'auto', tone: 'blackAndWhite', variant: 'expanded',
            callbacks: {
              onAdRendered: () => { clearTimeout(timer); if (active) setVisible(true); },
              onNoFill: hide, onAdFailedToRender: hide,
            },
          });
        } catch { hide(); }
      });
    }
    return () => { active = false; clearTimeout(timer); slot?.destroy(); };
  }, [screen]);
  // 로딩 중에는 별도 영역에 정상 크기로 장착하고 렌더 완료 후 레이아웃에 포함한다.
  return <aside className={`banner ${visible ? 'banner-visible' : 'banner-pending'}`} aria-label="광고" aria-hidden={!visible}>
    <div ref={container} className="banner-slot" />
  </aside>;
}
