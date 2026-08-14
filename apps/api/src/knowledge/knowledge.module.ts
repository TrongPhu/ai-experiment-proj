import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { KnowledgeService } from './knowledge.service';

@Module({
  imports: [DatabaseModule],
  providers: [KnowledgeService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
