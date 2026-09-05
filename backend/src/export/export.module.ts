import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InventoryExportController } from './inventory-export.controller';
import { InventoryExportService } from './inventory-export.service';
import { AuthModule } from '../auth/auth.module';
import { CredentialsModule } from '../credentials/credentials.module';

@Module({
  imports: [PrismaModule, AuthModule, CredentialsModule],
  controllers: [InventoryExportController],
  providers: [InventoryExportService],
})
export class ExportModule {}
