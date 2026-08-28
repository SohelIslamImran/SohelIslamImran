-- Singleton public document for the folio. Writes are owner-gated in app code.
create table if not exists folio_document (
  id         text primary key,
  payload    text not null,
  updated_at timestamptz not null default now(),
  updated_by text
);
