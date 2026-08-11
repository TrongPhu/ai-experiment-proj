import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { AppService } from './app.service';
import type { ChatRequestDto } from './app.service';

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
}
