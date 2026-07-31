import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  getLiveness() {
    return {
      status: 'ok' as const,
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness() {
    const startedAt = Date.now();

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok' as const,
        ready: true,
        timestamp: new Date().toISOString(),
        dependencies: {
          database: {
            status: 'ok' as const,
            latencyMs: Date.now() - startedAt,
          },
        },
      };
    } catch {
      return {
        status: 'not_ready' as const,
        ready: false,
        timestamp: new Date().toISOString(),
        dependencies: {
          database: {
            status: 'unavailable' as const,
          },
        },
      };
    }
  }
}
