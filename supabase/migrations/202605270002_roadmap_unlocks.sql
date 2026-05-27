-- Migration: Roadmaps unlock tracking and generation inputs
-- Path: supabase/migrations/202605270002_roadmap_unlocks.sql

-- 1. Create public.article_unlocks table
CREATE TABLE IF NOT EXISTS public.article_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, article_id)
);

-- Index unlocks
CREATE INDEX IF NOT EXISTS idx_article_unlocks_user_id ON public.article_unlocks(user_id);
CREATE INDEX IF NOT EXISTS idx_article_unlocks_article_id ON public.article_unlocks(article_id);

-- Enable RLS on article_unlocks
ALTER TABLE public.article_unlocks ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own unlocks" 
  ON public.article_unlocks FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own unlocks" 
  ON public.article_unlocks FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- 2. Add generation_input to articles to store questionnaire data
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS generation_input JSONB;
