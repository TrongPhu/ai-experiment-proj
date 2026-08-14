import { Injectable, OnModuleInit } from '@nestjs/common';
import { RowDataPacket } from 'mysql2';
import { DatabaseService } from './database.service';

type Migration = {
  id: string;
  name: string;
  up: (database: DatabaseService) => Promise<void>;
};

@Injectable()
export class MigrationService implements OnModuleInit {
  constructor(private readonly database: DatabaseService) {}

  async onModuleInit() {
    await this.database.execute(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id VARCHAR(80) NOT NULL,
        name VARCHAR(180) NOT NULL,
        applied_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    for (const migration of migrations) {
      if (await this.hasRun(migration.id)) {
        continue;
      }

      await migration.up(this.database);
      await this.database.execute(
        `
          INSERT INTO schema_migrations (id, name)
          VALUES (?, ?)
        `,
        [migration.id, migration.name],
      );
    }
  }

  private async hasRun(id: string) {
    const rows = await this.database.query<RowDataPacket[]>(
      `
        SELECT id
        FROM schema_migrations
        WHERE id = ?
        LIMIT 1
      `,
      [id],
    );

    return rows.length > 0;
  }
}

const migrations: Migration[] = [
  {
    id: '001_initial_schema',
    name: 'Create core users, chat, and knowledge tables',
    async up(database) {
      await database.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id CHAR(36) NOT NULL,
          email VARCHAR(180) NOT NULL,
          name VARCHAR(120) NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
          created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          PRIMARY KEY (id),
          UNIQUE KEY uq_users_email (email),
          INDEX idx_users_role (role)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await database.execute(`
        CREATE TABLE IF NOT EXISTS chat_conversations (
          id CHAR(36) NOT NULL,
          user_id CHAR(36) NULL,
          title VARCHAR(180) NOT NULL,
          model VARCHAR(120) NULL,
          created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          deleted_at TIMESTAMP(3) NULL,
          PRIMARY KEY (id),
          INDEX idx_chat_conversations_user_updated_at (user_id, updated_at),
          INDEX idx_chat_conversations_updated_at (updated_at),
          INDEX idx_chat_conversations_deleted_at (deleted_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await database.execute(`
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await database.execute(`
        CREATE TABLE IF NOT EXISTS knowledge_documents (
          id CHAR(36) NOT NULL,
          title VARCHAR(220) NOT NULL,
          source VARCHAR(120) NULL,
          chunk_count INT UNSIGNED NOT NULL DEFAULT 0,
          created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          PRIMARY KEY (id),
          INDEX idx_knowledge_documents_updated_at (updated_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await database.execute(`
        CREATE TABLE IF NOT EXISTS knowledge_chunks (
          id CHAR(36) NOT NULL,
          document_id CHAR(36) NOT NULL,
          chunk_index INT UNSIGNED NOT NULL,
          content LONGTEXT NOT NULL,
          embedding_model VARCHAR(120) NOT NULL,
          embedding JSON NOT NULL,
          created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          PRIMARY KEY (id),
          UNIQUE KEY uq_knowledge_chunks_document_index (document_id, chunk_index),
          INDEX idx_knowledge_chunks_embedding_model (embedding_model),
          CONSTRAINT fk_knowledge_chunks_document
            FOREIGN KEY (document_id)
            REFERENCES knowledge_documents (id)
            ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    },
  },
  {
    id: '002_chat_conversation_user_owner',
    name: 'Link conversations to users',
    async up(database) {
      await ensureColumn(
        database,
        'chat_conversations',
        'user_id',
        'ALTER TABLE chat_conversations ADD COLUMN user_id CHAR(36) NULL AFTER id',
      );
      await ensureIndex(
        database,
        'chat_conversations',
        'idx_chat_conversations_user_updated_at',
        'ALTER TABLE chat_conversations ADD INDEX idx_chat_conversations_user_updated_at (user_id, updated_at)',
      );
      await ensureConstraint(
        database,
        'chat_conversations',
        'fk_chat_conversations_user',
        `
          ALTER TABLE chat_conversations
          ADD CONSTRAINT fk_chat_conversations_user
            FOREIGN KEY (user_id)
            REFERENCES users (id)
            ON DELETE SET NULL
        `,
      );
    },
  },
  {
    id: '003_auth_refresh_tokens',
    name: 'Create refresh token store',
    async up(database) {
      await database.execute(`
        CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
          id CHAR(36) NOT NULL,
          user_id CHAR(36) NOT NULL,
          token_hash VARCHAR(255) NOT NULL,
          expires_at TIMESTAMP(3) NOT NULL,
          revoked_at TIMESTAMP(3) NULL,
          created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          PRIMARY KEY (id),
          UNIQUE KEY uq_auth_refresh_tokens_hash (token_hash),
          INDEX idx_auth_refresh_tokens_user_id (user_id),
          INDEX idx_auth_refresh_tokens_expires_at (expires_at),
          CONSTRAINT fk_auth_refresh_tokens_user
            FOREIGN KEY (user_id)
            REFERENCES users (id)
            ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    },
  },
];

async function ensureColumn(
  database: DatabaseService,
  tableName: string,
  columnName: string,
  alterSql: string,
) {
  const rows = await database.query<RowDataPacket[]>(
    `
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
      LIMIT 1
    `,
    [tableName, columnName],
  );

  if (rows.length === 0) {
    await database.execute(alterSql);
  }
}

async function ensureIndex(
  database: DatabaseService,
  tableName: string,
  indexName: string,
  alterSql: string,
) {
  const rows = await database.query<RowDataPacket[]>(
    `
      SELECT INDEX_NAME
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND INDEX_NAME = ?
      LIMIT 1
    `,
    [tableName, indexName],
  );

  if (rows.length === 0) {
    await database.execute(alterSql);
  }
}

async function ensureConstraint(
  database: DatabaseService,
  tableName: string,
  constraintName: string,
  alterSql: string,
) {
  const rows = await database.query<RowDataPacket[]>(
    `
      SELECT CONSTRAINT_NAME
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND CONSTRAINT_NAME = ?
      LIMIT 1
    `,
    [tableName, constraintName],
  );

  if (rows.length === 0) {
    await database.execute(alterSql);
  }
}
