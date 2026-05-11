import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TicketCommentsService } from './ticket-comments.service';
import { CreateTicketCommentDto } from './dto/create-ticket-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('api/tickets/:ticketId/comments')
export class TicketCommentsController {
  constructor(private readonly ticketCommentsService: TicketCommentsService) {}

  @Post()
  create(
    @Param('ticketId') ticketId: string,
    @Body() createTicketCommentDto: CreateTicketCommentDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.ticketCommentsService.create(
      ticketId,
      req.user.id,
      createTicketCommentDto.content,
      createTicketCommentDto.commentType || 'GENERAL',
    );
  }

  @Get()
  findAll(@Param('ticketId') ticketId: string) {
    return this.ticketCommentsService.findAllForTicket(ticketId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    return this.ticketCommentsService.remove(id, req.user.id);
  }
}
