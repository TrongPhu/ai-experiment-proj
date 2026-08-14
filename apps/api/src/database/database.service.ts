import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  createPool,
  Pool,
  ResultSetHeader,
  RowDataPacket,
} from 'mysql2/promise';

type DbParam = string | number | Date | null;

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool!: Pool;

  onModuleInit() {
    this.pool = createPool({
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER ?? 'root',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_NAME ?? 'ai-experiment-proj',
      waitForConnections: true,
      connectionLimit: Number(process.env.DB_CONNECTION_LIMIT ?? 10),
    });
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }

  async query<T extends RowDataPacket[]>(sql: string, params?: DbParam[]) {
    const [rows] = await this.pool.query<T>(sql, params);
    return rows;
  }

  async execute(sql: string, params?: DbParam[]) {
    const [result] = await this.pool.execute<ResultSetHeader>(sql, params);
    return result;
  }
}
