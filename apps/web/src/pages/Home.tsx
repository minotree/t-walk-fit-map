import React, { useState, useEffect, useCallback } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonSpinner,
  useIonViewDidEnter
} from '@ionic/react';
import { personOutline } from 'ionicons/icons';
import { useNavigate } from 'react-router-dom';
import { UserProfileModal } from '../components/UserProfileModal';
import { getUserProfile } from '../services/userProfileService';
import { UserProfile } from '../types/userProfile';
import { VworldMap } from '../components/VworldMap';
import type { SiteSummary } from '@walk-fit/contracts';
import { getPublishedSites } from '../services/siteService';
import { browserLocationProvider } from '../services/locationService';

const LAST_SELECTED_SITE_KEY = 'LAST_SELECTED_SITE_CENTER';

export const Home: React.FC = () => {
  const navigate = useNavigate();

  // 1. 지점 목록 및 로딩 상태
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string>('📡 운동시설 정보를 불러오는 중입니다...');

  // 2. 개인정보 모달 및 현재 위치 상태
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // 3. 세션 스토리지에서 즉시 마지막 선택 지점 좌표 복원 (초기값 연동)
  const [targetCenter, setTargetCenter] = useState<{ lat: number; lng: number } | null>(() => {
    const saved = sessionStorage.getItem(LAST_SELECTED_SITE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed;
      } catch {
        return null;
      }
    }
    return null;
  });

  // 저장된 선택 지점 위치 다시 불러오기
  const loadLastSelectedCenter = () => {
    const saved = sessionStorage.getItem(LAST_SELECTED_SITE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTargetCenter(parsed);
      } catch (err) {
        console.error('[Home] 선택 지점 좌표 파싱 실패:', err);
      }
    }
  };

  // 플랫폼 위치 조회는 웹 어댑터를 통해 실행한다.
  const fetchCurrentLocation = () => {
    void browserLocationProvider.getCurrentLocation().then(setUserLocation).catch(() => {
      console.warn('[Home] 현재 위치를 확인할 수 없습니다. 위치 권한과 기기 설정을 확인해 주세요.');
    });
  };
  // 데이터 로드 통합 함수
  const loadData = useCallback(async () => {
    const profile = await getUserProfile();
    setUserProfile(profile);

    if (!profile.isConfigured) {
      setIsModalOpen(true);
    }

    if (profile.useCurrentLocation) {
      fetchCurrentLocation();
    } else {
      setUserLocation(null);
    }

    setLoading(true);
    setStatusMessage('📡 운동시설 정보를 불러오는 중입니다...');
    try {
      const data = await getPublishedSites();
      setSites(data);
      if (data.length === 0) {
        setStatusMessage('⚠️ 등록된 공개 운동시설이 없습니다.');
      } else {
        setStatusMessage(`✅ ${data.length}개의 운동시설을 불러왔습니다.`);
      }
    } catch (err) {
      console.error('[Home] 지점 목록 로드 실패:', err);
      setStatusMessage('❌ 운동시설 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Ionic 페이지 뒤로가기 재진입 시 세션 스토리지 좌표 재불러오기
  useIonViewDidEnter(() => {
    loadData();
    loadLastSelectedCenter();
  });

  // 지도 마커 클릭 시 선택 지점 좌표 세션 저장 후 이동
  const handleSelectSite = (siteId: string) => {

    // 타입(string vs number)에 상관없이 매칭되도록 String 비교 처리
    const selected = sites.find((s) => String(s.id) === String(siteId));
    if (selected) {
      const centerCoords = { lat: selected.latitude, lng: selected.longitude };
      sessionStorage.setItem(LAST_SELECTED_SITE_KEY, JSON.stringify(centerCoords));
      setTargetCenter(centerCoords);
    } else {
      console.warn('[Home] 클릭한 지점 ID에 해당하는 좌표를 찾지 못함:', siteId);
    }

    navigate(`/sites/${siteId}`);
  };

  // 모달 저장 성공 콜백
  const handleSaveSuccess = (updatedProfile: UserProfile) => {
    setUserProfile(updatedProfile);
    if (updatedProfile.useCurrentLocation) {
      fetchCurrentLocation();
    } else {
      setUserLocation(null);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Walk Fit Map</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setIsModalOpen(true)}>
              <IonIcon slot="icon-only" icon={personOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          {/* 상단 상태 안내 박스 */}
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              zIndex: 1000,
              background: 'rgba(255, 255, 255, 0.95)',
              padding: '8px 14px',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '13px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              border: '1px solid #ddd',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              maxWidth: 'calc(100% - 24px)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {loading && <IonSpinner name="crescent" style={{ width: '16px', height: '16px' }} />}
              <span>{statusMessage}</span>
            </div>
            {userProfile?.isConfigured && (
              <div style={{ fontSize: '11px', color: '#666', fontWeight: 'normal', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>📍 지역: {userProfile.region || '미설정'}</span>
                {userProfile.useCurrentLocation && (
                  <span style={{ color: '#1a73e8', fontWeight: 'bold' }}>(🔵 현위치)</span>
                )}
              </div>
            )}
          </div>

          {/* Vworld 지도 컴포넌트 */}
          <VworldMap
            sites={sites}
            onSelectSite={handleSelectSite}
            userLocation={userLocation}
            targetCenter={targetCenter}
          />
        </div>
      </IonContent>

      <UserProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaveSuccess={handleSaveSuccess}
      />
    </IonPage>
  );
};

export default Home;
