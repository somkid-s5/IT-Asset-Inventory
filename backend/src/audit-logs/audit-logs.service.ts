import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.auditLog.findMany({
      orderBy: {
        timestamp: 'desc',
      },
      include: {
        user: {
          select: {
            username: true,
            displayName: true,
            avatarSeed: true,
            avatarImage: true,
          },
        },
      },
      take: 1000, // Limit to recent 1000 logs for performance
    });
  }
}
