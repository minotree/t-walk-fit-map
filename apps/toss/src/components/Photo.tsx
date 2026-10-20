import { useState } from 'react';

export function Photo({ src, alt }: { src?: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? <img className="photo" src={src} alt={alt} onError={() => setFailed(true)} />
    : <p className="photo-empty">사진 준비 중</p>;
}
