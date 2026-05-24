import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TicketCommentsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

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
      include: {
        creator: { select: { displayName: true } },
      },
    });
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }

    const comment = await this.prisma.ticketComment.create({
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

    // Notify if not a system message
    if (!isSystem) {
      this.notificationsService
        .notifyNewComment(
          ticket.ticketNo,
          ticket.title,
          comment.user?.displayName || 'Unknown',
          content,
        )
        .catch((err) =>
          console.error('Failed to send comment notification:', err),
        );
    }

    return comment;
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
      throw new ForbiddenException(
        'You are not authorized to delete this comment',
      );
    }

    return this.prisma.ticketComment.delete({
      where: { id },
    });
  }
}
