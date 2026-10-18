import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonSpinner,
  IonCard,
  IonCardContent,
} from '@ionic/react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEquipmentDetail, EquipmentDetail } from '../services/siteService';

const EquipmentDetailPage: React.FC = () => {
  const { siteId, installationId } = useParams<{ siteId?: string; installationId?: string }>();
  const navigate = useNavigate();

  const [equipment, setEquipment] = useState<EquipmentDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 사진 대체 상태 관리: 'site' (현장) -> 'default' (공통) -> 'none' (준비 중)
  const [imageStage, setImageStage] = useState<'site' | 'default' | 'none'>('site');

  useEffect(() => {
    if (!siteId || !installationId) {
      setErrorMsg('유효하지 않은 접근입니다.');
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchDetail = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const data = await getEquipmentDetail(siteId, installationId);
        if (!isMounted) return;

        if (!data) {
          setErrorMsg('이 기구 정보를 현재 볼 수 없습니다.');
        } else {
          setEquipment(data);
          if (data.site_image_path) {
            setImageStage('site');
          } else if (data.default_image_path) {
            setImageStage('default');
          } else {
            setImageStage('none');
          }
        }
      } catch {
        if (isMounted) {
          setErrorMsg('운동기구 정보를 불러오지 못했습니다.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [siteId, installationId]);

  // 이미지 로딩 실패 시 다음 우선순위로 전환
  const handleImageError = () => {
    if (imageStage === 'site' && equipment?.default_image_path) {
      setImageStage('default');
    } else {
      setImageStage('none');
    }
  };

  // 이미지 URL 결정
  const getImageUrl = () => {
    if (imageStage === 'site' && equipment?.site_image_path) {
      return equipment.site_image_path;
    }
    if ((imageStage === 'site' || imageStage === 'default') && equipment?.default_image_path) {
      return equipment.default_image_path;
    }
    return null;
  };

  const currentImageUrl = getImageUrl();
  const backHref = siteId ? `/sites/${siteId}` : '/home';

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref={backHref} />
          </IonButtons>
          <IonTitle>{equipment?.equipmentName || '기구 상세'}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>
            <IonSpinner name="crescent" />
          </div>
        ) : errorMsg ? (
          <div style={{ textAlign: 'center', marginTop: '50px', color: '#666' }}>
            <p>{errorMsg}</p>
            <button
              onClick={() => navigate(backHref, { replace: true })}
              style={{ marginTop: '10px', padding: '8px 16px', background: '#3880ff', color: '#fff', border: 'none', borderRadius: '4px' }}
            >
              이전 화면으로 돌아가기
            </button>
          </div>
        ) : equipment ? (
          <div>
            {/* 상단 지점 및 모델 정보 */}
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '14px', color: '#666' }}>{equipment.siteName}</span>
              <h2 style={{ margin: '4px 0', fontSize: '20px', fontWeight: 'bold' }}>{equipment.equipmentName}</h2>
              {equipment.model_name && (
                <p style={{ margin: 0, fontSize: '14px', color: '#888' }}>모델명: {equipment.model_name}</p>
              )}
            </div>

            {/* 사진 영역 (우선순위: 현장 ➔ 공통 ➔ 준비 중) */}
            <div
              style={{
                width: '100%',
                height: '220px',
                backgroundColor: '#f2f2f2',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                marginBottom: '20px',
              }}
            >
              {currentImageUrl && imageStage !== 'none' ? (
                <img
                  src={currentImageUrl}
                  alt={equipment.equipmentName}
                  onError={handleImageError}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ color: '#888', fontSize: '14px', textAlign: 'center' }}>
                  <p style={{ margin: 0 }}>📸 사진 준비 중</p>
                </div>
              )}
            </div>

            {/* 운동 방법 카드 */}
            <IonCard style={{ margin: '0 0 16px 0' }}>
              <IonCardContent>
                <h3 style={{ fontWeight: 'bold', fontSize: '16px', color: '#333', marginBottom: '8px' }}>운동 방법</h3>
                <p style={{ whiteSpace: 'pre-line', lineHeight: '1.5', color: '#444', margin: 0 }}>
                  {equipment.instructions}
                </p>
              </IonCardContent>
            </IonCard>

            {/* 운동 효과 카드 */}
            <IonCard style={{ margin: '0 0 16px 0' }}>
              <IonCardContent>
                <h3 style={{ fontWeight: 'bold', fontSize: '16px', color: '#333', marginBottom: '8px' }}>운동 효과</h3>
                <p style={{ whiteSpace: 'pre-line', lineHeight: '1.5', color: '#444', margin: 0 }}>
                  {equipment.effects}
                </p>
              </IonCardContent>
            </IonCard>

            {/* 주의사항 카드 (존재할 경우에만 표시) */}
            {equipment.precautions && (
              <IonCard style={{ margin: '0 0 16px 0' }}>
                <IonCardContent>
                  <h3 style={{ fontWeight: 'bold', fontSize: '16px', color: '#eb445a', marginBottom: '8px' }}>주의사항</h3>
                  <p style={{ whiteSpace: 'pre-line', lineHeight: '1.5', color: '#444', margin: 0 }}>
                    {equipment.precautions}
                  </p>
                </IonCardContent>
              </IonCard>
            )}

            {/* 출처 참고 */}
            {equipment.source_reference && (
              <div style={{ fontSize: '12px', color: '#888', textAlign: 'right', marginTop: '10px' }}>
                설명 출처: {equipment.source_reference}
              </div>
            )}
          </div>
        ) : null}
      </IonContent>
    </IonPage>
  );
};

export default EquipmentDetailPage;