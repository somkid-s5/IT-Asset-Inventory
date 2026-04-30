import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    try {
      await this.$connect();
    } catch {
      console.error(
        'Failed to connect to database on startup. Backend will continue running but DB operations will fail.',
      );
    }
  }
}
