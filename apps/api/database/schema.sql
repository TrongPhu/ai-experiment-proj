CREATE DATABASE IF NOT EXISTS `ai-experiment-proj`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `ai-experiment-proj`;

CREATE TABLE IF NOT EXISTS chat_conversations (
  id CHAR(36) NOT NULL,
  title VARCHAR(180) NOT NULL,
  model VARCHAR(120) NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at TIMESTAMP(3) NULL,
  PRIMARY KEY (id),
  INDEX idx_chat_conversations_updated_at (updated_at),
  INDEX idx_chat_conversations_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_messages (
  id CHAR(36) NOT NULL,
  conversation_id CHAR(36) NOT NULL,
  role ENUM('system', 'user', 'assistant') NOT NULL,
  content LONGTEXT NOT NULL,
  model VARCHAR(120) NULL,
  total_duration BIGINT UNSIGNED NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_chat_messages_conversation_created_at (conversation_id, created_at),
  CONSTRAINT fk_chat_messages_conversation
    FOREIGN KEY (conversation_id)
    REFERENCES chat_conversations (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
