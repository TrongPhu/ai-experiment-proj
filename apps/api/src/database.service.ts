import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  createPool,
  Pool,
  ResultSetHeader,
  RowDataPacket,
} from 'mysql2/promise';

type DbParam = string | number | null;

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool!: Pool;

  async onModuleInit() {
    this.pool = createPool({
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER ?? 'root',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_NAME ?? 'ai-experiment-proj',
      waitForConnections: true,
      connectionLimit: Number(process.env.DB_CONNECTION_LIMIT ?? 10),
    });

    await this.ensureSchema();
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }

  async query<T extends RowDataPacket[]>(sql: string, params?: DbParam[]) {
    const [rows] = await this.pool.query<T>(sql, params);
    return rows;
  }

  async execute(sql: string, params?: DbParam[]) {
    const [result] = await this.pool.execute<ResultSetHeader>(sql, params);
    return result;
  }

  private async ensureSchema() {
    await this.execute(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await this.execute(`
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

    await this.execute(`
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

    await this.execute(`
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
  }
}
