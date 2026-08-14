import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatHistoryService } from './chat-history.service';
import { DatabaseService } from './database.service';
import { KnowledgeService } from './knowledge.service';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [AppController],
  providers: [
    AppService,
    ChatHistoryService,
    DatabaseService,
    KnowledgeService,
  ],
})
export class AppModule {}
