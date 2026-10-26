-- Schema 3 replaces `projects[].focuses` with a required `projects[].category`
-- and adds the `testimonials` and `credentials` collections.
--
-- The stored JSON documents are deliberately not rewritten here. Remapping an
-- array of projects in SQLite JSON is fragile, so the application upgrades
-- known schema-2 documents in `parseStoredOrBootstrap` while preserving their
-- existing copy. The owner can review the normalized draft and republish it.

UPDATE portfolio_documents
SET schema_version = 3
WHERE schema_version < 3;
