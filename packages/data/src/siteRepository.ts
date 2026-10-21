import type { SupabaseClient } from '@supabase/supabase-js';
import type { SiteRepository } from '@walk-fit/contracts';
import { mapEquipmentDetail, mapInstallation, mapSiteDetail, mapSiteSummary, row, rows } from './mappers';

/** 클라이언트 생성과 인증 설정은 호출하는 앱이 소유한다. */
export function createSiteRepository(supabase: SupabaseClient): SiteRepository {
  return {
    async getPublishedSitesInBounds(bounds) {
      const { west, south, east, north } = bounds;
      if (![west, south, east, north].every(Number.isFinite) || west < -180 || east > 180 ||
        south < -90 || north > 90 || west > east || south > north) {
        throw new Error('지도 범위가 올바르지 않습니다.');
      }
      const { data, error, count } = await supabase.from('exercise_sites')
        .select('id, name, latitude, longitude', { count: 'exact' }).eq('is_published', true)
        .gte('longitude', west).lte('longitude', east)
        .gte('latitude', south).lte('latitude', north).order('id').limit(501);
      if (error) throw new Error('지도 범위의 시설을 불러오는 데 실패했습니다.');
      const result = rows(data);
      // 과밀 영역의 일부 결과를 전체/최단거리 목록으로 오인하지 않게 확대를 요청한다.
      return result.length > 500 || (count !== null && count > result.length) ? { sites: [], tooMany: true }
        : { sites: result.map(mapSiteSummary), tooMany: false };
    },
    async getPublishedSites() {
      const { data, error } = await supabase.from('exercise_sites')
        .select('id, name, latitude, longitude').eq('is_published', true);
      if (error) throw new Error('공개 시설을 불러오는 데 실패했습니다.');
      return rows(data).map(mapSiteSummary);
    },
    async getSiteDetail(siteId) {
      const { data, error } = await supabase.from('exercise_sites').select('*')
        .eq('id', siteId).eq('is_published', true).maybeSingle();
      if (error) throw new Error('시설 상세 정보를 불러오는 데 실패했습니다.');
      if (!data) return null;
      const site = row(data);
      // 조사 테이블의 익명 SELECT 권한 없이 공개 지점의 대표 사진만 조회한다.
      const { data: photo, error: photoError } = await supabase.rpc('get_published_site_photo',
        { p_site_id: siteId }, { get: true });
      if (photoError) throw new Error('시설 대표 사진을 불러오는 데 실패했습니다.');
      if (photo !== null && (typeof photo !== 'string' || !photo.trim())) {
        throw new Error('시설 대표 사진 응답 형식이 올바르지 않습니다.');
      }
      let image: string | null = null;
      if (typeof photo === 'string') {
        const bucket = supabase.storage.from('survey-photos');
        const publicPrefix = bucket.getPublicUrl('').data.publicUrl;
        let path = photo;
        if (photo.startsWith(publicPrefix)) {
          path = decodeURIComponent(new URL(photo).pathname.slice(new URL(publicPrefix).pathname.length));
        } else if (/^https?:\/\//.test(photo)) {
          image = photo;
        }
        if (!image) {
          const { data: signed, error: signedError } = await bucket.createSignedUrl(path, 3600);
          if (signedError || !signed?.signedUrl) throw new Error('시설 사진을 불러오는 데 실패했습니다.');
          image = signed.signedUrl;
        }
      }
      const { data: installations, error: installationError } = await supabase.from('site_equipment')
        .select('id, quantity, display_order, is_published, equipment_id, equipment_catalog (id, name, model_name, default_image_path)')
        .eq('site_id', siteId).eq('is_published', true).order('display_order', { ascending: true });
      // 조회 실패를 기구가 없는 시설로 표시하지 않는다.
      if (installationError) throw new Error('설치 기구 정보를 불러오는 데 실패했습니다.');
      return mapSiteDetail(site, rows(installations).map(mapInstallation), image);
    },
    async getEquipmentDetail(siteId, installationId) {
      const { data, error } = await supabase.from('site_equipment')
        .select('id, site_id, quantity, is_published, exercise_sites (id, name, is_published), equipment_catalog (id, name, model_name, default_image_path, instructions, effects, precautions, source_reference)')
        .eq('id', installationId).eq('site_id', siteId).eq('is_published', true).maybeSingle();
      if (error) throw new Error('기구 상세 정보를 불러오는 데 실패했습니다.');
      return data ? mapEquipmentDetail(data) : null;
    },
  };
}
