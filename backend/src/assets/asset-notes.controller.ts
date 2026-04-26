import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AssetNotesService } from './asset-notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

interface AuthRequest {
    user: { id: string; role: string };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/assets/:assetId/notes')
export class AssetNotesController {
    constructor(private readonly assetNotesService: AssetNotesService) {}

    @Roles(Role.ADMIN, Role.EDITOR)
    @Post()
    create(
        @Param('assetId') assetId: string,
        @Body() dto: CreateNoteDto,
        @Request() req: AuthRequest,
    ) {
        return this.assetNotesService.createNote(assetId, dto, req.user.id);
    }

    @Get()
    findAll(@Param('assetId') assetId: string) {
        return this.assetNotesService.findAllNotes(assetId);
    }

    @Roles(Role.ADMIN, Role.EDITOR)
    @Patch(':noteId')
    update(
        @Param('assetId') assetId: string,
        @Param('noteId') noteId: string,
        @Body() dto: UpdateNoteDto,
        @Request() req: AuthRequest,
    ) {
        return this.assetNotesService.updateNote(assetId, noteId, dto, req.user.id, req.user.role);
    }

    @Roles(Role.ADMIN, Role.EDITOR)
    @Delete(':noteId')
    remove(
        @Param('assetId') assetId: string,
        @Param('noteId') noteId: string,
        @Request() req: AuthRequest,
    ) {
        return this.assetNotesService.deleteNote(assetId, noteId, req.user.id, req.user.role);
    }
}
