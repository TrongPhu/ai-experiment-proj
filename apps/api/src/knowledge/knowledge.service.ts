import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { RowDataPacket } from 'mysql2';
import { DatabaseService } from '../database/database.service';

export interface CreateKnowledgeDocumentDto {
  title: string;
  content: string;
}

interface OllamaEmbeddingResponse {
  embedding?: number[];
  embeddings?: number[][];
}

interface KnowledgeDocumentRow extends RowDataPacket {
  id: string;
  title: string;
  source: string | null;
  chunk_count: number;
  created_at: Date;
  updated_at: Date;
}

interface KnowledgeChunkRow extends RowDataPacket {
  id: string;
  document_id: string;
  document_title: string;
  chunk_index: number;
  content: string;
  embedding: string;
}

@Injectable()
export class KnowledgeService {
  private readonly ollamaBaseUrl =
    process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
  private readonly embeddingModel =
    process.env.OLLAMA_EMBEDDING_MODEL ?? 'bge-m3';

  constructor(private readonly database: DatabaseService) {}

  async createDocument(request: CreateKnowledgeDocumentDto) {
    const title = request.title?.trim();
    const content = request.content?.trim();

    if (!title) {
      throw new BadRequestException('title is required.');
    }

    if (!content) {
      throw new BadRequestException('content is required.');
    }

    const chunks = this.chunkText(content);
    const documentId = randomUUID();

    await this.database.execute(
      `
        INSERT INTO knowledge_documents (id, title, source, chunk_count)
        VALUES (?, ?, ?, ?)
      `,
      [documentId, title, 'manual', chunks.length],
    );

    for (const [index, chunk] of chunks.entries()) {
      const embedding = await this.embed(chunk);

      await this.database.execute(
        `
          INSERT INTO knowledge_chunks
            (id, document_id, chunk_index, content, embedding_model, embedding)
          VALUES
            (?, ?, ?, ?, ?, ?)
        `,
        [
          randomUUID(),
          documentId,
          index,
          chunk,
          this.embeddingModel,
          JSON.stringify(embedding),
        ],
      );
    }

    return this.getDocument(documentId);
  }

  async listDocuments() {
    const rows = await this.database.query<KnowledgeDocumentRow[]>(`
      SELECT id, title, source, chunk_count, created_at, updated_at
      FROM knowledge_documents
      ORDER BY updated_at DESC
      LIMIT 100
    `);

    return rows.map((row) => this.mapDocument(row));
  }

  async getDocument(id: string) {
    const rows = await this.database.query<KnowledgeDocumentRow[]>(
      `
        SELECT id, title, source, chunk_count, created_at, updated_at
        FROM knowledge_documents
        WHERE id = ?
        LIMIT 1
      `,
      [id],
    );

    const document = rows[0];
    if (!document) {
      throw new NotFoundException('Knowledge document not found.');
    }

    return this.mapDocument(document);
  }

  async deleteDocument(id: string) {
    const result = await this.database.execute(
      'DELETE FROM knowledge_documents WHERE id = ?',
      [id],
    );

    if (result.affectedRows === 0) {
      throw new NotFoundException('Knowledge document not found.');
    }

    return { ok: true };
  }

  async search(question: string, limit = 4) {
    const query = question.trim();
    if (!query) {
      return [];
    }

    const rows = await this.database.query<KnowledgeChunkRow[]>(
      `
      SELECT
        kc.id,
        kc.document_id,
        kd.title AS document_title,
        kc.chunk_index,
        kc.content,
        kc.embedding
      FROM knowledge_chunks kc
      INNER JOIN knowledge_documents kd ON kd.id = kc.document_id
      WHERE kc.embedding_model = ?
    `,
      [this.embeddingModel],
    );

    if (rows.length === 0) {
      return [];
    }

    const queryEmbedding = await this.embed(query);

    return rows
      .map((row) => ({
        id: row.id,
        documentId: row.document_id,
        documentTitle: row.document_title,
        chunkIndex: row.chunk_index,
        content: row.content,
        score: this.cosineSimilarity(
          queryEmbedding,
          JSON.parse(row.embedding) as number[],
        ),
      }))
      .filter((item) => Number.isFinite(item.score))
      .sort((left, right) => right.score - left.score)
      .slice(0, limit);
  }

  private async embed(input: string) {
    const response = await fetch(`${this.ollamaBaseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.embeddingModel,
        prompt: input,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new BadGatewayException(
        `Ollama embedding returned ${response.status}: ${detail}`,
      );
    }

    const data = (await response.json()) as OllamaEmbeddingResponse;
    const embedding = data.embedding ?? data.embeddings?.[0];

    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new BadGatewayException('Ollama embedding response was empty.');
    }

    return embedding;
  }

  private chunkText(content: string) {
    const normalized = content.replace(/\r\n/g, '\n').replace(/\s+\n/g, '\n');
    const paragraphs = normalized
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .filter(Boolean);
    const chunks: string[] = [];
    let current = '';
    const maxLength = Number(process.env.KNOWLEDGE_CHUNK_SIZE ?? 1200);

    for (const paragraph of paragraphs.length ? paragraphs : [normalized]) {
      if (`${current}\n\n${paragraph}`.trim().length > maxLength && current) {
        chunks.push(current);
        current = paragraph;
      } else {
        current = `${current}\n\n${paragraph}`.trim();
      }
    }

    if (current) {
      chunks.push(current);
    }

    return chunks.flatMap((chunk) => {
      if (chunk.length <= maxLength) {
        return [chunk];
      }

      const parts: string[] = [];
      for (let index = 0; index < chunk.length; index += maxLength) {
        parts.push(chunk.slice(index, index + maxLength));
      }
      return parts;
    });
  }

  private cosineSimilarity(left: number[], right: number[]) {
    if (left.length !== right.length) {
      return Number.NaN;
    }

    let dot = 0;
    let leftMagnitude = 0;
    let rightMagnitude = 0;

    for (let index = 0; index < left.length; index += 1) {
      dot += left[index] * right[index];
      leftMagnitude += left[index] ** 2;
      rightMagnitude += right[index] ** 2;
    }

    const denominator = Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude);
    return denominator === 0 ? Number.NaN : dot / denominator;
  }

  private mapDocument(row: KnowledgeDocumentRow) {
    return {
      id: row.id,
      title: row.title,
      source: row.source,
      chunkCount: row.chunk_count,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }
}
