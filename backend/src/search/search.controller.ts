import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SearchService } from './search.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/search')
export class SearchController {
  constructor(private readonly service: SearchService) {}
  @Get() search(@Query('q') q = '') {
    return this.service.search(q);
  }
}
