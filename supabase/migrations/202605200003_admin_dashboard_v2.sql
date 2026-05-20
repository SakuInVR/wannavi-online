-- Human-in-the-Loop v2: user-managed categories, ASP materials,
-- and article-ASP material junction.

-- 1. User-managed categories (extends the hardcoded site.ts categories)
create table public.user_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  accent text not null default 'from-blue-500 to-cyan-400',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. ASP materials (affiliate products/links the admin likes and wants to use)
create type public.asp_material_status as enum ('active', 'archived');

create table public.asp_materials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  asp_name text not null,
  affiliate_url text,
  image_url text,
  price_note text,
  category_hint text,
  status public.asp_material_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Junction: which ASP materials are assigned to an article
create table public.article_asp_materials (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  asp_material_id uuid not null references public.asp_materials(id) on delete cascade,
  placement_note text,
  created_at timestamptz not null default now(),
  unique (article_id, asp_material_id)
);

create index article_asp_materials_article_id_idx on public.article_asp_materials (article_id);
create index asp_materials_status_idx on public.asp_materials (status);

-- 4. Article generation requests log
create type public.generation_status as enum ('queued', 'running', 'completed', 'failed');

create table public.article_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references public.articles(id) on delete set null,
  title text not null,
  category text not null,
  asp_material_ids uuid[] not null default '{}',
  extra_instructions text,
  status public.generation_status not null default 'queued',
  result_body text,
  error_message text,
  deepseek_tokens integer,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

-- 5. Update articles: add body column for generated content
alter table public.articles
  add column if not exists body text,
  add column if not exists generation_job_id uuid references public.article_generation_jobs(id) on delete set null;
