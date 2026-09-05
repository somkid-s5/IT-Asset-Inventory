import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InventoryExportController } from './inventory-export.controller';
import { InventoryExportService } from './inventory-export.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [InventoryExportController],
  providers: [InventoryExportService],
})
export class ExportModule {}
