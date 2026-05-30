-- SQL migration for Wannavi AI Interactive Learning System

-- 1. Extend profiles table with Stripe subscription data
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP WITH TIME ZONE;

-- Create index for subscription lookups
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON public.profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription ON public.profiles(stripe_subscription_id);

-- 2. Create user_projects table
CREATE TABLE IF NOT EXISTS public.user_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT uq_user_article UNIQUE (user_id, article_id)
);

-- Enable RLS for user_projects
ALTER TABLE public.user_projects ENABLE ROW LEVEL SECURITY;

-- Create policy: users can only see their own projects
CREATE POLICY select_own_projects ON public.user_projects
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy: users can create their own projects
CREATE POLICY insert_own_projects ON public.user_projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy: users can update their own projects
CREATE POLICY update_own_projects ON public.user_projects
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policy: users can delete their own projects
CREATE POLICY delete_own_projects ON public.user_projects
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_projects_user_id ON public.user_projects(user_id);

-- 3. Create project_steps table
CREATE TABLE IF NOT EXISTS public.project_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.user_projects(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL CHECK (step_index >= 0 AND step_index <= 4),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done')),
  target_date TIMESTAMP WITH TIME ZONE,
  memo TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT uq_project_step UNIQUE (project_id, step_index)
);

-- Enable RLS for project_steps
ALTER TABLE public.project_steps ENABLE ROW LEVEL SECURITY;

-- Create policy: users can see steps of their own projects
CREATE POLICY select_own_project_steps ON public.project_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_projects p
      WHERE p.id = project_steps.project_id AND p.user_id = auth.uid()
    )
  );

-- Create policy: users can insert steps of their own projects
CREATE POLICY insert_own_project_steps ON public.project_steps
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_projects p
      WHERE p.id = project_steps.project_id AND p.user_id = auth.uid()
    )
  );

-- Create policy: users can update steps of their own projects
CREATE POLICY update_own_project_steps ON public.project_steps
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_projects p
      WHERE p.id = project_steps.project_id AND p.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_project_steps_project_id ON public.project_steps(project_id);

-- 4. Create project_messages table (AI Mentor Chat Messages)
CREATE TABLE IF NOT EXISTS public.project_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.user_projects(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL CHECK (step_index >= 0 AND step_index <= 4),
  sender TEXT NOT NULL CHECK (sender IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for project_messages
ALTER TABLE public.project_messages ENABLE ROW LEVEL SECURITY;

-- Create policy: users can see messages of their own projects
CREATE POLICY select_own_project_messages ON public.project_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_projects p
      WHERE p.id = project_messages.project_id AND p.user_id = auth.uid()
    )
  );

-- Create policy: users can insert messages into their own projects
CREATE POLICY insert_own_project_messages ON public.project_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_projects p
      WHERE p.id = project_messages.project_id AND p.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_project_messages_lookup ON public.project_messages(project_id, step_index);
