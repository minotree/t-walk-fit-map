import { useState } from 'react';

export function Photo({ src, alt }: { src?: string | null; alt: string }) {
  return src ? <PhotoImage key={src} src={src} alt={alt} /> : <p className="photo-empty">등록된 사진이 없어요.</p>;
}

function PhotoImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  if (failed) return <p className="photo-empty">사진을 불러오지 못했어요.</p>;
  return <div className="photo-frame" aria-busy={!loaded}>
    {!loaded && <p className="photo-loading" role="status">사진을 불러오고 있어요.</p>}
    <img className="photo" src={src} alt={alt} decoding="async"
      onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
  </div>;
}
