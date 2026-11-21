CREATE TABLE analytics_events (
	event_id TEXT PRIMARY KEY NOT NULL,
	ts TEXT NOT NULL,
	day TEXT NOT NULL,
	kind TEXT NOT NULL CHECK (kind IN ('pageview', 'engagement', 'outbound')),
	path TEXT NOT NULL,
	visitor_key TEXT NOT NULL,
	tab_key TEXT NOT NULL,
	referrer_host TEXT,
	country TEXT NOT NULL,
	device TEXT NOT NULL,
	browser TEXT NOT NULL,
	link_id TEXT,
	visible_ms INTEGER
);

CREATE INDEX analytics_events_ts ON analytics_events(ts);
CREATE INDEX analytics_events_day_kind_visitor ON analytics_events(day, kind, visitor_key);

CREATE TABLE analytics_presence (
	tab_key TEXT PRIMARY KEY NOT NULL,
	path TEXT NOT NULL,
	last_seen TEXT NOT NULL
);

CREATE INDEX analytics_presence_last_seen ON analytics_presence(last_seen);

CREATE TABLE analytics_salts (
	day TEXT PRIMARY KEY NOT NULL,
	visitor_key_secret TEXT NOT NULL,
	tab_key_secret TEXT NOT NULL
);

CREATE TABLE analytics_daily (
	day TEXT NOT NULL,
	dimension TEXT NOT NULL,
	value TEXT NOT NULL,
	metric TEXT NOT NULL,
	count INTEGER NOT NULL,
	PRIMARY KEY (day, dimension, value, metric)
);
