import React, { useState, useEffect, useCallback } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonSpinner,
  IonBadge,
  useIonViewDidEnter
} from '@ionic/react';
import { useParams, useNavigate } from 'react-router-dom';
import { locationOutline, fitnessOutline, chevronForwardOutline } from 'ionicons/icons';
import { getSiteDetail, SiteDetail as SiteDetailType, InstallationItem } from '../services/siteService';

export const SiteDetail: React.FC = () => {
  const { siteId } = useParams<{ siteId?: string }>();
  const navigate = useNavigate();

  const [site, setSite] = useState<SiteDetailType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 지점 상세 및 보유 운동기구 정보 불러오기
  const loadSiteDetail = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getSiteDetail(siteId);
      if (data) {
        setSite(data);
      } else {
        setError('지점 정보를 찾을 수 없습니다.');
      }
    } catch (err) {
      console.error('[SiteDetail] 데이터 로드 오류:', err);
      setError('지점 상세 정보를 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    void loadSiteDetail();
  }, [loadSiteDetail]);

  useIonViewDidEnter(() => {
    loadSiteDetail();
  });

  // 운동기구 상세 페이지로 이동
  const handleEquipmentClick = (equipment: InstallationItem) => {
    if (!site) return;

    // 통계 전송은 수집 정책 확정 전까지 비활성화한다.
    navigate(`/sites/${site.id}/equipment/${equipment.installationId}`);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" text="지도" />
          </IonButtons>
          <IonTitle>{site?.name || '지점 상세 정보'}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {/* 로딩 표시 */}
        {loading && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '50vh',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <IonSpinner name="crescent" color="primary" />
            <p style={{ color: '#666', fontSize: '14px' }}>지점 상세 정보를 불러오는 중입니다...</p>
          </div>
        )}

        {/* 에러 발생 안내 */}
        {error && !loading && (
          <div style={{ textAlign: 'center', marginTop: '40px', padding: '20px' }}>
            <p style={{ color: '#e53935', fontWeight: 'bold' }}>{error}</p>
          </div>
        )}

        {/* 지점 상세 정보 및 운동기구 목록 */}
        {site && !loading && (
          <>
            {/* 1. 지점 대표 사진 */}
            {site.site_image_path && (
              <div
                style={{
                  width: '100%',
                  height: '200px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  marginBottom: '16px'
                }}
              >
                <img
                  src={site.site_image_path}
                  alt={site.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* 2. 지점 기본 정보 카드 */}
            <IonCard style={{ margin: 0, marginBottom: '20px', borderRadius: '12px' }}>
              <IonCardHeader>
                <IonCardTitle style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                  {site.name}
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <p
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#555',
                    marginBottom: '8px'
                  }}
                >
                  <IonIcon icon={locationOutline} color="primary" />
                  <span>{site.address_text || '주소 정보 없음'}</span>
                </p>
                {site.amenity_note && (
                  <p
                    style={{
                      color: '#666',
                      fontSize: '0.9rem',
                      lineHeight: '1.5',
                      marginTop: '8px'
                    }}
                  >
                    📌 <strong>위치안내:</strong> {site.amenity_note}
                  </p>
                )}
                {site.last_verified_at && (
                  <p style={{ fontSize: '12px', color: '#888', marginTop: '12px' }}>
                    🗓️ 현장 확인일: {site.last_verified_at}
                  </p>
                )}
              </IonCardContent>
            </IonCard>

            {/* 3. 보유 운동기구 목록 섹션 */}
            <h3
              style={{
                fontSize: '1.1rem',
                fontWeight: 'bold',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <IonIcon icon={fitnessOutline} color="primary" />
              보유 운동기구 ({site.equipments?.length || 0}개)
            </h3>

            {!site.equipments || site.equipments.length === 0 ? (
              <p
                style={{
                  color: '#888',
                  fontSize: '0.9rem',
                  textAlign: 'center',
                  padding: '20px 0'
                }}
              >
                등록된 운동기구가 없습니다.
              </p>
            ) : (
              <IonList style={{ borderRadius: '12px', overflow: 'hidden' }}>
                {site.equipments.map((eq: InstallationItem) => (
                  <IonItem
                    key={eq.installationId}
                    button
                    detail={false}
                    onClick={() => handleEquipmentClick(eq)}
                    style={{ '--padding-start': '16px', '--padding-end': '16px' }}
                  >
                    {eq.default_image_path && (
                      <div
                        slot="start"
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          backgroundColor: '#f0f0f0'
                        }}
                      >
                        <img
                          src={eq.default_image_path}
                          alt={eq.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    )}
                    <IonLabel>
                      <h2 style={{ fontWeight: 'bold', fontSize: '1rem' }}>{eq.name}</h2>
                      {eq.model_name && (
                        <p style={{ fontSize: '0.8rem', color: '#777' }}>모델명: {eq.model_name}</p>
                      )}
                    </IonLabel>
                    <IonBadge slot="end" color="primary" style={{ marginRight: '8px' }}>
                      {eq.quantity}대
                    </IonBadge>
                    <IonIcon slot="end" icon={chevronForwardOutline} color="medium" />
                  </IonItem>
                ))}
              </IonList>
            )}
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default SiteDetail;
