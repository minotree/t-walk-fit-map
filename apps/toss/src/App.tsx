import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Button } from '@toss/tds-mobile';
import { closeView, graniteEvent, SafeArea } from '@apps-in-toss/web-framework';
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import type { Coordinates, EquipmentDetail, SiteDetail, SiteSummary, UserProfile, MapBounds, BoundedSites } from '@walk-fit/contracts';
import { Banner } from './components/Banner';
import { FacilityMap } from './components/FacilityMap';
import { Profile } from './components/Profile';
import { Photo } from './components/Photo';
import { hasConnection, locationProvider, profiles, sites, recordEquipmentView } from './services/platform';
import { makeInterstitial } from './services/ads';
import { sortVisibleSites } from './services/mapSites';

function useResource<T>(load: () => Promise<T>, missing: string) {
  const [state, setState] = useState<{ loading: boolean; value?: T; error: string }>({ loading: true, error: '' });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setState({ loading: true, error: '' });
    if (!hasConnection) {
      setState({ loading: false, error: '시설 정보를 연결하지 못했어요. 잠시 후 다시 시도해 주세요.' });
      return;
    }
    void load().then(value => {
      if (active) setState({ loading: false, value, error: value == null ? missing : '' });
    }).catch(() => { if (active) setState({ loading: false, error: '정보를 불러오지 못했어요. 다시 시도해 주세요.' }); });
    return () => { active = false; };
  }, [load, missing, revision]);
  return { ...state, retry: () => setRevision(value => value + 1) };
}

function Status({ loading, error, retry }: { loading: boolean; error: string; retry(): void }) {
  return loading ? <p role="status" className="status">정보를 불러오고 있어요.</p> : error ?
    <div className="status"><p role="alert">{error}</p><Button variant="weak" onClick={retry}>다시 시도</Button></div> : null;
}

