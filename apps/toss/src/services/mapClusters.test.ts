import { expect, test } from 'vitest';
import Projection from 'ol/proj/Projection';
import { createSiteClusters } from './mapClusters';

test('축소하면 가까운 지점이 하나의 개수 마커로 묶이고 확대하면 분리된다', () => {
  const source = createSiteClusters([
    { id: 'a', name: 'A', latitude: 37.5, longitude: 127 },
    { id: 'b', name: 'B', latitude: 37.5, longitude: 127.001 },
  ]);
  source.loadFeatures([0, 0, 20000000, 20000000], 5, new Projection({ code: 'EPSG:3857', units: 'm' }));
  expect(source.getFeatures()).toHaveLength(1);
  expect(source.getFeatures()[0].get('siteIds').sort()).toEqual(['a', 'b']);
  source.loadFeatures([0, 0, 20000000, 20000000], 0.5, new Projection({ code: 'EPSG:3857', units: 'm' }));
  expect(source.getFeatures()).toHaveLength(2);
  source.setSource(null);
});

test('같은 위치의 여러 지점도 개수를 유지하며 내 위치를 포함하지 않는다', () => {
  const source = createSiteClusters(Array.from({ length: 30 }, (_, index) => ({
    id: String(index), name: String(index), latitude: 37.5, longitude: 127,
  })));
  source.loadFeatures([0, 0, 20000000, 20000000], 5, new Projection({ code: 'EPSG:3857', units: 'm' }));
  expect(source.getFeatures()[0].get('siteIds')).toHaveLength(30);
  source.setSource(null);
});
