import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Injectable()
export class AssetNotesService {
    constructor(private prisma: PrismaService) {}

    async createNote(assetId: string, dto: CreateNoteDto, userId: string) {
        // Verify asset exists
        const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
        if (!asset) throw new NotFoundException(`Asset ${assetId} not found`);

        return this.prisma.assetNote.create({
            data: {
                assetId,
                content: dto.content,
                isPinned: dto.isPinned ?? false,
                createdByUserId: userId,
            },
            include: {
                createdByUser: { select: { id: true, displayName: true, avatarSeed: true } },
            },
        });
    }

    async findAllNotes(assetId: string) {
        // Pinned notes first, then by newest
        return this.prisma.assetNote.findMany({
            where: { assetId },
            include: {
                createdByUser: { select: { id: true, displayName: true, avatarSeed: true } },
            },
            orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        });
    }

    async updateNote(assetId: string, noteId: string, dto: UpdateNoteDto, userId: string, userRole: string) {
        const note = await this.prisma.assetNote.findUnique({ where: { id: noteId } });
        if (!note || note.assetId !== assetId) throw new NotFoundException('Note not found');

        // Only author or ADMIN can edit content; anyone with EDITOR+ can toggle pin
        if (dto.content !== undefined && note.createdByUserId !== userId && userRole !== 'ADMIN') {
            throw new ForbiddenException('Only the author or an admin can edit note content');
        }

        return this.prisma.assetNote.update({
            where: { id: noteId },
            data: {
                ...(dto.content !== undefined ? { content: dto.content } : {}),
                ...(dto.isPinned !== undefined ? { isPinned: dto.isPinned } : {}),
            },
            include: {
                createdByUser: { select: { id: true, displayName: true, avatarSeed: true } },
            },
        });
    }

    async deleteNote(assetId: string, noteId: string, userId: string, userRole: string) {
        const note = await this.prisma.assetNote.findUnique({ where: { id: noteId } });
        if (!note || note.assetId !== assetId) throw new NotFoundException('Note not found');

        if (note.createdByUserId !== userId && userRole !== 'ADMIN') {
            throw new ForbiddenException('Only the author or an admin can delete this note');
        }

        return this.prisma.assetNote.delete({ where: { id: noteId } });
    }
}
