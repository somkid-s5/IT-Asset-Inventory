import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { CredentialsService } from './credentials.service';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { UpdateCredentialDto } from './dto/update-credential.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/credentials')
export class CredentialsController {
    constructor(private readonly credentialsService: CredentialsService) { }

    @Roles('ADMIN', 'EDITOR')
    @Post()
    create(@Body() createCredentialDto: CreateCredentialDto) {
        return this.credentialsService.create(createCredentialDto);
    }

    @Get('asset/:assetId')
    findByAsset(@Param('assetId') assetId: string) {
        return this.credentialsService.findByAsset(assetId);
    }

    // Only Admin/Editor can view actual passwords. Viewer can only list them.
    @Roles('ADMIN', 'EDITOR')
    @Get(':id/reveal')
    revealPassword(@Param('id') id: string, @Request() req: any) {
        return this.credentialsService.revealPassword(id, req.user.id);
    }

    @Roles('ADMIN', 'EDITOR')
    @Patch(':id')
    update(@Param('id') id: string, @Body() updateCredentialDto: UpdateCredentialDto) {
        return this.credentialsService.update(id, updateCredentialDto);
    }

    @Roles('ADMIN')
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.credentialsService.remove(id);
    }
}
