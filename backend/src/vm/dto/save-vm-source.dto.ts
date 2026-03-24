import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SaveVmSourceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  endpoint: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsString()
  @IsNotEmpty()
  syncInterval: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
