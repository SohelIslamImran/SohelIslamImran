-- Add the editable public profile-link collection without rewriting history.
-- portfolio_revisions intentionally remains untouched: old snapshots stay
-- available as the version-1 documents they were when they were recorded.

UPDATE portfolio_documents
SET
  schema_version = 2,
  draft_json = json_set(
    draft_json,
    '$.schemaVersion', 2,
    '$.profileLinks', COALESCE(json_extract(draft_json, '$.profileLinks'), json('[]'))
  ),
  published_json = json_set(
    published_json,
    '$.schemaVersion', 2,
    '$.profileLinks', COALESCE(json_extract(published_json, '$.profileLinks'), json('[]'))
  )
WHERE schema_version < 2;
