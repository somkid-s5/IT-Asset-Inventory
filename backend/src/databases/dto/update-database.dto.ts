import { PartialType } from '@nestjs/mapped-types';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { CreateDatabaseDto } from './create-database.dto';

export class UpdateDatabaseDto extends PartialType(CreateDatabaseDto) {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  removedAccountIds?: string[];
}
