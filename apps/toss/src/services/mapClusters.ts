import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import Cluster from 'ol/source/Cluster';
import VectorSource from 'ol/source/Vector';
import { fromLonLat } from 'ol/proj';
import { boundingExtent } from 'ol/extent';
import type { SiteSummary } from '@walk-fit/contracts';

export function createSiteClusters(sites: SiteSummary[]) {
  const features = sites.map(site => new Feature({
    geometry: new Point(fromLonLat([site.longitude, site.latitude])), siteId: site.id,
  }));
  return new Cluster({
    distance: 56, minDistance: 24, wrapX: false,
    source: new VectorSource({ features, wrapX: false }),
    createCluster: (point, members) => new Feature({
      geometry: point,
      siteIds: members.map(member => member.get('siteId')).filter((id: unknown): id is string => typeof id === 'string'),
      bounds: boundingExtent(members.flatMap(member => {
        const geometry = member.getGeometry();
        return geometry instanceof Point ? [geometry.getCoordinates()] : [];
      })),
    }),
  });
}
