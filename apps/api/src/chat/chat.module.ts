import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ChatHistoryService } from './chat-history.service';

@Module({
  imports: [DatabaseModule],
  providers: [ChatHistoryService],
  exports: [ChatHistoryService],
})
export class ChatModule {}
