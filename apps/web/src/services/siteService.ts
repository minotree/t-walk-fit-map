import { supabase, requireSupabase } from '../lib/supabaseClient';
import type { SiteSummary } from '@walk-fit/contracts';

// -------------------------------------------------------------------
// 1. 도메인 타입 정의
// -------------------------------------------------------------------

export interface SiteDetail {
  id: string;
  name: string;
  address_text: string;
  toilet_status: 'yes' | 'no' | 'unknown';
  drinking_water_status: 'yes' | 'no' | 'unknown';
  amenity_note: string;
  last_verified_at: string | null;
  survey_location_id?: string | null;
  site_image_path?: string | null; // <-- exercise_sites의 지점 대표 이미지 URL 또는 경로
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

// -------------------------------------------------------------------
// 2. 서비스 함수 구현
// -------------------------------------------------------------------

/**
 * [S01 지도] 공개 지점 목록 조회
 */
export async function getPublishedSites(): Promise<SiteSummary[]> {
  requireSupabase();
  try {
    const { data, error } = await supabase
      .from('exercise_sites')
      .select('id, name, latitude, longitude')
      .eq('is_published', true);

    if (error || !data) {
      console.error('[siteService] 공개 지점 조회 실패:', error);
      throw new Error('공개 시설 조회 실패');
    }

    return data.map((site) => ({
      id: site.id,
      name: site.name,
      latitude: Number(site.latitude),
      longitude: Number(site.longitude),
    }));
  } catch (err) {
    console.error('[siteService] getPublishedSites 예외:', err);
    throw err;
  }
}

/**
 * [S02 지점 상세] - 특정 지점 및 설치된 기구 목록 조회
 */
export async function getSiteDetail(siteId: string): Promise<SiteDetail | null> {
  try {

    // 1. 지점 기본 정보 조회 (exercise_sites 단독 조회)
    const { data: siteData, error: siteError } = await supabase
      .from('exercise_sites')
      .select('*')
      .eq('id', siteId)
      .eq('is_published', true)
      .maybeSingle();

    if (siteError || !siteData) {
      console.error('[siteService] ❌ 지점 조회 실패:', siteError);
      return null;
    }

    // 2. 지점 대표 이미지 경로 처리 (Supabase Storage 퍼블릭 URL 변환)
    let finalSiteImagePath: string | null = null;
    const rawImagePath = siteData.site_image_path;

    if (rawImagePath) {
      if (rawImagePath.startsWith('http://') || rawImagePath.startsWith('https://')) {
        finalSiteImagePath = rawImagePath;
      } else {
        // 💡 핵심 수정: 현장 사진이 저장된 'survey-photos' 버킷을 기준으로 퍼블릭 URL 생성
        const { data: urlData } = supabase.storage
          .from('survey-photos')
          .getPublicUrl(rawImagePath);

        finalSiteImagePath = urlData?.publicUrl || null;
      }
    }

    // 3. site_equipment 조회 (외래키 관계를 통한 카탈로그 정보 조인)
    const { data: eqData, error: eqError } = await supabase
      .from('site_equipment')
      .select(`
        id,
        quantity,
        display_order,
        is_published,
        equipment_id,
        equipment_catalog (
          id,
          name,
          model_name,
          default_image_path
        )
      `)
      .eq('site_id', siteId)
      .eq('is_published', true)
      .order('display_order', { ascending: true });

    if (eqError) {
      console.error('[siteService] ⚠️ 설치 기구 조회 에러:', eqError);
    }

    const rawEquipments = eqData || [];
    const equipments: InstallationItem[] = rawEquipments.map((item) => {
      const catalog = Array.isArray(item.equipment_catalog)
        ? item.equipment_catalog[0]
        : item.equipment_catalog;

      return {
        installationId: item.id,
        quantity: item.quantity || 1,
        display_order: item.display_order || 0,
        equipmentId: item.equipment_id || catalog?.id || '',
        name: catalog?.name || '운동기구',
        model_name: catalog?.model_name || '',
        default_image_path: catalog?.default_image_path || null,
      };
    });

    return {
      id: siteData.id,
      name: siteData.name,
      address_text: siteData.address_text || '',
      toilet_status: siteData.toilet_status || 'unknown',
      drinking_water_status: siteData.drinking_water_status || 'unknown',
      amenity_note: siteData.amenity_note || '',
      last_verified_at: siteData.last_verified_at,
      survey_location_id: siteData.survey_location_id,
      site_image_path: finalSiteImagePath, // 변환된 퍼블릭 URL 적용
      equipments,
    };
  } catch (err) {
    console.error('[siteService] ❌ getSiteDetail 예외:', err);
    return null;
  }
}

/**
 * [S03 기구 상세] - 특정 설치 기구 상세 및 운동 방법 조회
 */
export async function getEquipmentDetail(
  siteId: string,
  installationId: string
): Promise<EquipmentDetail | null> {
  try {

    const { data, error } = await supabase
      .from('site_equipment')
      .select(`
        id,
        site_id,
        quantity,
        is_published,
        exercise_sites (
          id,
          name,
          is_published
        ),
        equipment_catalog (
          id,
          name,
          model_name,
          default_image_path,
          instructions,
          effects,
          precautions,
          source_reference
        )
      `)
      .eq('id', installationId)
      .eq('site_id', siteId)
      .eq('is_published', true)
      .maybeSingle();

    if (error || !data) {
      console.error('[siteService] ❌ 기구 상세 조회 실패:', error);
      return null;
    }

    const site = Array.isArray(data.exercise_sites) ? data.exercise_sites[0] : data.exercise_sites;
    const catalog = Array.isArray(data.equipment_catalog)
      ? data.equipment_catalog[0]
      : data.equipment_catalog;

    if (!site?.is_published) {
      return null;
    }

    return {
      installationId: data.id,
      siteId: data.site_id,
      siteName: site?.name || '운동시설',
      equipmentName: catalog?.name || '운동기구',
      model_name: catalog?.model_name || '',
      quantity: data.quantity || 1,
      site_image_path: null,
      default_image_path: catalog?.default_image_path || null,
      instructions: catalog?.instructions || '등록된 운동 방법이 없습니다.',
      effects: catalog?.effects || '등록된 운동 효과가 없습니다.',
      precautions: catalog?.precautions || '',
      source_reference: catalog?.source_reference || '',
    };
  } catch (err) {
    console.error('[siteService] ❌ getEquipmentDetail 예외:', err);
    return null;
  }
}