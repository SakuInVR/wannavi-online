-- Add tags column to articles table.
-- This was referenced in code but never created in any prior migration.

alter table public.articles
  add column if not exists tags text[] not null default '{}';

-- Index for tag-based queries (used by /tags/[tag] pages)
create index if not exists articles_tags_idx on public.articles using gin (tags);
