import { useState } from 'react';
import { IonSpinner } from '@ionic/react';

export function SitePhoto({ src, name }: { src?: string | null; name: string }) {
  return src ? <SitePhotoImage key={src} src={src} name={name} />
    : <p style={{ color: '#666' }}>등록된 현장 사진이 없습니다.</p>;
}

function SitePhotoImage({ src, name }: { src: string; name: string }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  return (
    <div style={{ width: '100%', minHeight: '200px', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
      {status === 'loading' && <div role="status"><IonSpinner name="crescent" /> 현장 사진을 불러오는 중입니다...</div>}
      {status === 'error' && <p role="status">현장 사진을 불러오지 못했습니다.</p>}
      <img src={src} alt={`${name} 현장 사진`}
        style={{ width: '100%', height: '200px', objectFit: 'cover', display: status === 'loaded' ? 'block' : 'none' }}
        onLoad={() => setStatus('loaded')} onError={() => setStatus('error')} />
    </div>
  );
}
