import type { ExpressionSpecification, StyleSpecification } from 'maplibre-gl';

// Light, low-detail base map in the portal palette. Tiles are OpenStreetMap
// data served as OpenMapTiles vector tiles by OpenFreeMap (no API key).
const TILES_URL = 'https://tiles.openfreemap.org/planet';
const GLYPHS_URL =
  'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';

export interface SovereigntyLabels {
  paracel: string;
  spratly: string;
  eastSea: string;
  gulfOfTonkin: string;
}

// Sovereignty labels are drawn by the portal, not taken from OSM, so the East
// Sea and the Hoang Sa / Truong Sa archipelagos are always labelled.
function sovereigntyFeatures(labels: SovereigntyLabels) {
  const point = (name: string, lng: number, lat: number, kind: string) => ({
    type: 'Feature' as const,
    properties: { name, kind },
    geometry: { type: 'Point' as const, coordinates: [lng, lat] },
  });
  return {
    type: 'FeatureCollection' as const,
    features: [
      point(labels.paracel, 112.0, 16.5, 'island'),
      point(labels.spratly, 114.0, 10.0, 'island'),
      point(labels.eastSea, 115.5, 14.5, 'sea'),
      point(labels.gulfOfTonkin, 107.8, 20.0, 'sea'),
    ],
  };
}

export function buildVietnamMapStyle(
  language: 'vi' | 'en',
  labels: SovereigntyLabels
): StyleSpecification {
  const name: ExpressionSpecification = [
    'coalesce',
    ['get', `name:${language}`],
    ['get', 'name:latin'],
    ['get', 'name'],
  ];
  const font = (weight: 'Regular' | 'Bold') => [`Noto Sans ${weight}`];

  return {
    version: 8,
    glyphs: GLYPHS_URL,
    sources: {
      openmaptiles: { type: 'vector', url: TILES_URL },
      sovereignty: {
        type: 'geojson',
        data: sovereigntyFeatures(labels),
      },
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': '#F3F4F4' },
      },
      {
        id: 'water',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'water',
        paint: { 'fill-color': '#BFD9F2' },
      },
      {
        id: 'roads-major',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 7,
        filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk']]],
        paint: { 'line-color': '#E1E3E6', 'line-width': 1 },
      },
      {
        id: 'boundary-district',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'boundary',
        minzoom: 8,
        filter: ['==', ['get', 'admin_level'], 6],
        paint: {
          'line-color': '#C9CDD2',
          'line-width': 0.8,
          'line-dasharray': [2, 2],
        },
      },
      {
        id: 'boundary-province',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'boundary',
        filter: ['==', ['get', 'admin_level'], 4],
        paint: { 'line-color': '#A9AFB6', 'line-width': 1 },
      },
      {
        id: 'boundary-country',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'boundary',
        filter: [
          'all',
          ['==', ['get', 'admin_level'], 2],
          ['!=', ['get', 'maritime'], 1],
        ],
        paint: { 'line-color': '#6B7280', 'line-width': 1.6 },
      },
      {
        id: 'label-country',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'place',
        filter: ['==', ['get', 'class'], 'country'],
        layout: {
          'text-field': name,
          'text-font': font('Bold'),
          'text-size': 12,
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.04,
        },
        paint: {
          'text-color': '#636466',
          'text-halo-color': 'rgba(255,255,255,0.9)',
          'text-halo-width': 1.5,
        },
      },
      {
        id: 'label-province',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'place',
        minzoom: 5,
        filter: ['==', ['get', 'class'], 'state'],
        layout: {
          'text-field': name,
          'text-font': font('Regular'),
          'text-size': 11,
        },
        paint: {
          'text-color': '#8A8F98',
          'text-halo-color': 'rgba(255,255,255,0.9)',
          'text-halo-width': 1.2,
        },
      },
      {
        id: 'label-city',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'place',
        minzoom: 6,
        filter: ['==', ['get', 'class'], 'city'],
        layout: {
          'text-field': name,
          'text-font': font('Regular'),
          'text-size': 12,
        },
        paint: {
          'text-color': '#44464A',
          'text-halo-color': 'rgba(255,255,255,0.9)',
          'text-halo-width': 1.5,
        },
      },
      {
        id: 'label-sea',
        type: 'symbol',
        source: 'sovereignty',
        filter: ['==', ['get', 'kind'], 'sea'],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': font('Bold'),
          'text-size': 12,
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.12,
        },
        paint: { 'text-color': '#5B86B5' },
      },
      {
        id: 'label-island',
        type: 'symbol',
        source: 'sovereignty',
        filter: ['==', ['get', 'kind'], 'island'],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': font('Bold'),
          'text-size': 12,
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#D9131F',
          'text-halo-color': 'rgba(255,255,255,0.95)',
          'text-halo-width': 1.5,
        },
      },
    ],
  };
}
