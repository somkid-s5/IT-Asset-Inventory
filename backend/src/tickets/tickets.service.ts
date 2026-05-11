import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { ClientsService } from '../clients/clients.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TicketStatus, Prisma } from '@prisma/client';

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

  async create(createTicketDto: CreateTicketDto, creatorId: string) {
    const { clientName, ...ticketData } = createTicketDto;

    // Find or create client
    const client = await this.clientsService.findOrCreateByName(clientName);

    const ticketNo = await this.generateTicketNo();

    const ticket = await this.prisma.ticket.create({
      data: {
        ...ticketData,
        ticketNo,
        clientId: client.id,
        creatorId,
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
      },
    });

    // Notify Line
    await this.notificationsService.notifyNewTicket(
      ticket.ticketNo,
      ticket.title,
      ticket.client.name,
    );

    return ticket;
  }

  async findAll() {
    return this.prisma.ticket.findMany({
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

    return ticket;
  }

  async update(id: string, updateTicketDto: UpdateTicketDto) {
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

    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.ticket.delete({
      where: { id },
    });
  }
}
