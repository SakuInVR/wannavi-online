-- Retake (リテイク) support for existing articles:
-- Allows admin to request revisions on already-approved blog posts.

-- 1. Add retake fields to articles
alter table public.articles
  add column if not exists retake_instructions text,
  add column if not exists previous_body text;

-- 2. Add retake-related columns to article_generation_jobs
alter table public.article_generation_jobs
  add column if not exists is_retake boolean not null default false,
  add column if not exists previous_article_id uuid references public.articles(id) on delete set null;
