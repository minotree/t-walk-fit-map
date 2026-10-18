export interface UserProfile {
  birthYear: number | null;     // 출생 연도 (예: 1990)
  gender: 'M' | 'F' | 'NONE';  // 성별 (남성 / 여성 / 선택 안 함)
  region: string;              // 거주 지역 (예: "서울특별시 중랑구")
  useCurrentLocation: boolean; // 현 위치 지도 표시 사용 여부
  isConfigured: boolean;       // 최초 프로필 설정 완료 여부
}