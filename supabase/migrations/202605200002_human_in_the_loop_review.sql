-- Human-in-the-Loop review system:
-- article_feedbacks table + review_status on articles.

-- Add review_status column to articles (pending / approved / rejected)
alter table public.articles
  add column review_status text not null default 'pending';

create index articles_review_status_idx on public.articles (review_status);

-- Feedback from human reviewers, used to improve future AI generation
create table public.article_feedbacks (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  category text not null,
  feedback_comment text not null,
  rejected_at timestamptz not null default now()
);

create index article_feedbacks_category_idx on public.article_feedbacks (category);
create index article_feedbacks_article_id_idx on public.article_feedbacks (article_id);

-- Helper: get up to 3 past reject reasons for a given category
create or replace function public.get_category_feedback(target_category text, limit_count integer default 3)
returns table (
  feedback_comment text,
  rejected_at timestamptz
)
language sql
security definer
as $$
  select feedback_comment, rejected_at
  from public.article_feedbacks
  where category = target_category
  order by rejected_at desc
  limit limit_count;
$$;
