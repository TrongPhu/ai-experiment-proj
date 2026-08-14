import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { AppService } from './app.service';
import type { ChatRequestDto } from './app.service';
import type { CreateKnowledgeDocumentDto } from './knowledge.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  health() {
    return this.appService.health();
  }

  @Post('chat')
  chat(@Body() request: ChatRequestDto) {
    return this.appService.chat(request);
  }

  @Get('conversations')
  listConversations() {
    return this.appService.listConversations();
  }

  @Get('conversations/:id')
  getConversation(@Param('id') id: string) {
    return this.appService.getConversation(id);
  }

  @Delete('conversations/:id')
  deleteConversation(@Param('id') id: string) {
    return this.appService.deleteConversation(id);
  }

  @Get('knowledge/documents')
  listKnowledgeDocuments() {
    return this.appService.listKnowledgeDocuments();
  }

  @Post('knowledge/documents')
  createKnowledgeDocument(@Body() request: CreateKnowledgeDocumentDto) {
    return this.appService.createKnowledgeDocument(request);
  }

  @Delete('knowledge/documents/:id')
  deleteKnowledgeDocument(@Param('id') id: string) {
    return this.appService.deleteKnowledgeDocument(id);
  }

  @Get('knowledge/search')
  searchKnowledge(@Query('q') query: string) {
    return this.appService.searchKnowledge(query ?? '');
  }
}
