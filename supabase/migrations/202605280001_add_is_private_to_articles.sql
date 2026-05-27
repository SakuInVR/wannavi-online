-- Migration: Add is_private column to articles table to support personal/private roadmaps
-- Path: supabase/migrations/202605280001_add_is_private_to_articles.sql

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_articles_is_private ON public.articles(is_private);
