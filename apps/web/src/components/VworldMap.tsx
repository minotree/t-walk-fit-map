import type { SiteSummary } from '@walk-fit/contracts';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import React, { useEffect, useRef } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import { fromLonLat } from 'ol/proj';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { Style, Icon, Circle as CircleStyle, Fill, Stroke } from 'ol/style';

// 🎨 마커 색상 설정 (원하는 색상의 주석을 해제하거나 헥사코드를 수정하세요)
//const MARKER_COLOR = '#FF6B00'; // 🟠 주황색 (Orange)
const MARKER_COLOR = '#8A2BE2'; // 🟣 보라색 (Purple)

// SVG 기반 고화질 마커 아이콘 생성 함수
const createMarkerIcon = (color: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
    <path fill="${color}" stroke="#FFFFFF" stroke-width="2" d="M16 0C7.163 0 0 7.163 0 16c0 12 16 26 16 26s16-14 16-26C32 7.163 24.837 0 16 0z"/>
    <circle cx="16" cy="16" r="6" fill="#FFFFFF"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};


interface VworldMapProps {
  sites: SiteSummary[];
  onSelectSite: (siteId: string) => void;
  userLocation?: { lat: number; lng: number } | null;
  targetCenter?: { lat: number; lng: number } | null;
}

export const VworldMap: React.FC<VworldMapProps> = ({
  sites,
  onSelectSite,
  userLocation,
  targetCenter
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const userLocationLayerRef = useRef<VectorLayer<VectorSource> | null>(null);

  const initialPosition = useRef({ targetCenter, userLocation });

  // 1. OpenLayers 지도 및 Vworld WMTS 타일 레이어 초기화
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const { targetCenter, userLocation } = initialPosition.current;
    const apiKey = import.meta.env.VITE_VWORLD_API_KEY || 'YOUR_VWORLD_API_KEY';

    // 초기 카메라 위치 우선순위: targetCenter > userLocation > 기본 설정값
    const initialLat = targetCenter?.lat ?? userLocation?.lat ?? (Number(import.meta.env.VITE_MAP_DEFAULT_LAT) || 37.5665);
    const initialLng = targetCenter?.lng ?? userLocation?.lng ?? (Number(import.meta.env.VITE_MAP_DEFAULT_LNG) || 126.9780);
    const defaultZoom = Number(import.meta.env.VITE_MAP_DEFAULT_ZOOM) || 15;

    const vworldTileLayer = new TileLayer({
      source: new XYZ({
        url: `https://api.vworld.kr/req/wmts/1.0.0/${apiKey}/Base/{z}/{y}/{x}.png`,
        crossOrigin: 'anonymous',
      }),
    });

    const map = new Map({
      target: mapContainerRef.current,
      layers: [vworldTileLayer],
      view: new View({
        center: fromLonLat([initialLng, initialLat]),
        zoom: defaultZoom,
      }),
    });

    mapInstanceRef.current = map;

    return () => {
      map.setTarget(undefined);
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. 운동시설 마커 레이어 생성 (선택한 마커 색상 반영)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const vectorSource = new VectorSource();
    const markerIconSrc = createMarkerIcon(MARKER_COLOR);

    sites.forEach((site) => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([site.longitude, site.latitude])),
        siteId: String(site.id),
        name: site.name,
      });

      feature.setStyle(
        new Style({
          image: new Icon({
            anchor: [0.5, 1],
            anchorXUnits: 'fraction',
            anchorYUnits: 'fraction',
            src: markerIconSrc,
          }),
        })
      );

      vectorSource.addFeature(feature);
    });

    const vectorLayer = new VectorLayer({
      source: vectorSource,
    });

    map.addLayer(vectorLayer);

    const handleMapClick = (evt: MapBrowserEvent) => {
      const feature = map.forEachFeatureAtPixel(evt.pixel, (feat) => feat);
      if (feature) {
        const siteId = feature.get('siteId');
        if (siteId) {
          onSelectSite(String(siteId));
        }
      }
    };

    map.on('click', handleMapClick);

    return () => {
      map.removeLayer(vectorLayer);
      map.un('click', handleMapClick);
    };
  }, [sites, onSelectSite]);

  // 3. targetCenter(선택한 지점) 변경 시 지도 중심 이동
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !targetCenter) return;

    const coord = fromLonLat([targetCenter.lng, targetCenter.lat]);
    map.getView().animate({
      center: coord,
      duration: 300,
    });
  }, [targetCenter]);

  // 4. 사용자 현 위치 파란색 서클 마커 표시
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userLocationLayerRef.current) {
      map.removeLayer(userLocationLayerRef.current);
      userLocationLayerRef.current = null;
    }

    if (userLocation) {
      const userCoord = fromLonLat([userLocation.lng, userLocation.lat]);

      const userFeature = new Feature({
        geometry: new Point(userCoord),
        name: '현재 위치',
      });

      userFeature.setStyle(
        new Style({
          image: new CircleStyle({
            radius: 9,
            fill: new Fill({ color: '#1a73e8' }),
            stroke: new Stroke({ color: '#ffffff', width: 3 }),
          }),
        })
      );

      const userSource = new VectorSource({
        features: [userFeature],
      });

      const userLayer = new VectorLayer({
        source: userSource,
      });

      map.addLayer(userLayer);
      userLocationLayerRef.current = userLayer;

      if (!targetCenter) {
        map.getView().animate({
          center: userCoord,
          duration: 500,
        });
      }
    }
  }, [userLocation, targetCenter]);

  return (
    <div
      ref={mapContainerRef}
      style={{ width: '100%', height: '100%', minHeight: '100vh' }}
    />
  );
};