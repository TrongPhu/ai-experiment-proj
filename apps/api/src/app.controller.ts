import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { AppService } from './app.service';
import type { ChatRequestDto } from './app.service';
import { OptionalAuth, RequiredRole } from './auth/auth.guard';
import type { AuthenticatedRequest } from './auth/auth.guard';
import type {
  ChangePasswordDto,
  GoogleLoginDto,
  LoginDto,
  PublicRegisterDto,
  RefreshTokenDto,
  RegisterUserDto,
} from './auth/auth.service';
import type { CreateKnowledgeDocumentDto } from './knowledge/knowledge.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  health() {
    return this.appService.health();
  }

  @Post('chat')
  @OptionalAuth()
  chat(
    @Body() request: ChatRequestDto,
    @Req() httpRequest: AuthenticatedRequest,
  ) {
    return this.appService.chat(request, httpRequest.user);
  }

  @Post('auth/login')
  login(@Body() request: LoginDto) {
    return this.appService.login(request);
  }

  @Post('auth/refresh')
  refresh(@Body() request: RefreshTokenDto) {
    return this.appService.refreshSession(request);
  }

  @Post('auth/logout')
  @RequiredRole('user')
  logout(
    @Body() request: Partial<RefreshTokenDto>,
    @Req() httpRequest: AuthenticatedRequest,
  ) {
    return this.appService.logout(httpRequest.user!, request.refreshToken);
  }

  @Post('auth/change-password')
  @RequiredRole('user')
  changePassword(
    @Body() request: ChangePasswordDto,
    @Req() httpRequest: AuthenticatedRequest,
  ) {
    return this.appService.changePassword(httpRequest.user!, request);
  }

  @Post('auth/register')
  register(@Body() request: PublicRegisterDto) {
    return this.appService.registerPublic(request);
  }

  @Post('auth/google')
  googleLogin(@Body() request: GoogleLoginDto) {
    return this.appService.loginWithGoogle(request);
  }

  @Get('auth/google/config')
  googleConfig() {
    return this.appService.googleAuthConfig();
  }

  @Get('auth/me')
  @RequiredRole('user')
  me(@Req() request: AuthenticatedRequest) {
    return request.user;
  }

  @Get('users')
  @RequiredRole('admin')
  listUsers() {
    return this.appService.listUsers();
  }

  @Post('users')
  @RequiredRole('admin')
  createUser(
    @Body() request: RegisterUserDto,
    @Req() httpRequest: AuthenticatedRequest,
  ) {
    return this.appService.registerUser(request, httpRequest.user);
  }

  @Get('conversations')
  @RequiredRole('user')
  listConversations(@Req() request: AuthenticatedRequest) {
    return this.appService.listConversations(request.user!);
  }

  @Get('conversations/:id')
  @RequiredRole('user')
  getConversation(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.appService.getConversation(request.user!, id);
  }

  @Delete('conversations/:id')
  @RequiredRole('user')
  deleteConversation(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.appService.deleteConversation(request.user!, id);
  }

  @Get('knowledge/documents')
  @RequiredRole('admin')
  listKnowledgeDocuments() {
    return this.appService.listKnowledgeDocuments();
  }

  @Post('knowledge/documents')
  @RequiredRole('admin')
  createKnowledgeDocument(@Body() request: CreateKnowledgeDocumentDto) {
    return this.appService.createKnowledgeDocument(request);
  }

  @Delete('knowledge/documents/:id')
  @RequiredRole('admin')
  deleteKnowledgeDocument(@Param('id') id: string) {
    return this.appService.deleteKnowledgeDocument(id);
  }

  @Get('knowledge/search')
  @RequiredRole('admin')
  searchKnowledge(@Query('q') query: string) {
    return this.appService.searchKnowledge(query ?? '');
  }
}
