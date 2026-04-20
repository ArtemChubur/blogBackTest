-- Migration: add hashtags support and search indexes

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS hashtags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS post_hashtags (
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  hashtag_id INTEGER REFERENCES hashtags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, hashtag_id)
);

CREATE INDEX IF NOT EXISTS idx_hashtags_name ON hashtags (name);
CREATE INDEX IF NOT EXISTS idx_posts_text_gin ON posts USING gin (text gin_trgm_ops);
