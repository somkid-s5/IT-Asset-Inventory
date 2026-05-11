import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketCommentDto } from './dto/create-ticket-comment.dto';

@Injectable()
export class TicketCommentsService {
  constructor(private prisma: PrismaService) {}

  async create(
    ticketId: string,
    userId: string,
    content: string,
    commentType = 'GENERAL',
    isSystem = false,
  ) {
    // Check if ticket exists
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }

    return this.prisma.ticketComment.create({
      data: {
        ticketId,
        userId,
        content,
        commentType,
        isSystem,
      },
      include: {
        user: {
          select: { id: true, displayName: true, avatarSeed: true },
        },
      },
    });
  }

  async findAllForTicket(ticketId: string) {
    return this.prisma.ticketComment.findMany({
      where: { ticketId },
      include: {
        user: {
          select: { id: true, displayName: true, avatarSeed: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async remove(id: string, userId: string) {
    const comment = await this.prisma.ticketComment.findUnique({
      where: { id },
    });
    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }
    // Only author can delete
    if (comment.userId !== userId) {
      throw new Error('You are not authorized to delete this comment');
    }

    return this.prisma.ticketComment.delete({
      where: { id },
    });
  }
}
