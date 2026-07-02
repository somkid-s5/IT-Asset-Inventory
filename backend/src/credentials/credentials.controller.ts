import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CredentialsService } from './credentials.service';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { UpdateCredentialDto } from './dto/update-credential.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/credentials')
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) {}

  @Roles(Role.ADMIN, Role.EDITOR)
  @Post()
  create(
    @Body() createCredentialDto: CreateCredentialDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.credentialsService.create(createCredentialDto, req.user.id);
  }

  // Any authenticated user can list credential metadata for an asset —
  // encryptedPassword is NOT selected in the service (no password leak).
  @Get('asset/:assetId')
  findByAsset(@Param('assetId') assetId: string) {
    return this.credentialsService.findByAsset(assetId);
  }

  // Only Admin/Editor can view actual passwords. Viewer can only list them.
  @Roles(Role.ADMIN, Role.EDITOR)
  @Get(':id/reveal')
  revealPassword(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.credentialsService.revealPassword(id, req.user.id);
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCredentialDto: UpdateCredentialDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.credentialsService.update(id, updateCredentialDto, req.user.id);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    return this.credentialsService.remove(id, req.user.id);
  }
}
