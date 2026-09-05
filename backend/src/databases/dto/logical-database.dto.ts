import { IsArray, IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class LogicalDatabaseDto {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) componentIds?: string[];
}
