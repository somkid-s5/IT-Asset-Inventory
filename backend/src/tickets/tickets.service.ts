import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { ClientsService } from '../clients/clients.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  TicketStatus,
  TicketPriority,
  Prisma,
  Ticket,
  AuditAction,
} from '@prisma/client';

type TicketWithRelations = Ticket & {
  client?: any;
  assignee?: any;
  creator?: any;
  asset?: any;
  vm?: any;
  comments?: any[];
};

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private clientsService: ClientsService,
    private notificationsService: NotificationsService,
  ) {}

  private async generateTicketNo(): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}`;

    // Find the latest ticket number for this month
    const lastTicket = await this.prisma.ticket.findFirst({
      where: {
        ticketNo: {
          startsWith: `SD-${yearMonth}-`,
        },
      },
      orderBy: {
        ticketNo: 'desc',
      },
    });

    let nextNumber = 1;
    if (lastTicket) {
      const parts = lastTicket.ticketNo.split('-');
      const lastSeq = parts.pop();
      if (lastSeq) {
        nextNumber = parseInt(lastSeq) + 1;
      }
    }

    return `SD-${yearMonth}-${nextNumber.toString().padStart(3, '0')}`;
  }

  private withSla(ticket: TicketWithRelations) {
    if (!ticket) return null;

    const slaLimits: Record<TicketPriority, number> = {
      CRITICAL: 4,
      HIGH: 12,
      MEDIUM: 24,
      LOW: 72,
    };

    const limitHours = slaLimits[ticket.priority] || 24;
    const slaDeadline = ticket.dueAt
      ? new Date(ticket.dueAt)
      : new Date(ticket.createdAt.getTime() + limitHours * 60 * 60 * 1000);

    let slaStatus: 'WITHIN_SLA' | 'BREACHED' = 'WITHIN_SLA';
    const resolveTime = ticket.resolvedAt || new Date();

    if (resolveTime.getTime() > slaDeadline.getTime()) {
      slaStatus = 'BREACHED';
    }

    const result = {
      id: ticket.id,
      ticketNo: ticket.ticketNo,
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority,
      status: ticket.status,
      clientId: ticket.clientId,
      assetId: ticket.assetId,
      vmId: ticket.vmId,
      assigneeId: ticket.assigneeId,
      creatorId: ticket.creatorId,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      resolvedAt: ticket.resolvedAt,
      dueAt: ticket.dueAt,
      client: ticket.client as unknown,
      assignee: ticket.assignee as unknown,
      creator: ticket.creator as unknown,
      asset: ticket.asset as unknown,
      vm: ticket.vm as unknown,
      comments: ticket.comments as unknown,
      slaDeadline,
      slaStatus,
      slaLimitHours: limitHours,
    };

    return result;
  }

  async create(createTicketDto: CreateTicketDto, creatorId: string) {
    const { clientName, ...ticketData } = createTicketDto;

    // Find or create client
    const client = await this.clientsService.findOrCreateByName(clientName);

    const ticketNo = await this.generateTicketNo();

    const slaLimits: Record<TicketPriority, number> = {
      CRITICAL: 4,
      HIGH: 12,
      MEDIUM: 24,
      LOW: 72,
    };
    const limitHours =
      slaLimits[createTicketDto.priority || TicketPriority.MEDIUM] || 24;
    const dueAt = new Date(Date.now() + limitHours * 60 * 60 * 1000);

    const ticket = await this.prisma.ticket.create({
      data: {
        ...ticketData,
        ticketNo,
        clientId: client.id,
        creatorId,
        dueAt,
      },
      include: {
        client: true,
        assignee: {
          select: { id: true, displayName: true },
        },
        creator: {
          select: { id: true, displayName: true },
        },
        asset: {
          select: { id: true, name: true, type: true },
        },
        vm: {
          select: { id: true, name: true },
        },
      },
    });

    // Notify Line
    await this.notificationsService.notifyNewTicket(
      ticket.ticketNo,
      ticket.title,
      ticket.client.name,
    );

    // Create Audit Log
    await this.prisma.auditLog.create({
      data: {
        userId: creatorId,
        action: AuditAction.CREATE_TICKET,
        targetId: ticket.id,
        details: `Created ticket ${ticket.ticketNo}: ${ticket.title}`,
      },
    });

    return this.withSla(ticket);
  }

  async findAll() {
    const tickets = await this.prisma.ticket.findMany({
      include: {
        client: true,
        assignee: {
          select: { id: true, displayName: true },
        },
        creator: {
          select: { id: true, displayName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return tickets.map((ticket) => this.withSla(ticket));
  }

  async findOne(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        client: true,
        assignee: {
          select: { id: true, displayName: true },
        },
        creator: {
          select: { id: true, displayName: true },
        },
        asset: {
          select: { id: true, name: true, type: true },
        },
        vm: {
          select: { id: true, name: true },
        },
        comments: {
          include: {
            user: {
              select: { id: true, displayName: true, avatarSeed: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    return this.withSla(ticket);
  }

  async update(id: string, updateTicketDto: UpdateTicketDto, userId: string) {
    const { clientName, ...ticketData } = updateTicketDto;
    let clientId: string | undefined;
    if (clientName) {
      const client = await this.clientsService.findOrCreateByName(clientName);
      clientId = client.id;
    }

    const data: Prisma.TicketUpdateInput = {
      ...ticketData,
    };
    if (clientId) {
      data.client = { connect: { id: clientId } };
    }

    // Set resolvedAt if status changes to RESOLVED
    if (updateTicketDto.status === TicketStatus.RESOLVED) {
      data.resolvedAt = new Date();
    }

    // Update dueAt if priority changes
    if (updateTicketDto.priority) {
      const slaLimits: Record<TicketPriority, number> = {
        CRITICAL: 4,
        HIGH: 12,
        MEDIUM: 24,
        LOW: 72,
      };
      const existing = await this.prisma.ticket.findUnique({
        where: { id },
        select: { createdAt: true },
      });
      if (existing) {
        const limitHours = slaLimits[updateTicketDto.priority] || 24;
        data.dueAt = new Date(
          existing.createdAt.getTime() + limitHours * 60 * 60 * 1000,
        );
      }
    }

    const updated = await this.prisma.ticket.update({
      where: { id },
      data,
      include: {
        client: true,
        assignee: {
          select: { id: true, displayName: true },
        },
        creator: {
          select: { id: true, displayName: true },
        },
        asset: {
          select: { id: true, name: true, type: true },
        },
        vm: {
          select: { id: true, name: true },
        },
      },
    });

    // Notify if Assigned
    if (updateTicketDto.assigneeId && updated.assignee) {
      await this.notificationsService.notifyTicketAssigned(
        updated.ticketNo,
        updated.title,
        updated.assignee.displayName,
      );
    }

    // Notify if Resolved
    if (updateTicketDto.status === TicketStatus.RESOLVED) {
      await this.notificationsService.notifyTicketResolved(
        updated.ticketNo,
        updated.title,
      );
    }

    // Create Audit Log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action:
          updateTicketDto.status === TicketStatus.CLOSED
            ? AuditAction.CLOSE_TICKET
            : AuditAction.UPDATE_TICKET,
        targetId: id,
        details: `Updated ticket ${updated.ticketNo}: status=${updated.status}, assignee=${updated.assigneeId || 'None'}`,
      },
    });

    return this.withSla(updated);
  }

  async remove(id: string, userId: string) {
    const ticket = await this.findOne(id);
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }
    const deleted = await this.prisma.ticket.delete({
      where: { id },
    });

    // Create Audit Log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.UPDATE_TICKET,
        targetId: id,
        details: `Deleted ticket ${ticket.ticketNo}: ${ticket.title}`,
      },
    });

    return deleted;
  }
}
