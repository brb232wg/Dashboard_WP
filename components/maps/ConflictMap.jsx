import React, { useEffect, useMemo, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getEventLabel } from './EventMarker';

const IRAN_CENTER = [53.688, 32.4279];

const ConflictMap = ({ events = [], onMarkerClick }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  const geojson = useMemo(
    () => ({
      type: 'FeatureCollection',
      features: events
        .filter((event) => Number.isFinite(event.longitude) && Number.isFinite(event.latitude))
        .map((event) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [event.longitude, event.latitude],
          },
          properties: {
            id: event.id,
            title: event.title,
            type: event.type,
            timestamp: event.timestamp,
            source: event.source || 'Unverified',
          },
        })),
    }),
    [events]
  );

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: IRAN_CENTER,
      zoom: 4,
      minZoom: 3,
      maxZoom: 12,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');

    map.on('load', () => {
      map.addSource('events', {
        type: 'geojson',
        data: geojson,
        cluster: true,
        clusterMaxZoom: 8,
        clusterRadius: 50,
      });

      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'events',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#d1a24a',
          'circle-radius': ['step', ['get', 'point_count'], 16, 10, 20, 30, 26],
          'circle-opacity': 0.82,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#f1eee8',
        },
      });

      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'events',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['Open Sans Bold'],
          'text-size': 12,
        },
        paint: {
          'text-color': '#090909',
        },
      });

      map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'events',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': [
            'match',
            ['get', 'type'],
            'confirmed_strike',
            '#ff4d4d',
            'suspected_strike',
            '#ff9f43',
            'strategic_event',
            '#ffe66d',
            'interception',
            '#4da3ff',
            '#d1a24a',
          ],
          'circle-radius': 7,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#f1eee8',
        },
      });

      map.on('click', 'clusters', (event) => {
        const features = map.queryRenderedFeatures(event.point, { layers: ['clusters'] });
        const clusterId = features[0].properties.cluster_id;
        map.getSource('events').getClusterExpansionZoom(clusterId, (error, zoom) => {
          if (error) return;
          map.easeTo({
            center: features[0].geometry.coordinates,
            zoom,
            duration: 450,
          });
        });
      });

      map.on('click', 'unclustered-point', (event) => {
        const feature = event.features?.[0];
        if (!feature) return;

        const details = {
          ...feature.properties,
          coordinates: feature.geometry.coordinates,
        };

        const popupHtml = `
          <div style="font-family: Roboto Mono, monospace; color:#f1eee8; background:#111; padding:8px; border:1px solid rgba(209,162,74,.35)">
            <strong>${details.title}</strong><br/>
            <small>${new Date(details.timestamp).toLocaleString()}</small><br/>
            <small>${getEventLabel(details.type)}</small><br/>
            <small>Source: ${details.source || 'Unknown'}</small>
          </div>
        `;

        new maplibregl.Popup({ closeButton: true, closeOnClick: true, offset: 12 })
          .setLngLat(feature.geometry.coordinates)
          .setHTML(popupHtml)
          .addTo(map);

        onMarkerClick?.(details);
      });

      map.on('mouseenter', 'clusters', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'clusters', () => {
        map.getCanvas().style.cursor = '';
      });
      map.on('mouseenter', 'unclustered-point', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'unclustered-point', () => {
        map.getCanvas().style.cursor = '';
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [geojson, onMarkerClick]);

  useEffect(() => {
    const source = mapRef.current?.getSource('events');
    if (source) source.setData(geojson);
  }, [geojson]);

  return <div ref={mapContainerRef} className="conflict-map-canvas" />;
};

export default ConflictMap;
