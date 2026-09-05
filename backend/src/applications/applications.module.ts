import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CredentialsModule } from '../credentials/credentials.module';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';

@Module({
  imports: [PrismaModule, CredentialsModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
})
export class ApplicationsModule {}
