PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS portfolio_documents (
  id TEXT PRIMARY KEY CHECK (id = 'primary'),
  schema_version INTEGER NOT NULL CHECK (schema_version > 0),
  draft_json TEXT NOT NULL,
  published_json TEXT NOT NULL,
  draft_revision INTEGER NOT NULL DEFAULT 1 CHECK (draft_revision >= 0),
  published_revision INTEGER NOT NULL DEFAULT 0 CHECK (published_revision >= 0),
  draft_updated_at TEXT NOT NULL,
  published_at TEXT,
  updated_by TEXT NOT NULL,
  published_by TEXT
);

CREATE TABLE IF NOT EXISTS portfolio_revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id TEXT NOT NULL REFERENCES portfolio_documents(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('draft', 'published')),
  revision INTEGER NOT NULL CHECK (revision >= 0),
  content_json TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  changed_at TEXT NOT NULL,
  UNIQUE (document_id, kind, revision)
);

CREATE INDEX IF NOT EXISTS portfolio_revisions_document_revision
  ON portfolio_revisions (document_id, revision DESC);

CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL UNIQUE,
  alt TEXT NOT NULL DEFAULT '',
  mime_type TEXT,
  width INTEGER CHECK (width IS NULL OR width > 0),
  height INTEGER CHECK (height IS NULL OR height > 0),
  bytes INTEGER CHECK (bytes IS NULL OR bytes >= 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS media_assets_status_updated
  ON media_assets (status, updated_at DESC);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  actor_subject TEXT,
  document_id TEXT REFERENCES portfolio_documents(id) ON DELETE SET NULL,
  revision INTEGER,
  details_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS audit_events_created_at
  ON audit_events (created_at DESC);

INSERT OR IGNORE INTO portfolio_documents (
  id,
  schema_version,
  draft_json,
  published_json,
  draft_revision,
  published_revision,
  draft_updated_at,
  published_at,
  updated_by,
  published_by
)
VALUES (
  'primary',
  1,
  '{"schemaVersion":1,"site":{"title":"Sohel Islam Imran","description":"","locale":"en","theme":"ink"},"identity":{"name":"Sohel Islam Imran","handle":"sohelislamimran","role":"","location":"Dhaka, Bangladesh","timezone":"Asia/Dhaka","availability":"","email":"sohelislamimran@gmail.com","avatar":null},"hero":{"eyebrow":"","title":"","intro":"","actions":[],"metrics":[]},"about":{"title":"","paragraphs":[],"facts":[]},"experience":[],"projects":[],"capabilities":[],"writing":[],"contact":{"title":"","intro":"","email":"sohelislamimran@gmail.com","links":[]},"social":[],"resume":{"label":"Résumé","href":"/resume","updatedAt":null},"story":{"eyebrow":"","title":"","intro":"","quote":"","chapters":[],"sourceLabel":"","sourceHref":"/story"},"travel":{"eyebrow":"","title":"","intro":"","origin":"Dhaka, Bangladesh","entries":[]},"media":[]}',
  '{"schemaVersion":1,"site":{"title":"Sohel Islam Imran","description":"","locale":"en","theme":"ink"},"identity":{"name":"Sohel Islam Imran","handle":"sohelislamimran","role":"","location":"Dhaka, Bangladesh","timezone":"Asia/Dhaka","availability":"","email":"sohelislamimran@gmail.com","avatar":null},"hero":{"eyebrow":"","title":"","intro":"","actions":[],"metrics":[]},"about":{"title":"","paragraphs":[],"facts":[]},"experience":[],"projects":[],"capabilities":[],"writing":[],"contact":{"title":"","intro":"","email":"sohelislamimran@gmail.com","links":[]},"social":[],"resume":{"label":"Résumé","href":"/resume","updatedAt":null},"story":{"eyebrow":"","title":"","intro":"","quote":"","chapters":[],"sourceLabel":"","sourceHref":"/story"},"travel":{"eyebrow":"","title":"","intro":"","origin":"Dhaka, Bangladesh","entries":[]},"media":[]}',
  1,
  1,
  datetime('now'),
  datetime('now'),
  'system',
  'system'
);

INSERT OR IGNORE INTO portfolio_revisions (
  document_id,
  kind,
  revision,
  content_json,
  changed_by,
  changed_at
)
SELECT id, 'draft', draft_revision, draft_json, 'system', draft_updated_at
FROM portfolio_documents
WHERE id = 'primary';

INSERT OR IGNORE INTO portfolio_revisions (
  document_id,
  kind,
  revision,
  content_json,
  changed_by,
  changed_at
)
SELECT id, 'published', published_revision, published_json, 'system', published_at
FROM portfolio_documents
WHERE id = 'primary' AND published_at IS NOT NULL;
