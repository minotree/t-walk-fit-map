import { expect, test } from 'vitest';
import { sortVisibleSites } from './mapSites';

const bounds = { west: 126.9, south: 37.4, east: 127.1, north: 37.6 };
test('범위 밖 지점을 제외하고 지도 중심에서 가까운 순으로 정렬한다', () => {
  const sites = [
    { id: 'far', name: '먼 지점', latitude: 37.59, longitude: 127 },
    { id: 'outside', name: '범위 밖', latitude: 38, longitude: 127 },
    { id: 'near', name: '가까운 지점', latitude: 37.5, longitude: 127 },
  ];
  expect(sortVisibleSites(sites, bounds).map(site => site.id)).toEqual(['near', 'far']);
  expect(sites[0].id).toBe('far');
});

test('경계 포함 및 같은 거리의 정렬 순서를 유지한다', () => {
  const sites = ['b', 'a'].map(id => ({ id, name: id, latitude: bounds.south, longitude: bounds.west }));
  expect(sortVisibleSites(sites, bounds).map(site => site.id)).toEqual(['a', 'b']);
});
