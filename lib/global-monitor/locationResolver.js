const LOCATION_ALIASES = {
  tehran: { lat: 35.6892, lon: 51.389, label: 'Tehran, Iran', confidence: 'high' },
  isfahan: { lat: 32.6546, lon: 51.668, label: 'Isfahan, Iran', confidence: 'high' },
  telaviv: { lat: 32.0853, lon: 34.7818, label: 'Tel Aviv, Israel', confidence: 'high' },
  haifa: { lat: 32.794, lon: 34.9896, label: 'Haifa, Israel', confidence: 'high' },
  hormuz: { lat: 26.566, lon: 56.249, label: 'Strait of Hormuz', confidence: 'medium' },
  doha: { lat: 25.2854, lon: 51.531, label: 'Doha, Qatar', confidence: 'medium' },
  riyadh: { lat: 24.7136, lon: 46.6753, label: 'Riyadh, Saudi Arabia', confidence: 'medium' },
  israel: { lat: 31.0461, lon: 34.8516, label: 'Israel', confidence: 'medium' },
  iran: { lat: 32.4279, lon: 53.688, label: 'Iran', confidence: 'medium' },
  iraq: { lat: 33.2232, lon: 43.6793, label: 'Iraq', confidence: 'low' },
};

const COUNTRY_CENTROIDS = {
  iran: { lat: 32.4279, lon: 53.688, label: 'Iran', confidence: 'low' },
  israel: { lat: 31.0461, lon: 34.8516, label: 'Israel', confidence: 'low' },
  qatar: { lat: 25.3548, lon: 51.1839, label: 'Qatar', confidence: 'low' },
  saudi: { lat: 23.8859, lon: 45.0792, label: 'Saudi Arabia', confidence: 'low' },
};

const normalize = (value = '') => value.toLowerCase().replace(/[^a-z]/g, '');

export function resolveLocation({ latitude, longitude, location_name, title, summary, tags = [] }) {
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return { latitude, longitude, location_name: location_name || 'Reported coordinates', confidence: 'high' };
  }

  const text = `${title || ''} ${summary || ''} ${(tags || []).join(' ')}`.toLowerCase();
  if (location_name) {
    const key = normalize(location_name);
    if (LOCATION_ALIASES[key]) {
      const hit = LOCATION_ALIASES[key];
      return { latitude: hit.lat, longitude: hit.lon, location_name: hit.label, confidence: hit.confidence };
    }
  }

  for (const [alias, hit] of Object.entries(LOCATION_ALIASES)) {
    const readableAlias = alias.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
    if (text.includes(alias) || text.includes(readableAlias)) {
      return { latitude: hit.lat, longitude: hit.lon, location_name: hit.label, confidence: hit.confidence };
    }
  }

  for (const [country, centroid] of Object.entries(COUNTRY_CENTROIDS)) {
    if (text.includes(country)) {
      return { latitude: centroid.lat, longitude: centroid.lon, location_name: centroid.label, confidence: centroid.confidence };
    }
  }

  return { latitude: 32.4279, longitude: 53.688, location_name: 'Regional (Middle East)', confidence: 'low' };
}
