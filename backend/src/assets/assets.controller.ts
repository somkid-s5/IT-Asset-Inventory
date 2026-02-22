import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/assets')
export class AssetsController {
    constructor(private readonly assetsService: AssetsService) { }

    @Roles('ADMIN', 'EDITOR')
    @Post()
    create(@Body() createAssetDto: CreateAssetDto, @Request() req: any) {
        return this.assetsService.create(createAssetDto, req.user.id);
    }

    @Get()
    findAll() {
        return this.assetsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.assetsService.findOne(id);
    }

    @Roles('ADMIN', 'EDITOR')
    @Patch(':id')
    update(@Param('id') id: string, @Body() updateAssetDto: UpdateAssetDto) {
        return this.assetsService.update(id, updateAssetDto);
    }

    @Roles('ADMIN')
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.assetsService.remove(id);
    }
}
