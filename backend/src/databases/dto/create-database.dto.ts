import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

class DatabaseAccountDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  role: string;

  @IsString()
  password: string;

  @IsArray()
  @IsString({ each: true })
  privileges: string[];

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateDatabaseDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  engine: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsString()
  environment?: string;

  @IsString()
  @IsNotEmpty()
  host: string;

  @IsString()
  @IsNotEmpty()
  ipAddress: string;

  @IsOptional()
  @IsString()
  port?: string;

  @IsOptional()
  @IsString()
  serviceName?: string;

  @IsOptional()
  @IsString()
  owner?: string;

  @IsOptional()
  @IsString()
  backupPolicy?: string;

  @IsOptional()
  @IsString()
  replication?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  linkedApps?: string[];

  @IsOptional()
  @IsString()
  maintenanceWindow?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => DatabaseAccountDto)
  accounts: DatabaseAccountDto[];
}
