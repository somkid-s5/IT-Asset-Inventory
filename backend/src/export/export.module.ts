import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InventoryExportController } from './inventory-export.controller';
import { InventoryExportService } from './inventory-export.service';

@Module({
  imports: [PrismaModule],
  controllers: [InventoryExportController],
  providers: [InventoryExportService],
})
export class ExportModule {}
