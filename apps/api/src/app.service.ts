import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { AuthService } from './auth/auth.service';
import type {
  AuthUser,
  ChangePasswordDto,
  GoogleLoginDto,
  LoginDto,
  PublicRegisterDto,
  RefreshTokenDto,
  RegisterUserDto,
} from './auth/auth.service';
import { ChatHistoryService } from './chat/chat-history.service';
import { KnowledgeService } from './knowledge/knowledge.service';
import type { CreateKnowledgeDocumentDto } from './knowledge/knowledge.service';

type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatRequestDto {
  messages: ChatMessage[];
  model?: string;
  conversationId?: string;
}

interface OllamaChatResponse {
  model?: string;
  created_at?: string;
  message?: ChatMessage;
  total_duration?: number;
}

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly auth: AuthService,
    private readonly chatHistory: ChatHistoryService,
    private readonly knowledge: KnowledgeService,
  ) {}

  private readonly ollamaBaseUrl =
    process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
  private readonly defaultModel = process.env.OLLAMA_MODEL ?? 'gemma3:1b';
  private readonly requestTimeoutMs = Number(
    process.env.OLLAMA_TIMEOUT_MS ?? 300_000,
  );
  private readonly ollamaNumGpu = Number(process.env.OLLAMA_NUM_GPU ?? 0);

  async chat(request: ChatRequestDto, user?: AuthUser) {
    const normalizedMessages = this.normalizeMessages(request.messages);
    const model = request.model?.trim() || this.defaultModel;
    const userMessage = this.getLatestUserMessage(normalizedMessages);
    const context = user
      ? await this.searchKnowledgeForChat(userMessage.content)
      : [];
    const messages = this.withDefaultSystemPrompt(normalizedMessages, context);
    const conversationId = user
      ? await this.resolveConversationId(request, user, userMessage, model)
      : null;

    if (conversationId) {
      await this.chatHistory.addMessage(conversationId, userMessage);
    }
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
          options: {
            num_gpu: this.ollamaNumGpu,
          },
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

      const assistantMessage = {
        role: 'assistant' as const,
        content: answer,
      };

      if (conversationId) {
        await this.chatHistory.addMessage(conversationId, assistantMessage, {
          model: data.model ?? model,
          totalDuration: data.total_duration,
        });
      }

      return {
        conversationId,
        message: assistantMessage,
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

  listConversations(user: AuthUser) {
    return this.chatHistory.listConversations(user.id);
  }

  getConversation(user: AuthUser, id: string) {
    return this.chatHistory.getConversation(user.id, id);
  }

  deleteConversation(user: AuthUser, id: string) {
    return this.chatHistory.softDeleteConversation(user.id, id);
  }

  login(request: LoginDto) {
    return this.auth.login(request);
  }

  refreshSession(request: RefreshTokenDto) {
    return this.auth.refreshSession(request);
  }

  logout(user: AuthUser, refreshToken?: string) {
    return this.auth.logout(user, refreshToken);
  }

  changePassword(user: AuthUser, request: ChangePasswordDto) {
    return this.auth.changePassword(user, request);
  }

  registerPublic(request: PublicRegisterDto) {
    return this.auth.registerPublic(request);
  }

  loginWithGoogle(request: GoogleLoginDto) {
    return this.auth.loginWithGoogle(request);
  }

  googleAuthConfig() {
    return {
      clientId:
        process.env.GOOGLE_CLIENT_ID?.trim() ||
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ||
        null,
    };
  }

  registerUser(request: RegisterUserDto, actor?: AuthUser) {
    return this.auth.register(request, actor);
  }

  listUsers() {
    return this.auth.listUsers();
  }

  listKnowledgeDocuments() {
    return this.knowledge.listDocuments();
  }

  createKnowledgeDocument(request: CreateKnowledgeDocumentDto) {
    return this.knowledge.createDocument(request);
  }

  deleteKnowledgeDocument(id: string) {
    return this.knowledge.deleteDocument(id);
  }

  searchKnowledge(query: string) {
    return this.knowledge.search(query);
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

  private withDefaultSystemPrompt(
    messages: ChatMessage[],
    context: Awaited<ReturnType<KnowledgeService['search']>>,
  ) {
    if (messages.some((message) => message.role === 'system')) {
      return messages;
    }

    const contextBlock =
      context.length > 0
        ? context
            .map(
              (item, index) =>
                `[${index + 1}] ${item.documentTitle}\n${item.content}`,
            )
            .join('\n\n')
        : 'No private knowledge context was found.';

    return [
      {
        role: 'system' as const,
        content: [
          'You are a concise Vietnamese AI research assistant.',
          'Use the private knowledge context when it is relevant to the user question.',
          'If the context is missing or not relevant, say that the private data does not contain enough information and then answer from general knowledge only if useful.',
          'Do not invent facts from the private data.',
          '',
          'Private knowledge context:',
          contextBlock,
        ].join('\n'),
      },
      ...messages,
    ];
  }

  private async searchKnowledgeForChat(question: string) {
    try {
      return await this.knowledge.search(question);
    } catch (error) {
      this.logger.warn(
        `Private knowledge search failed; continuing without RAG context. ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      return [];
    }
  }

  private getLatestUserMessage(messages: ChatMessage[]) {
    const userMessage = [...messages]
      .reverse()
      .find((message) => message.role === 'user');

    if (!userMessage) {
      throw new BadRequestException('messages must include a user message.');
    }

    return userMessage;
  }

  private async resolveConversationId(
    request: ChatRequestDto,
    user: AuthUser,
    userMessage: ChatMessage,
    model: string,
  ) {
    const requestedConversationId = request.conversationId?.trim();

    if (requestedConversationId) {
      return (
        await this.chatHistory.getConversation(user.id, requestedConversationId)
      ).id;
    }

    return (
      await this.chatHistory.createConversation(
        user.id,
        this.chatHistory.titleFromMessage(userMessage.content),
        model,
      )
    ).id;
  }
}
