import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatHistoryService } from './chat-history.service';
import { KnowledgeService } from './knowledge.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: ChatHistoryService,
          useValue: {},
        },
        {
          provide: KnowledgeService,
          useValue: {},
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('returns service metadata', () => {
      const result = appController.health();

      expect(result.ok).toBe(true);
      expect(typeof result.defaultModel).toBe('string');
      expect(result.defaultModel.length).toBeGreaterThan(0);
      expect(result.ollamaBaseUrl).toBe('http://localhost:11434');
    });
  });
});
