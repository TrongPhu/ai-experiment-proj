import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { RowDataPacket } from 'mysql2';
import { DatabaseService } from './database.service';
import type { ChatMessage } from './app.service';

export interface ChatConversationSummary {
  id: string;
  title: string;
  model: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ConversationRow extends RowDataPacket {
  id: string;
  user_id: string | null;
  title: string;
  model: string | null;
  created_at: Date;
  updated_at: Date;
}

interface MessageRow extends RowDataPacket {
  id: string;
  role: ChatMessage['role'];
  content: string;
  model: string | null;
  total_duration: number | null;
  created_at: Date;
}

@Injectable()
export class ChatHistoryService {
  constructor(private readonly database: DatabaseService) {}

  async listConversations(userId: string): Promise<ChatConversationSummary[]> {
    const rows = await this.database.query<ConversationRow[]>(
      `
        SELECT id, user_id, title, model, created_at, updated_at
        FROM chat_conversations
        WHERE user_id = ? AND deleted_at IS NULL
        ORDER BY updated_at DESC
        LIMIT 100
      `,
      [userId],
    );

    return rows.map((row) => this.mapConversation(row));
  }

  async createConversation(
    userId: string,
    title: string,
    model: string | null,
  ) {
    const id = randomUUID();

    await this.database.execute(
      `
        INSERT INTO chat_conversations (id, user_id, title, model)
        VALUES (?, ?, ?, ?)
      `,
      [id, userId, this.normalizeTitle(title), model],
    );

    return this.getConversation(userId, id);
  }

  async getConversation(userId: string, id: string) {
    const rows = await this.database.query<ConversationRow[]>(
      `
        SELECT id, user_id, title, model, created_at, updated_at
        FROM chat_conversations
        WHERE id = ? AND user_id = ? AND deleted_at IS NULL
        LIMIT 1
      `,
      [id, userId],
    );

    const conversation = rows[0];
    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }

    const messageRows = await this.database.query<MessageRow[]>(
      `
        SELECT id, role, content, model, total_duration, created_at
        FROM chat_messages
        WHERE conversation_id = ?
        ORDER BY created_at ASC
      `,
      [id],
    );

    return {
      ...this.mapConversation(conversation),
      messages: messageRows.map((row) => ({
        id: row.id,
        role: row.role,
        content: row.content,
        model: row.model,
        totalDuration: row.total_duration,
        createdAt: row.created_at.toISOString(),
      })),
    };
  }

  async softDeleteConversation(userId: string, id: string) {
    const result = await this.database.execute(
      `
        UPDATE chat_conversations
        SET deleted_at = CURRENT_TIMESTAMP(3)
        WHERE id = ? AND user_id = ? AND deleted_at IS NULL
      `,
      [id, userId],
    );

    if (result.affectedRows === 0) {
      throw new NotFoundException('Conversation not found.');
    }

    return { ok: true };
  }

  async addMessage(
    conversationId: string,
    message: ChatMessage,
    metadata?: { model?: string; totalDuration?: number },
  ) {
    const id = randomUUID();

    await this.database.execute(
      `
        INSERT INTO chat_messages
          (id, conversation_id, role, content, model, total_duration)
        VALUES
          (?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        conversationId,
        message.role,
        message.content,
        metadata?.model ?? null,
        metadata?.totalDuration ?? null,
      ],
    );

    await this.database.execute(
      `
        UPDATE chat_conversations
        SET updated_at = CURRENT_TIMESTAMP(3), model = COALESCE(?, model)
        WHERE id = ?
      `,
      [metadata?.model ?? null, conversationId],
    );

    return id;
  }

  titleFromMessage(content: string) {
    return this.normalizeTitle(content);
  }

  private normalizeTitle(title: string) {
    const compact = title.replace(/\s+/g, ' ').trim();
    return compact.length > 80
      ? `${compact.slice(0, 77)}...`
      : compact || 'New chat';
  }

  private mapConversation(row: ConversationRow): ChatConversationSummary {
    return {
      id: row.id,
      title: row.title,
      model: row.model,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }
}
