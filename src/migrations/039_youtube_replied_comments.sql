-- Remember YouTube comments the AI already answered, so a comment is replied to once.

CREATE TABLE IF NOT EXISTS youtube_replied_comments (
  comment_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (comment_id)
);
