export interface SiteSummary {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface SiteDetail {
  id: string;
  name: string;
  address_text: string;
  toilet_status: 'yes' | 'no' | 'unknown';
  drinking_water_status: 'yes' | 'no' | 'unknown';
  amenity_note: string;
  last_verified_at: string | null;
  survey_location_id?: string | null;
  site_image_path?: string | null; // 공개 지점 RPC에서 조사 우선순위를 적용하고 변환한 표시용 URL
  equipments: InstallationItem[];
}

export interface InstallationItem {
  installationId: string;
  quantity: number;
  display_order: number;
  equipmentId: string;
  name: string;
  model_name: string;
  default_image_path: string | null;
}

export interface EquipmentDetail {
  installationId: string;
  siteId: string;
  siteName: string;
  equipmentName: string;
  model_name: string;
  quantity: number;
  site_image_path: string | null;
  default_image_path: string | null;
  instructions: string;
  effects: string;
  precautions: string;
  source_reference: string;
}


export interface UserProfile {
  birthYear: number | null;     // 출생 연도 (예: 1990)
  gender: 'M' | 'F' | 'NONE';  // 성별 (남성 / 여성 / 선택 안 함)
  region: string;              // 거주 지역 (예: "서울특별시 중랑구")
  useCurrentLocation: boolean; // 현 위치 지도 표시 사용 여부
  isConfigured: boolean;       // 최초 프로필 설정 완료 여부
  statisticsConsent?: boolean;
  statisticsConsentVersion?: string;
}
export interface SiteRepository {
  getPublishedSites(): Promise<SiteSummary[]>;
  getPublishedSitesInBounds(bounds: MapBounds): Promise<BoundedSites>;
  getSiteDetail(siteId: string): Promise<SiteDetail | null>;
  getEquipmentDetail(siteId: string, installationId: string): Promise<EquipmentDetail | null>;
}

export interface MapBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface BoundedSites {
  sites: SiteSummary[];
  tooMany: boolean;
}

export interface ProfileStorage {
  get(): Promise<string | null>;
  set(value: string): Promise<void>;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationProvider {
  getCurrentLocation(): Promise<Coordinates>;
}
