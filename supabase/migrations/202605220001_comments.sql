-- Migration: comments table
-- 記事へのコメント機能。匿名/実名を選択可能。投稿即時反映。

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  author_name TEXT,          -- NULL = 匿名, 入力があれば表示名
  body TEXT NOT NULL,        -- コメント本文
  is_anonymous BOOLEAN NOT NULL DEFAULT false, -- 匿名で投稿するか
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 記事ごとのコメント取得（新着順）
CREATE INDEX IF NOT EXISTS idx_comments_article
  ON comments(article_id, created_at DESC);

-- 管理画面用：全件新着順
CREATE INDEX IF NOT EXISTS idx_comments_created
  ON comments(created_at DESC);
