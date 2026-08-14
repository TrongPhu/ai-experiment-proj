import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { MigrationService } from './migration.service';

@Module({
  providers: [DatabaseService, MigrationService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
