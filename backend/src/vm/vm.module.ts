import { Module } from '@nestjs/common';
import { CredentialsModule } from '../credentials/credentials.module';
import { PrismaModule } from '../prisma/prisma.module';
import { VmController } from './vm.controller';
import { VmService } from './vm.service';

@Module({
  imports: [PrismaModule, CredentialsModule],
  controllers: [VmController],
  providers: [VmService],
})
export class VmModule {}
