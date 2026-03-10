import { CATEGORY_TO_COLOR } from '../../lib/global-monitor/eventStore.js';

export function createGlobalMonitorMap(containerId) {
  const map = new maplibregl.Map({
    container: containerId,
    style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    center: [53.688, 31.5],
    zoom: 4,
    minZoom: 3,
    maxZoom: 12,
    attributionControl: false,
  });

  map.addControl(new maplibregl.NavigationControl(), 'bottom-right');

  map.on('load', () => {
    map.addSource('gm-events', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, cluster: true, clusterRadius: 50, clusterMaxZoom: 8 });
    map.addLayer({ id:'gm-clusters', type:'circle', source:'gm-events', filter:['has','point_count'], paint:{ 'circle-color':'#d1a24a','circle-radius':['step',['get','point_count'],16,10,20,30,26],'circle-stroke-width':1,'circle-stroke-color':'#f1eee8' } });
    map.addLayer({ id:'gm-cluster-count', type:'symbol', source:'gm-events', filter:['has','point_count'], layout:{ 'text-field':['get','point_count_abbreviated'],'text-font':['Open Sans Bold'],'text-size':12 }, paint:{ 'text-color':'#090909' } });
    map.addLayer({ id:'gm-point', type:'circle', source:'gm-events', filter:['!',['has','point_count']], paint:{ 'circle-color':['get','color'],'circle-radius':7,'circle-stroke-width':1,'circle-stroke-color':'#f1eee8' } });

    map.on('click', 'gm-clusters', (e) => {
      const f = map.queryRenderedFeatures(e.point, { layers: ['gm-clusters'] })[0];
      map.getSource('gm-events').getClusterExpansionZoom(f.properties.cluster_id, (err, zoom) => {
        if (err) return;
        map.easeTo({ center: f.geometry.coordinates, zoom, duration: 450 });
      });
    });

    map.on('click', 'gm-point', (e) => {
      const f = e.features?.[0];
      if (!f) return;
      const p = f.properties;
      const link = p.source_url ? `<br><a href="${p.source_url}" target="_blank" rel="noreferrer">External link</a>` : '';
      new maplibregl.Popup({ offset: 12 }).setLngLat(f.geometry.coordinates).setHTML(`<strong>${p.title || 'Telegram alert'}</strong><br><small>${p.category}</small><br><small>${new Date(p.published_at).toLocaleString()}</small><br><small>${p.source_name}</small><br><small>${p.location_name || 'Unknown location'}</small><br><small>${p.summary || ''}</small>${link}`).addTo(map);
      window.dispatchEvent(new CustomEvent('gm-focus-feed-item', { detail: { id: p.id } }));
    });
  });

  const update = (events) => {
    const source = map.getSource('gm-events');
    if (!source) return;

    const features = events
      .filter((event) => Number.isFinite(event.longitude) && Number.isFinite(event.latitude))
      .filter((event) => event.source_type !== 'telegram' || event.confidence !== 'low')
      .map((event) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [event.longitude, event.latitude] },
        properties: { ...event, color: CATEGORY_TO_COLOR[event.category] || '#d1a24a' },
      }));

    source.setData({ type: 'FeatureCollection', features });
  };

  return { map, update };
}
