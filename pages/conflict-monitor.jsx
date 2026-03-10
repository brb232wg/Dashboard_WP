import React, { useEffect, useMemo, useState } from 'react';
import ConflictMap from '../components/maps/ConflictMap';
import EventMarker, { getEventColor, getEventLabel } from '../components/maps/EventMarker';

const FILTERS = [
  { key: 'all', label: 'All', match: () => true },
  {
    key: 'strikes',
    label: 'Strikes',
    match: (event) => ['confirmed_strike', 'suspected_strike'].includes(event.type),
  },
  { key: 'missile_launches', label: 'Missile launches', match: (event) => event.type === 'strategic_event' },
  { key: 'interceptions', label: 'Interceptions', match: (event) => event.type === 'interception' },
  {
    key: 'infrastructure',
    label: 'Infrastructure',
    match: (event) => (event.tags || []).includes('infrastructure') || event.type === 'strategic_event',
  },
];

const FALLBACK_EVENTS = [
  {
    id: 'ev-1',
    title: 'Air Defense Interception - Tehran',
    timestamp: new Date().toISOString(),
    latitude: 35.6892,
    longitude: 51.389,
    severity: 2,
    type: 'interception',
    source: 'Regional Wire',
  },
  {
    id: 'ev-2',
    title: 'Confirmed Strike - Isfahan Perimeter',
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    latitude: 32.6546,
    longitude: 51.668,
    severity: 4,
    type: 'confirmed_strike',
    source: 'Satellite Analysis',
  },
];

