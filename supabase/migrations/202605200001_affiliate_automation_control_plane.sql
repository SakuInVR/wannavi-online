-- Wannavi affiliate automation control plane.
-- This migration is intentionally app-facing and conservative: MDX can remain the
-- export format, while Supabase becomes the durable state store for research,
-- review, monetization, publishing, and improvement jobs.

create type public.article_pipeline_state as enum (
  'idea',
  'researched',
  'drafted',
  'reviewed',
  'monetized',
  'ready',
  'published',
  'verified',
  'improving'
);

create type public.affiliate_program_status as enum (
  'candidate',
  'applied',
  'approved',
  'rejected',
  'expired'
);

create type public.publish_job_status as enum (
  'queued',
  'deploying',
  'succeeded',
  'failed',
  'rate_limited'
);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null,
  reader_goal text not null,
  search_intent text not null,
  priority integer not null default 50,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references public.topics(id) on delete set null,
  slug text not null unique,
  title text not null,
  description text not null,
  category text not null,
  affiliate_intent text not null default 'medium',
  pipeline_state public.article_pipeline_state not null default 'idea',
  mdx_path text,
  reviewed_by text,
  tested_by text,
  last_verified_at timestamptz,
  published_at date,
  updated_at date,
  created_at timestamptz not null default now(),
  state_updated_at timestamptz not null default now()
);

create table public.research_sources (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  source_type text not null,
  url text not null,
  title text,
  publisher text,
  captured_at timestamptz not null default now(),
  unique (article_id, url)
);

create table public.source_analyses (
  id uuid primary key default gen_random_uuid(),
  research_source_id uuid not null references public.research_sources(id) on delete cascade,
  model_name text,
  summary text not null,
  useful_points jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.article_claims (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  claim text not null,
  evidence_source_ids uuid[] not null default '{}',
  verification_status text not null default 'unverified',
  risk_level text not null default 'medium',
  created_at timestamptz not null default now()
);

create table public.buyer_decisions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  decision_label text not null,
  buy_when text not null,
  do_not_buy_when text not null,
  budget_note text,
  created_at timestamptz not null default now()
);

create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references public.articles(id) on delete set null,
  job_type text not null,
  model_name text not null,
  prompt_version text,
  input_tokens integer,
  output_tokens integer,
  estimated_cost numeric(12, 6),
  status text not null,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table public.quality_reviews (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  reviewer text not null,
  result text not null,
  checklist jsonb not null default '{}'::jsonb,
  blockers jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.affiliate_programs (
  id uuid primary key default gen_random_uuid(),
  asp text not null,
  program_name text not null,
  status public.affiliate_program_status not null,
  commission_note text,
  approval_note text,
  captured_at timestamptz not null default now(),
  next_review_at date,
  unique (asp, program_name)
);

create table public.affiliate_program_snapshots (
  id uuid primary key default gen_random_uuid(),
  affiliate_program_id uuid references public.affiliate_programs(id) on delete set null,
  snapshot_key text not null unique,
  evidence_type text not null,
  evidence_note text not null,
  evidence_path text,
  captured_urls jsonb not null default '[]'::jsonb,
  captured_at timestamptz not null default now()
);

create table public.asp_opportunities (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  opportunity_key text not null unique,
  status text not null default 'open',
  primary_asp text not null,
  asps jsonb not null default '[]'::jsonb,
  search_terms jsonb not null default '[]'::jsonb,
  product_angle text not null,
  required_evidence jsonb not null default '[]'::jsonb,
  next_action text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ad_creatives (
  id uuid primary key default gen_random_uuid(),
  affiliate_program_id uuid references public.affiliate_programs(id) on delete set null,
  creative_key text not null unique,
  title text not null,
  description text not null,
  status public.affiliate_program_status not null,
  image_url text,
  image_alt text,
  click_url text,
  impression_url text,
  width integer,
  height integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.article_ad_slots (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  ad_creative_id uuid not null references public.ad_creatives(id) on delete cascade,
  slot_key text not null,
  placement_note text,
  created_at timestamptz not null default now(),
  unique (article_id, ad_creative_id, slot_key)
);

create table public.publish_jobs (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references public.articles(id) on delete set null,
  commit_sha text,
  vercel_project text,
  deployment_url text,
  status public.publish_job_status not null default 'queued',
  error_message text,
  queued_at timestamptz not null default now(),
  finished_at timestamptz
);

create table public.deployment_checks (
  id uuid primary key default gen_random_uuid(),
  publish_job_id uuid references public.publish_jobs(id) on delete set null,
  check_name text not null,
  target_url text,
  status text not null,
  details jsonb not null default '{}'::jsonb,
  checked_at timestamptz not null default now()
);

create table public.improvement_tasks (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references public.articles(id) on delete cascade,
  task_type text not null,
  priority integer not null,
  reason text not null,
  action text not null,
  status text not null default 'open',
  source text not null default 'automation',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index articles_pipeline_state_idx on public.articles (pipeline_state);
create index articles_category_idx on public.articles (category);
create index research_sources_article_id_idx on public.research_sources (article_id);
create index article_claims_article_id_idx on public.article_claims (article_id);
create index quality_reviews_article_id_idx on public.quality_reviews (article_id);
create index asp_opportunities_status_idx on public.asp_opportunities (status);
create index improvement_tasks_status_priority_idx on public.improvement_tasks (status, priority desc);