function Home({ center, userLocation, onSelect, onLocate, message }: {
  message: string;
  center: Coordinates | null; userLocation: Coordinates | null; onSelect(site: SiteSummary): void; onLocate(): void;
}) {
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: BoundedSites; error: string }>({ key: '', error: '' });
  const [page, setPage] = useState({ key: '', count: 20 });
  const key = JSON.stringify(bounds);
  const updateBounds = useCallback((value: MapBounds) => {
    const rounded = { west: +value.west.toFixed(6), south: +value.south.toFixed(6),
      east: +value.east.toFixed(6), north: +value.north.toFixed(6) };
    setBounds(previous => JSON.stringify(previous) === JSON.stringify(rounded) ? previous : rounded);
  }, []);
  useEffect(() => {
    if (!bounds) return;
    let active = true;
    setResult(previous => ({ key, data: previous.data, error: '' }));
    const timer = setTimeout(() => {
      if (!hasConnection) { setResult({ key, error: '시설 정보를 연결하지 못했어요. 잠시 후 다시 시도해 주세요.' }); return; }
      void sites.getPublishedSitesInBounds(bounds).then(data => {
        if (active) setResult({ key, data, error: '' });
      }).catch(() => {
        if (active) setResult({ key, error: '정보를 불러오지 못했어요. 다시 시도해 주세요.' });
      });
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [bounds, key, revision]);
  const current = result.key === key ? result : undefined;
  const visible = bounds && current?.data ? sortVisibleSites(current.data.sites, bounds) : [];
  const count = page.key === key ? page.count : 20;
  return <div className="home-map">
    <div className="map-frame">
    <FacilityMap sites={visible} center={center} userLocation={userLocation} onBoundsChange={updateBounds} onSelect={id => {
      const site = visible.find(item => item.id === id); if (site) onSelect(site);
    }} />
    <div className="map-location"><Button size="small" variant="weak" onClick={onLocate} aria-label="현재 위치로 이동">현재 위치</Button></div>
    <div className="map-status">
      {message && <p role="status" className="location-message">{message}</p>}
      <Status loading={!current?.data && !current?.error} error={current?.error ?? ''} retry={() => setRevision(value => value + 1)} />
      {current?.data?.tooMany && <p role="status">지점이 많아요. 지도를 확대해 주세요.</p>}
      {current?.data && !current.data.tooMany && !visible.length && <p role="status">현재 지도 범위에 공개 운동시설이 없어요.</p>}
    </div>
    </div>
    <details className="facility-options"><summary style={{ visibility: current?.data ? 'visible' : 'hidden' }}>목록으로 보기 <span>({visible.length}곳)</span></summary>
      <section className="content facility-list" aria-label="현재 지도 범위의 운동시설 목록">
        <p className="muted">지도 중심에서 가까운 순</p>
        {visible.slice(0, count).map(site => <Button key={site.id} display="full" variant="weak" onClick={() => onSelect(site)}>{site.name}</Button>)}
        {visible.length > count && <Button variant="weak" onClick={() => setPage({ key, count: count + 20 })}>더 보기</Button>}
      </section>
    </details>
  </div>;
}
function SitePage() {
  const { siteId = '' } = useParams();
  const load = useCallback(() => sites.getSiteDetail(siteId), [siteId]);
  const state = useResource<SiteDetail | null>(load, '지점 정보를 찾을 수 없어요.');
  const site = state.value;
  return <><Status {...state} />{site && <article className="content">
    <h1>{site.name}</h1><Photo key={site.site_image_path} src={site.site_image_path} alt={`${site.name} 현장 사진`} />
    <p className="site-address">{site.address_text || '주소 정보 없음'}</p>{site.amenity_note && <p className="site-note">{site.amenity_note}</p>}
    <dl className="amenities"><dt>화장실</dt><dd>{amenity(site.toilet_status)}</dd><dt>음수대</dt><dd>{amenity(site.drinking_water_status)}</dd></dl>
    {site.last_verified_at && <p className="muted">현장 확인일 {site.last_verified_at}</p>}
    <h2>보유 운동기구 {site.equipments.length}개</h2>
    {site.equipments.length ? <ul className="equipment-list">{site.equipments.map(item => <li key={item.installationId}>
      <Link className="equipment-link" to={`/sites/${encodeURIComponent(site.id)}/equipment/${encodeURIComponent(item.installationId)}`} onClick={() => {
        void recordEquipmentView(site.id, item.installationId).catch(() => {
          console.warn('[statistics] 기구 조회 통계를 저장하지 못했습니다.');
        });
      }}>
        <span>{item.name}<small>{item.model_name}</small></span><span>{item.quantity}대 ›</span>
      </Link></li>)}</ul> : <p>등록된 운동기구가 없어요.</p>}
  </article>}</>;
}

function amenity(value: string) { return value === 'yes' ? '있음' : value === 'no' ? '없음' : '미확인'; }

function EquipmentPage() {
  const { siteId = '', installationId = '' } = useParams();
  const load = useCallback(() => sites.getEquipmentDetail(siteId, installationId), [siteId, installationId]);
  const state = useResource<EquipmentDetail | null>(load, '기구 정보를 찾을 수 없어요.');
  const item = state.value;
  return <><Status {...state} />{item && <article className="content">
    <p className="equipment-site">{item.siteName}</p><h1>{item.equipmentName}</h1>
    <Photo key={item.default_image_path} src={item.default_image_path} alt={item.equipmentName} />
    {item.model_name && <p className="equipment-model">모델 <span>{item.model_name}</span></p>}
    <div className="exercise-sections">
      <section className="exercise-card"><h2>운동 방법</h2><p className="description">{item.instructions}</p></section>
      <section className="exercise-card"><h2>운동 효과</h2><p className="description">{item.effects}</p></section>
      {item.precautions && <section className="exercise-card exercise-caution"><h2>주의사항</h2><p className="description">{item.precautions}</p></section>}
    </div>
    {item.source_reference && <p className="equipment-source">출처: {item.source_reference}</p>}
  </article>}</>;
}

export default function App() {
  const navigate = useNavigate();
  const route = useLocation();
  const [profile, setProfile] = useState<UserProfile>();
  const [profileOpen, setProfileOpen] = useState(false);
  const [center, setCenter] = useState<Coordinates | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [locationMessage, setLocationMessage] = useState('');
  const [selecting, setSelecting] = useState(false);
  const [insets, setInsets] = useState({ top: 0, bottom: 0, left: 0, right: 0 });
  const ads = useRef<ReturnType<typeof makeInterstitial>>();
  const selection = useRef(false);
  const locationRequest = useRef(0);
  const screen = route.pathname.includes('/equipment/') ? 'equipment' : route.pathname.startsWith('/sites/') ? 'site' : 'home';

  const locate = useCallback(async () => {
    const request = ++locationRequest.current;
    setLocationMessage('현재 위치를 확인하고 있어요.');
    try {
      const value = await locationProvider.getCurrentLocation();
      if (request === locationRequest.current) { setCenter(null); setUserLocation(value); setLocationMessage(''); }
    } catch { if (request === locationRequest.current) setLocationMessage('위치를 확인하지 못했어요. 위치 권한을 확인해 주세요.'); }
  }, []);
  const cancelLocation = useCallback(() => { locationRequest.current++; }, []);

  useEffect(() => {
    let active = true;
    void profiles.getUserProfile().then(value => {
      if (!active) return;
      setProfile(value); setProfileOpen(!value.isConfigured);
      if (value.useCurrentLocation) void locate();
    });
    ads.current = makeInterstitial(); ads.current.preload();
    let stop: (() => void) | undefined;
    try {
      // 개발 도구의 가상 inset을 일반 브라우저 여백으로 적용하지 않는다.
      if (/TossApp\//.test(navigator.userAgent)) {
        setInsets(SafeArea.get()); stop = SafeArea.subscribe({ onEvent: setInsets });
      }
    }
    catch { /* 일반 브라우저에서는 CSS env()를 사용한다. */ }
    return () => { active = false; cancelLocation(); stop?.(); ads.current?.dispose(); };
  }, [locate, cancelLocation]);

  const back = useCallback(() => {
    if (screen === 'equipment') {
      const path = route.pathname.split('/equipment/')[0]; navigate(path);
    } else if (screen === 'site') navigate('/home');
    else { void closeView().catch(() => setLocationMessage('상단 닫기 버튼으로 앱을 종료해 주세요.')); }
  }, [screen, route.pathname, navigate]);
  useEffect(() => {
    try { return graniteEvent.addEventListener('backEvent', { onEvent: () => {
      if (profileOpen) setProfileOpen(false); else back();
    } }); } catch { return; }
  }, [back, profileOpen]);
  useEffect(() => { document.querySelector('.scroll-area')?.scrollTo(0, 0); }, [route.pathname]);

  const selectSite = async (site: SiteSummary) => {
    if (selection.current) return;
    selection.current = true; setSelecting(true);
    const from = window.location.pathname;
    try {
      const proceed = await ads.current?.beforeDetail();
      if (proceed !== false && window.location.pathname === from) {
        setCenter({ lat: site.latitude, lng: site.longitude });
        navigate(`/sites/${encodeURIComponent(site.id)}`);
      }
    } finally { selection.current = false; setSelecting(false); }
  };

  const style = { '--safe-bottom': `${insets.bottom}px`,
    '--safe-left': `${insets.left}px`, '--safe-right': `${insets.right}px` } as CSSProperties;
  return <div className="app-shell" style={style}>
    <header className="app-header">
      {screen !== 'home' && <Button size="small" variant="weak" onClick={back}>뒤로</Button>}
      <span>{screen === 'home' ? '산책로 운동시설' : screen === 'site' ? '지점 정보' : '운동기구'}</span>
      <Button size="small" variant="weak" onClick={() => setProfileOpen(true)}>프로필</Button>
    </header>
    <main className="scroll-area" aria-busy={selecting}>
      {screen !== 'home' && locationMessage && <p role="status" className="location-message">{locationMessage}</p>}
      <Routes>
        <Route path="/home" element={<Home message={selecting ? '지점 정보로 이동하고 있어요.' : locationMessage} center={center} userLocation={userLocation} onSelect={site => { void selectSite(site); }} onLocate={() => { void locate(); }} />} />
        <Route path="/sites/:siteId" element={<SitePage />} />
        <Route path="/sites/:siteId/equipment/:installationId" element={<EquipmentPage />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </main>
    <Banner key={screen} screen={screen} />
    {profileOpen && profile && <Profile initial={profile} onClose={() => setProfileOpen(false)} onSaved={value => {
      setProfile(value); setProfileOpen(false);
      if (value.useCurrentLocation) void locate();
      else { locationRequest.current++; setUserLocation(null); setLocationMessage(''); }
    }} />}
  </div>;
}
