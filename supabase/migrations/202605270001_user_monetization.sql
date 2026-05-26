-- Migration: User profiles, credit tracking, Stripe purchases, and article ownership
-- Path: supabase/migrations/202605270001_user_monetization.sql

-- 1. Create public.profiles table to track user credit balance
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  credits INTEGER NOT NULL DEFAULT 1, -- 1 free credit upon signup
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index profiles by email
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Enable Row Level Security (RLS) on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- 2. Trigger function to automatically create a profile for new auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, credits)
  VALUES (new.id, new.email, 1);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Create public.purchases table to log Stripe transaction events
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_session_id TEXT UNIQUE,
  amount_total INTEGER, -- in JPY
  credits_added INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL, -- 'completed', 'pending'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index purchases by user
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON public.purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_stripe_session_id ON public.purchases(stripe_session_id);

-- Enable RLS on purchases
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Purchases RLS policies
CREATE POLICY "Users can view their own purchases" 
  ON public.purchases FOR SELECT 
  USING (auth.uid() = user_id);

-- 4. Update public.articles to link user ownership and retake counts
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS free_retake_used BOOLEAN NOT NULL DEFAULT false;

-- Index articles by user_id
CREATE INDEX IF NOT EXISTS idx_articles_user_id ON public.articles(user_id);
