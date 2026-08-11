import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';

type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatRequestDto {
  messages: ChatMessage[];
  model?: string;
}

interface OllamaChatResponse {
  model?: string;
  created_at?: string;
  message?: ChatMessage;
  total_duration?: number;
}

@Injectable()
export class AppService {
  private readonly ollamaBaseUrl =
    process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
  private readonly defaultModel = process.env.OLLAMA_MODEL ?? 'gemma3:1b';
  private readonly requestTimeoutMs = Number(
    process.env.OLLAMA_TIMEOUT_MS ?? 300_000,
  );

  async chat(request: ChatRequestDto) {
    const messages = this.withDefaultSystemPrompt(
      this.normalizeMessages(request.messages),
    );
    const model = request.model?.trim() || this.defaultModel;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const response = await fetch(`${this.ollamaBaseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new BadGatewayException(
          `Ollama returned ${response.status}: ${detail}`,
        );
      }

      const data = (await response.json()) as OllamaChatResponse;
      const answer = data.message?.content?.trim();

      if (!answer) {
        throw new BadGatewayException('Ollama response did not include text.');
      }

      return {
        message: {
          role: 'assistant' as const,
          content: answer,
        },
        model: data.model ?? model,
        createdAt: data.created_at ?? new Date().toISOString(),
        totalDuration: data.total_duration,
      };
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new BadGatewayException('Ollama request timed out.');
      }

      throw new BadGatewayException(
        error instanceof Error ? error.message : 'Unable to reach Ollama.',
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  health() {
    return {
      ok: true,
      ollamaBaseUrl: this.ollamaBaseUrl,
      defaultModel: this.defaultModel,
    };
  }

  private normalizeMessages(messages: ChatMessage[] | undefined) {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new BadRequestException('messages must contain at least one item.');
    }

    return messages.map((message, index) => {
      if (
        !message ||
        !['system', 'user', 'assistant'].includes(message.role) ||
        typeof message.content !== 'string' ||
        !message.content.trim()
      ) {
        throw new BadRequestException(`Invalid message at index ${index}.`);
      }

      return {
        role: message.role,
        content: message.content.trim(),
      };
    });
  }

  private withDefaultSystemPrompt(messages: ChatMessage[]) {
    if (messages.some((message) => message.role === 'system')) {
      return messages;
    }

    return [
      {
        role: 'system' as const,
        content:
          'You are a concise Vietnamese AI research assistant. Answer the user directly, avoid hallucinated news, and say when you are unsure.',
      },
      ...messages,
    ];
  }
}
