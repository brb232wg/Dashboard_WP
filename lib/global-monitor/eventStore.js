import { resolveLocation } from './locationResolver.js';
import { MOCK_X_STORIES } from './mockData.js';

const WINDOW_MS = 60 * 60 * 1000;

const CATEGORY_WEIGHTS = {
  strike: 30,
  missile_launch: 24,
  interception: 18,
  infrastructure: 34,
  oil: 32,
  statement: 8,
};

export const CATEGORY_TO_COLOR = {
  strike: '#ff4d4d',
  missile_launch: '#ff9f43',
  interception: '#4da3ff',
  infrastructure: '#ffe66d',
  oil: '#ffe66d',
  statement: '#f1eee8',
};

const listeners = new Set();
let allEvents = [];
let marketData = null;

const clone = (value) => JSON.parse(JSON.stringify(value));

function normalizeStory(story) {
  const resolved = resolveLocation(story);
  return {
    id: story.id,
    title: story.title,
    summary: story.summary || '',
    category: story.category,
    severity: Number(story.severity || 1),
    source_name: story.source_name || 'Unknown',
    source_url: story.source_url || '',
    published_at: story.published_at,
    latitude: resolved.latitude,
    longitude: resolved.longitude,
    location_name: resolved.location_name,
    confidence: story.confidence || resolved.confidence,
    tags: Array.isArray(story.tags) ? story.tags : [],
    casualties_estimated: Number(story.casualties_estimated || 0),
  };
}

function pruneWindow() {
  const cutoff = Date.now() - WINDOW_MS;
  allEvents = allEvents.filter((event) => new Date(event.published_at).getTime() >= cutoff);
}

function emit() {
  pruneWindow();
  const snapshot = getSnapshot();
  listeners.forEach((cb) => cb(snapshot));
}

export function ingestStories(stories = []) {
  const normalized = stories.map(normalizeStory);
  const byId = new Map(allEvents.map((event) => [event.id, event]));
  normalized.forEach((event) => byId.set(event.id, event));
  allEvents = [...byId.values()];
  emit();
}

export function seedMockEvents() {
  ingestStories(MOCK_X_STORIES);
}

export function setMarkets(markets) {
  marketData = clone(markets);
  emit();
}

export function getFilteredEvents({ category = 'all' } = {}) {
  pruneWindow();
  const filtered = category === 'all' ? allEvents : allEvents.filter((event) => event.category === category);
  return filtered.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
}

export function getSummary({ category = 'all' } = {}) {
  const events = getFilteredEvents({ category });
  const weightedTotal = events.reduce((sum, event) => {
    const weight = CATEGORY_WEIGHTS[event.category] || 10;
    return sum + weight + event.severity * 2;
  }, 0);

  const escalation = Math.max(0, Math.min(100, Math.round(weightedTotal / Math.max(events.length, 1))));
  const strikeCounter = events.filter((event) => ['strike', 'missile_launch'].includes(event.category)).length;
  const casualtyEstimated = events.reduce((sum, event) => sum + Number(event.casualties_estimated || 0), 0);
  const criticalIncidents = events.filter((event) => event.severity >= 4).length;

  return { escalation, strikeCounter, casualtyEstimated, criticalIncidents, activeEvents: events.length };
}

export function getSnapshot({ category = 'all' } = {}) {
  return {
    events: getFilteredEvents({ category }),
    summary: getSummary({ category }),
    markets: marketData,
    generated_at: new Date().toISOString(),
  };
}

export function subscribe(callback, { category = 'all' } = {}) {
  const wrapped = () => callback(getSnapshot({ category }));
  listeners.add(wrapped);
  wrapped();
  return () => listeners.delete(wrapped);
}

setInterval(() => emit(), 15000);
