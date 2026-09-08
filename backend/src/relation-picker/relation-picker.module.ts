import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RelationPickerController } from './relation-picker.controller';
import { RelationPickerService } from './relation-picker.service';

@Module({
  imports: [PrismaModule],
  controllers: [RelationPickerController],
  providers: [RelationPickerService],
})
export class RelationPickerModule {}
