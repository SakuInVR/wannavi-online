-- Migration: RLS policies for articles table
-- Path: supabase/migrations/202605270003_articles_rls_policies.sql

-- 1. Enable RLS on articles table (just in case it's not enabled)
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- 2. Create policy to allow public select for approved/published articles
CREATE POLICY "Allow public read published articles" 
  ON public.articles FOR SELECT 
  USING (review_status = 'approved' AND pipeline_state = 'published');

-- 3. Create policies for users to manage their own generated articles
CREATE POLICY "Users can select their own articles" 
  ON public.articles FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own articles" 
  ON public.articles FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own articles" 
  ON public.articles FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own articles" 
  ON public.articles FOR DELETE 
  USING (auth.uid() = user_id);
