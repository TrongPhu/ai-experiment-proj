import { Body, Controller, Get, Post } from '@nestjs/common';
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
}
