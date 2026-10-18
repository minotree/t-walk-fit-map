import React, { useState, useEffect } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonSegment,
  IonSegmentButton,
  IonButton,
  IonFooter,
  IonButtons,
  IonToggle
} from '@ionic/react';
import { UserProfile } from '../types/userProfile';
import { getUserProfile, saveUserProfile } from '../services/userProfileService';
import { KOREA_REGIONS } from '../data/koreaRegions';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess?: (profile: UserProfile) => void;
}

// 출생 연도 옵션 목록 생성 (1940년 ~ 현재 연도)
const currentYear = new Date().getFullYear();
const yearOptions = Array.from(
  { length: currentYear - 1940 + 1 },
  (_, i) => currentYear - i
);

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  onSaveSuccess
}) => {
  const [birthYear, setBirthYear] = useState<number | null>(null);
  const [gender, setGender] = useState<'M' | 'F' | 'NONE'>('NONE');

  // 2단계 거주 지역 상태
  const [selectedSido, setSelectedSido] = useState<string>('');
  const [selectedSigungu, setSelectedSigungu] = useState<string>('');
  const [sigunguOptions, setSigunguOptions] = useState<string[]>([]);

  const [useCurrentLocation, setUseCurrentLocation] = useState<boolean>(false);

  // 모달이 열릴 때 기존 프로필 불러오기 및 2단계 지역 분할 세팅
  useEffect(() => {
    if (isOpen) {
      getUserProfile().then((data) => {
        setBirthYear(data.birthYear);
        setGender(data.gender);
        setUseCurrentLocation(data.useCurrentLocation ?? false);

        // 기존 저장된 지역 문자열(예: "서울특별시 중랑구") 파싱
        if (data.region) {
          const parts = data.region.split(' ');
          const sidoName = parts[0] || '';
          const sigunguName = parts.slice(1).join(' ') || '';

          setSelectedSido(sidoName);

          const matchedRegion = KOREA_REGIONS.find((r) => r.sido === sidoName);
          if (matchedRegion) {
            setSigunguOptions(matchedRegion.sigungu);
            setSelectedSigungu(sigunguName);
          } else {
            setSigunguOptions([]);
            setSelectedSigungu('');
          }
        } else {
          setSelectedSido('');
          setSelectedSigungu('');
          setSigunguOptions([]);
        }
      });
    }
  }, [isOpen]);

  // 시/도 변경 이벤트 처리
  const handleSidoChange = (sidoName: string) => {
    setSelectedSido(sidoName);
    setSelectedSigungu(''); // 시/도가 바뀌면 시/군/구 초기화

    const matchedRegion = KOREA_REGIONS.find((r) => r.sido === sidoName);
    if (matchedRegion) {
      setSigunguOptions(matchedRegion.sigungu);
    } else {
      setSigunguOptions([]);
    }
  };

  // 저장 실행
  const handleSave = async () => {
    // 시/도 + 시/군/구 결합
    const combinedRegion = selectedSido
      ? selectedSigungu
        ? `${selectedSido} ${selectedSigungu}`
        : selectedSido
      : '';

    const savedProfile = await saveUserProfile({
      birthYear,
      gender,
      region: combinedRegion,
      useCurrentLocation
    });

    if (onSaveSuccess) {
      onSaveSuccess(savedProfile);
    }
    onClose();
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>간단 사용자 정보 입력</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>나중에</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '16px' }}>
          정보 입력은 선택 사항입니다. 프로필은 이 기기에만 저장되며 클릭 통계로 전송하지 않습니다. 현재 위치는 허용한 경우 지도 표시에 사용합니다.
        </p>

        {/* 1. 출생 연도 선택 */}
        <IonItem>
          <IonLabel position="stacked">출생 연도</IonLabel>
          <IonSelect
            value={birthYear}
            placeholder="연도 선택"
            onIonChange={(e) => setBirthYear(e.detail.value)}
          >
            {yearOptions.map((y) => (
              <IonSelectOption key={y} value={y}>
                {y}년
              </IonSelectOption>
            ))}
          </IonSelect>
        </IonItem>

        {/* 2. 성별 선택 */}
        <IonItem lines="none" style={{ marginTop: '16px' }}>
          <IonLabel position="stacked">성별</IonLabel>
        </IonItem>
        <IonSegment
          value={gender}
          onIonChange={(e) => setGender(e.detail.value as 'M' | 'F' | 'NONE')}
        >
          <IonSegmentButton value="M">
            <IonLabel>남성</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="F">
            <IonLabel>여성</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="NONE">
            <IonLabel>선택 안 함</IonLabel>
          </IonSegmentButton>
        </IonSegment>

        {/* 3. 거주 지역 선택 (2단계 드롭다운) */}
        <IonItem style={{ marginTop: '16px' }}>
          <IonLabel position="stacked">거주 지역 (시/도)</IonLabel>
          <IonSelect
            value={selectedSido}
            placeholder="시/도 선택"
            onIonChange={(e) => handleSidoChange(e.detail.value)}
          >
            {KOREA_REGIONS.map((r) => (
              <IonSelectOption key={r.sido} value={r.sido}>
                {r.sido}
              </IonSelectOption>
            ))}
          </IonSelect>
        </IonItem>

        <IonItem style={{ marginTop: '12px' }}>
          <IonLabel position="stacked">거주 지역 (시/군/구)</IonLabel>
          <IonSelect
            value={selectedSigungu}
            placeholder={selectedSido ? '시/군/구 선택' : '시/도를 먼저 선택해 주세요'}
            disabled={!selectedSido}
            onIonChange={(e) => setSelectedSigungu(e.detail.value)}
          >
            {sigunguOptions.map((sg) => (
              <IonSelectOption key={sg} value={sg}>
                {sg}
              </IonSelectOption>
            ))}
          </IonSelect>
        </IonItem>

        {/* 4. 현 위치 사용 스위치 */}
        <IonItem style={{ marginTop: '16px' }}>
          <IonLabel>지도상 현 위치 표시 사용</IonLabel>
          <IonToggle
            checked={useCurrentLocation}
            onIonChange={(e) => setUseCurrentLocation(e.detail.checked)}
          />
        </IonItem>
      </IonContent>

      <IonFooter className="ion-padding">
        <IonButton expand="block" onClick={handleSave}>
          저장하기
        </IonButton>
      </IonFooter>
    </IonModal>
  );
};

export default UserProfileModal;