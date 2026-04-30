import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { AssetNotesService } from './asset-notes.service';
import { AssetNotesController } from './asset-notes.controller';
import { AssetAttachmentsService } from './asset-attachments.service';
import { AssetAttachmentsController } from './asset-attachments.controller';

import { PrismaModule } from '../prisma/prisma.module';
import { CredentialsModule } from '../credentials/credentials.module';

@Module({
  imports: [PrismaModule, CredentialsModule, MulterModule.register({})],
  providers: [AssetsService, AssetNotesService, AssetAttachmentsService],
  controllers: [
    AssetsController,
    AssetNotesController,
    AssetAttachmentsController,
  ],
})
export class AssetsModule {}
