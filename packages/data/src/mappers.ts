import type { EquipmentDetail, InstallationItem, SiteDetail, SiteSummary } from '@walk-fit/contracts';

export function row(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('시설 응답 형식이 올바르지 않습니다.');
  }
  return value as Record<string, unknown>;
}

export function rows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) throw new Error('시설 목록 응답 형식이 올바르지 않습니다.');
  return value.map(row);
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function id(value: unknown): string {
  const result = text(value);
  if (!result) throw new Error('시설 식별자가 올바르지 않습니다.');
  return result;
}

function coordinate(value: unknown, limit: number): number {
  const parsed = typeof value === 'number' ? value
    : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  if (!Number.isFinite(parsed) || Math.abs(parsed) > limit) {
    throw new Error('시설 좌표가 올바르지 않습니다.');
  }
  return parsed;
}

function integer(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= fallback ? value : fallback;
}

function relation(value: unknown): Record<string, unknown> {
  const result = Array.isArray(value) ? value[0] : value;
  return result == null ? {} : row(result);
}

function amenity(value: unknown): 'yes' | 'no' | 'unknown' {
  return value === 'yes' || value === 'no' ? value : 'unknown';
}

export function mapSiteSummary(value: unknown): SiteSummary {
  const site = row(value);
  return { id: id(site.id), name: text(site.name, '운동시설'),
    latitude: coordinate(site.latitude, 90), longitude: coordinate(site.longitude, 180) };
}

export function mapInstallation(value: unknown): InstallationItem {
  const item = row(value);
  const catalog = relation(item.equipment_catalog);
  return {
    installationId: id(item.id), quantity: integer(item.quantity, 1),
    display_order: integer(item.display_order, 0), equipmentId: text(item.equipment_id, text(catalog.id)),
    name: text(catalog.name, '운동기구'), model_name: text(catalog.model_name),
    default_image_path: text(catalog.default_image_path) || null,
  };
}

export function mapSiteDetail(value: unknown, equipments: InstallationItem[], image: string | null): SiteDetail {
  const site = row(value);
  return {
    id: id(site.id), name: text(site.name, '운동시설'), address_text: text(site.address_text),
    toilet_status: amenity(site.toilet_status), drinking_water_status: amenity(site.drinking_water_status),
    amenity_note: text(site.amenity_note), last_verified_at: text(site.last_verified_at) || null,
    survey_location_id: text(site.survey_location_id) || null, site_image_path: image, equipments,
  };
}

export function mapEquipmentDetail(value: unknown): EquipmentDetail | null {
  const item = row(value);
  const site = relation(item.exercise_sites);
  if (site.is_published !== true) return null;
  const catalog = relation(item.equipment_catalog);
  return {
    installationId: id(item.id), siteId: id(item.site_id), siteName: text(site.name, '운동시설'),
    equipmentName: text(catalog.name, '운동기구'), model_name: text(catalog.model_name),
    quantity: integer(item.quantity, 1), site_image_path: null,
    default_image_path: text(catalog.default_image_path) || null,
    instructions: text(catalog.instructions, '등록된 운동 방법이 없습니다.'),
    effects: text(catalog.effects, '등록된 운동 효과가 없습니다.'),
    precautions: text(catalog.precautions), source_reference: text(catalog.source_reference),
  };
}
