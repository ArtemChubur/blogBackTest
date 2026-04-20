-- Add subscriptions table for user follow relationships
CREATE TABLE IF NOT EXISTS subscriptions (
  subscriber_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  following_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (subscriber_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_subscriber_id ON subscriptions(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_following_id ON subscriptions(following_id);
