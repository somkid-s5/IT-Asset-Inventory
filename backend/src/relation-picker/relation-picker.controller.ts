import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RelationPickerService } from './relation-picker.service';
import { RelationPickerQueryDto } from './dto/relation-picker-query.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/relation-options')
export class RelationPickerController {
  constructor(private readonly relationPicker: RelationPickerService) {}

  @Get()
  search(@Query() query: RelationPickerQueryDto) {
    return this.relationPicker.search(query);
  }
}
