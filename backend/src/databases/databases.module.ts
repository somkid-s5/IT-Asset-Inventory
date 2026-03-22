import { Module } from '@nestjs/common';
import { CredentialsModule } from '../credentials/credentials.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DatabasesController } from './databases.controller';
import { DatabasesService } from './databases.service';

@Module({
  imports: [PrismaModule, CredentialsModule],
  controllers: [DatabasesController],
  providers: [DatabasesService],
})
export class DatabasesModule {}
