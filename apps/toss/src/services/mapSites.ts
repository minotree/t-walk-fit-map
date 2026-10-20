import type { MapBounds, SiteSummary } from '@walk-fit/contracts';

export function sortVisibleSites(sites: SiteSummary[], bounds: MapBounds): SiteSummary[] {
  const lat = (bounds.south + bounds.north) / 2;
  const lng = (bounds.west + bounds.east) / 2;
  const rad = (degrees: number) => degrees * Math.PI / 180;
  const distance = (site: SiteSummary) => Math.sin(rad(site.latitude - lat) / 2) ** 2 +
    Math.cos(rad(lat)) * Math.cos(rad(site.latitude)) * Math.sin(rad(site.longitude - lng) / 2) ** 2;
  return sites.filter(site => site.longitude >= bounds.west && site.longitude <= bounds.east &&
    site.latitude >= bounds.south && site.latitude <= bounds.north)
    .sort((a, b) => distance(a) - distance(b) || a.id.localeCompare(b.id));
}
