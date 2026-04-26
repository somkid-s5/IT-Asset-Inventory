import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  async findAll(page: number = 1, limit: number = 100) {
    try {
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        this.prisma.auditLog.findMany({
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
          skip,
          take: limit,
        }),
        this.prisma.auditLog.count(),
      ]);

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('AuditLogsService.findAll Error:', error);
      throw error;
    }
  }
}
