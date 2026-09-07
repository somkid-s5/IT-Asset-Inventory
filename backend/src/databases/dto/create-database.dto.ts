import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsIP,
  IsPort,
  IsString,
  ValidateNested,
} from 'class-validator';
import { DatabaseAccountScope, DatabaseStatus } from '@prisma/client';

class DatabaseAccountDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  role: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsArray()
  @IsString({ each: true })
  privileges: string[];

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsEnum(DatabaseAccountScope)
  scope?: DatabaseAccountScope;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  logicalDatabaseIds?: string[];
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

  @IsOptional()
  @IsString()
  host?: string;

  @IsOptional()
  @IsString()
  @IsIP()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  @IsPort()
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
  @IsEnum(DatabaseStatus)
  status?: DatabaseStatus;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DatabaseAccountDto)
  accounts?: DatabaseAccountDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  logicalDatabases?: string[];

  @IsOptional()
  @IsString()
  hostAssetId?: string;

  @IsOptional()
  @IsString()
  hostVmId?: string;

  @IsOptional()
  @IsString()
  responsibleParty?: string;
}