export default function ConflictMonitorPage() {
  const [events, setEvents] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortNewest, setSortNewest] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadEvents = async () => {
      try {
        const response = await fetch('/api/events');
        if (!response.ok) throw new Error('Failed to load events');
        const data = await response.json();
        if (mounted) setEvents(Array.isArray(data) ? data : FALLBACK_EVENTS);
      } catch {
        if (mounted) setEvents(FALLBACK_EVENTS);
      }
    };

    loadEvents();
    const interval = setInterval(loadEvents, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const filteredEvents = useMemo(() => {
    const filterConfig = FILTERS.find((item) => item.key === activeFilter) || FILTERS[0];
    const list = events.filter(filterConfig.match);
    return list.sort((a, b) => {
      if (!sortNewest) return 0;
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
  }, [events, activeFilter, sortNewest]);

  const strikeCounter = filteredEvents.filter((e) => ['confirmed_strike', 'suspected_strike'].includes(e.type)).length;
  const escalationMeter = Math.min(
    100,
    Math.round(
      (filteredEvents.reduce((total, event) => total + Number(event.severity || 1), 0) /
        Math.max(filteredEvents.length, 1)) *
        20
    )
  );

  const casualtiesSummary = filteredEvents.reduce(
    (acc, event) => {
      const impact = Number(event.severity || 0);
      acc.estimated += impact * 3;
      acc.critical += impact >= 4 ? 1 : 0;
      return acc;
    },
    { estimated: 0, critical: 0 }
  );

  return (
    <div className="monitor-page">
      <header className="topbar">
        <h1>Global Monitor</h1>
        <div className="filter-group">
          {FILTERS.map((filter) => (
            <button
              key={filter.key}
              className={activeFilter === filter.key ? 'filter active' : 'filter'}
              onClick={() => setActiveFilter(filter.key)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </header>

      <main className="monitor-grid">
        <aside className="panel left-panel">
          <section>
            <h2>Escalation Meter</h2>
            <div className="meter-track">
              <div className="meter-fill" style={{ width: `${escalationMeter}%` }} />
            </div>
            <p>{escalationMeter}%</p>
          </section>
          <section>
            <h2>Strike Counter</h2>
            <p className="stat-number">{strikeCounter}</p>
          </section>
          <section>
            <h2>Casualties Summary</h2>
            <p>Estimated affected: {casualtiesSummary.estimated}</p>
            <p>Critical incidents: {casualtiesSummary.critical}</p>
          </section>
        </aside>

        <section className="map-panel">
          <ConflictMap events={filteredEvents} />
        </section>

        <aside className="panel right-panel">
          <div className="feed-head">
            <h2>Live Event Feed</h2>
            <button className="sort-btn" onClick={() => setSortNewest((prev) => !prev)}>
              {sortNewest ? 'Newest first' : 'Custom order'}
            </button>
          </div>

          <div className="feed-list">
            {filteredEvents.map((event) => (
              <article key={event.id} className="feed-item">
                <EventMarker event={event} />
                <small>{new Date(event.timestamp).toLocaleString()}</small>
                <small style={{ color: getEventColor(event.type) }}>{getEventLabel(event.type)}</small>
                <small>Source: {event.source || 'Unknown'}</small>
              </article>
            ))}
          </div>
        </aside>
      </main>

      <footer className="market-panel panel">
        <div>
          <span>Brent</span>
          <strong>$86.42</strong>
        </div>
        <div>
          <span>WTI</span>
          <strong>$82.11</strong>
        </div>
        <div>
          <span>Polymarket: Oil above $100</span>
          <strong>31%</strong>
        </div>
      </footer>

      <style jsx>{`
        .monitor-page {
          min-height: 100vh;
          background: #090909;
          color: #f1eee8;
          font-family: 'Roboto Mono', monospace;
          display: grid;
          grid-template-rows: auto 1fr auto;
          gap: 12px;
          padding: 12px;
        }
        .topbar,
        .panel,
        .map-panel {
          border: 1px solid rgba(209, 162, 74, 0.35);
          background: rgba(17, 17, 17, 0.95);
        }
        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
        }
        h1,
        h2 {
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-family: 'Teko', sans-serif;
          color: #d1a24a;
        }
        .filter-group {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .filter {
          border: 1px solid rgba(209, 162, 74, 0.35);
          background: transparent;
          color: #f1eee8;
          padding: 6px 10px;
          cursor: pointer;
          text-transform: uppercase;
          font-size: 12px;
        }
        .filter.active {
          background: rgba(209, 162, 74, 0.2);
        }
        .monitor-grid {
          display: grid;
          grid-template-columns: 280px 1fr 320px;
          gap: 12px;
          min-height: 70vh;
        }
        .panel {
          padding: 12px;
        }
        .left-panel {
          display: grid;
          gap: 14px;
          align-content: start;
        }
        .meter-track {
          height: 10px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(209, 162, 74, 0.35);
        }
        .meter-fill {
          height: 100%;
          background: linear-gradient(90deg, #ff9f43, #ff4d4d);
        }
        .stat-number {
          font-size: 28px;
          margin: 0;
        }
        .map-panel {
          overflow: hidden;
          position: relative;
        }
        :global(.conflict-map-canvas) {
          width: 100%;
          height: 100%;
          min-height: 540px;
        }
        .feed-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .sort-btn {
          border: 1px solid rgba(209, 162, 74, 0.35);
          background: transparent;
          color: #f1eee8;
          padding: 4px 8px;
        }
        .feed-list {
          display: grid;
          gap: 10px;
          max-height: calc(100vh - 280px);
          overflow: auto;
        }
        .feed-item {
          border: 1px solid rgba(209, 162, 74, 0.2);
          padding: 8px;
          display: grid;
          gap: 3px;
          background: rgba(9, 9, 9, 0.8);
        }
        :global(.event-marker-row) {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        :global(.event-dot) {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          border: 1px solid rgba(241, 238, 232, 0.7);
        }
        :global(.event-marker-text) {
          display: grid;
          gap: 2px;
        }
        .market-panel {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          align-items: center;
        }
        .market-panel div {
          display: grid;
          gap: 4px;
        }
        .market-panel span {
          color: #8f897d;
          font-size: 12px;
          text-transform: uppercase;
        }
        @media (max-width: 1200px) {
          .monitor-grid {
            grid-template-columns: 1fr;
          }
          .market-panel {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
