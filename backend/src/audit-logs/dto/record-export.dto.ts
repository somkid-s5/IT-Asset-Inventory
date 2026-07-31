import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class RecordExportDto {
  @IsString()
  @IsNotEmpty()
  resource: string;

  @IsInt()
  @Min(0)
  count: number;

  @IsOptional()
  @IsString()
  query?: string;
}
