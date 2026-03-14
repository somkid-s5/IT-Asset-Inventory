import { Module } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';

import { PrismaModule } from '../prisma/prisma.module';
import { CredentialsModule } from '../credentials/credentials.module';

@Module({
  imports: [PrismaModule, CredentialsModule],
  providers: [AssetsService],
  controllers: [AssetsController]
})
export class AssetsModule { }
