import { useEffect, useRef } from 'react';
import type { Coordinates, MapBounds, SiteSummary } from '@walk-fit/contracts';
import Map from 'ol/Map';
import View from 'ol/View';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import { defaults as defaultInteractions } from 'ol/interaction/defaults';
import { fromLonLat, transformExtent } from 'ol/proj';
import { Circle, Fill, Icon, Stroke, Style, Text } from 'ol/style';
import { createSiteClusters } from '../services/mapClusters';
import 'ol/ol.css';

const siteMarker = new Style({ image: new Icon({
  anchor: [0.5, 1],
  src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44"><path d="M17 1C8.2 1 1 8.2 1 17c0 10.5 16 25.5 16 25.5S33 27.5 33 17C33 8.2 25.8 1 17 1Z" fill="#8A2BE2" stroke="white" stroke-width="2"/><circle cx="17" cy="16" r="6" fill="white"/></svg>')}`,
}) });

interface Props {
  sites: SiteSummary[];
  center: Coordinates | null;
  userLocation: Coordinates | null;
  onSelect(id: string): void;
  onBoundsChange(bounds: MapBounds): void;
}

export function FacilityMap({ sites, center, userLocation, onSelect, onBoundsChange }: Props) {
  const target = useRef<HTMLDivElement>(null);
  const map = useRef<Map>();
  const select = useRef(onSelect);
  select.current = onSelect;
  const boundsChanged = useRef(onBoundsChange);
  boundsChanged.current = onBoundsChange;
  const initial = useRef({ sites, center });

  useEffect(() => {
    if (!target.current) return;
    const { center, sites } = initial.current;
    const lat = center?.lat ?? sites[0]?.latitude ?? (Number(import.meta.env.VITE_MAP_DEFAULT_LAT) || 37.5665);
    const lng = center?.lng ?? sites[0]?.longitude ?? (Number(import.meta.env.VITE_MAP_DEFAULT_LNG) || 126.9780);
    const instance = new Map({
      target: target.current,
      interactions: defaultInteractions({ onFocusOnly: false }),
      layers: [new TileLayer({ source: new XYZ({
        url: `https://api.vworld.kr/req/wmts/1.0.0/${import.meta.env.VITE_VWORLD_API_KEY}/Base/{z}/{y}/{x}.png`,
        attributions: '© V-WORLD', crossOrigin: 'anonymous',
      }) })],
      view: new View({ center: fromLonLat([lng, lat]), zoom: Number(import.meta.env.VITE_MAP_DEFAULT_ZOOM) || 15 }),
    });
    map.current = instance;
    instance.on('singleclick', event => {
      instance.forEachFeatureAtPixel(event.pixel, feature => {
        const ids: unknown = feature.get('siteIds');
        if (!Array.isArray(ids) || !ids.every((id: unknown) => typeof id === 'string')) return;
        if (ids.length === 1) { select.current(ids[0]); return true; }
        const bounds: unknown = feature.get('bounds');
        if (ids.length > 1 && Array.isArray(bounds) && bounds.length === 4 && bounds.every((value: unknown) => typeof value === 'number' && Number.isFinite(value))) {
          instance.getView().fit(bounds, { padding: [64, 64, 100, 64], duration: 350,
            maxZoom: Math.min(20, (instance.getView().getZoom() ?? 15) + 3) });
          return true;
        }
      }, { hitTolerance: 12 });
    });
    const reportBounds = () => {
      const extent = transformExtent(instance.getView().calculateExtent(instance.getSize()), 'EPSG:3857', 'EPSG:4326');
      const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));
      boundsChanged.current({ west: clamp(extent[0], 180), south: clamp(extent[1], 90),
        east: clamp(extent[2], 180), north: clamp(extent[3], 90) });
    };
    instance.on('moveend', reportBounds);
    const resize = new ResizeObserver(() => { instance.updateSize(); reportBounds(); });
    resize.observe(target.current);
    return () => { resize.disconnect(); instance.setTarget(undefined); map.current = undefined; };
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const clusters = createSiteClusters(sites);
    const styles = new globalThis.Map<number, Style>();
    const clusterLayer = new VectorLayer({ source: clusters, style: feature => {
      const ids: unknown = feature.get('siteIds');
      const size = Array.isArray(ids) ? ids.length : 0;
      if (size <= 1) return siteMarker;
      let style = styles.get(size);
      if (!style) {
        style = new Style({ image: new Circle({ radius: size >= 100 ? 27 : 23,
          fill: new Fill({ color: '#8a2be2' }), stroke: new Stroke({ color: '#fff', width: 3 }) }),
          text: new Text({ text: String(size), font: 'bold 15px sans-serif', fill: new Fill({ color: '#fff' }) }),
        });
        styles.set(size, style);
      }
      return style;
    } });
    const features: Feature<Point>[] = [];
    if (userLocation) {
      const location = new Feature({ geometry: new Point(fromLonLat([userLocation.lng, userLocation.lat])) });
      location.setStyle([
        new Style({ zIndex: 10, image: new Circle({ radius: 19, fill: new Fill({ color: 'rgba(49,130,246,0.18)' }) }) }),
        new Style({ zIndex: 11,
          image: new Circle({ radius: 8, fill: new Fill({ color: '#3182f6' }), stroke: new Stroke({ color: '#fff', width: 3 }) }),
          text: new Text({ text: '내 위치', offsetY: -32, font: 'bold 14px sans-serif',
            fill: new Fill({ color: '#1b64da' }), stroke: new Stroke({ color: 'rgba(255,255,255,0.8)', width: 2 }) }),
        }),
      ]);
      features.push(location);
    }
    const layer = new VectorLayer({ source: new VectorSource({ features }) });
    layer.setZIndex(10);
    instance.addLayer(clusterLayer);
    instance.addLayer(layer);
    return () => { instance.removeLayer(layer); instance.removeLayer(clusterLayer); clusters.setSource(null); };
  }, [sites, userLocation, center]);

  useEffect(() => {
    if (userLocation && !center) map.current?.getView().animate({ center: fromLonLat([userLocation.lng, userLocation.lat]), duration: 250 });
  }, [userLocation, center]);

  return <div ref={target} className="map" role="region" aria-label="운동시설 지도" tabIndex={0} />;
}
