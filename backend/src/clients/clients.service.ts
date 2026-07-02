import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async create(createClientDto: CreateClientDto, userId?: string) {
    const created = await this.prisma.client.create({
      data: createClientDto,
    });

    if (userId) {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: AuditAction.CREATE_CLIENT,
          targetId: created.id,
          details: JSON.stringify({ name: created.name }),
        },
      });
    }

    return created;
  }

  async findAll() {
    return this.prisma.client.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async search(query: string) {
    return this.prisma.client.findMany({
      where: {
        name: {
          contains: query,
          mode: 'insensitive',
        },
      },
      take: 10,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
    });
    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }
    return client;
  }

  async update(id: string, updateClientDto: UpdateClientDto, userId?: string) {
    await this.findOne(id);
    const updated = await this.prisma.client.update({
      where: { id },
      data: updateClientDto,
    });

    if (userId) {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: AuditAction.UPDATE_CLIENT,
          targetId: id,
          details: JSON.stringify({ name: updated.name }),
        },
      });
    }

    return updated;
  }

  async remove(id: string, userId?: string) {
    const client = await this.findOne(id);
    const deleted = await this.prisma.client.delete({
      where: { id },
    });

    if (userId) {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: AuditAction.DELETE_CLIENT,
          targetId: id,
          details: JSON.stringify({ name: client.name }),
        },
      });
    }

    return deleted;
  }

  // Internal helper used by the ticket flow. Auto-created clients during
  // ticket submission are not audited per-user (created by the system).
  async findOrCreateByName(name: string) {
    const existing = await this.prisma.client.findUnique({
      where: { name },
    });
    if (existing) return existing;
    return this.prisma.client.create({ data: { name } });
  }
}
