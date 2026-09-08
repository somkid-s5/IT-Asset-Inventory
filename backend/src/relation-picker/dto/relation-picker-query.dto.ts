import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum RelationPickerResourceKind {
  APPLICATIONS = 'applications',
  ASSETS = 'assets',
  VMS = 'vms',
  DATABASES = 'databases',
  LOGICAL_DATABASES = 'logical-databases',
}

export enum RelationPickerLifecycleFilter {
  ELIGIBLE = 'eligible',
  ALL = 'all',
  ARCHIVED = 'archived',
}

function splitSelectedIds(value: unknown): unknown {
  if (Array.isArray(value))
    return value.flatMap((item) => splitSelectedIds(item));
  if (typeof value !== 'string') return value;
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export class RelationPickerQueryDto {
  @IsEnum(RelationPickerResourceKind)
  kind!: RelationPickerResourceKind;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsString()
  @IsIn(['PROD', 'UAT', 'TEST'])
  environment?: string;

  @IsOptional()
  @IsEnum(RelationPickerLifecycleFilter)
  lifecycle?: RelationPickerLifecycleFilter;

  @IsOptional()
  @Transform(({ value }) => splitSelectedIds(value))
  @IsArray()
  @IsString({ each: true })
  selectedIds?: string[];
}
