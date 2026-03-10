import React from 'react';

const EVENT_COLORS = {
  confirmed_strike: '#ff4d4d',
  suspected_strike: '#ff9f43',
  strategic_event: '#ffe66d',
  interception: '#4da3ff',
};

const EVENT_LABELS = {
  confirmed_strike: 'Confirmed strike',
  suspected_strike: 'Suspected strike',
  strategic_event: 'Strategic event',
  interception: 'Interception',
};

export const getEventColor = (type) => EVENT_COLORS[type] || '#d1a24a';

export const getEventLabel = (type) => EVENT_LABELS[type] || 'Event';

const EventMarker = ({ event }) => {
  return (
    <div className="event-marker-row">
      <span
        className="event-dot"
        style={{ backgroundColor: getEventColor(event.type) }}
        aria-hidden="true"
      />
      <div className="event-marker-text">
        <strong>{event.title}</strong>
        <small>{getEventLabel(event.type)}</small>
      </div>
    </div>
  );
};

export default EventMarker;
