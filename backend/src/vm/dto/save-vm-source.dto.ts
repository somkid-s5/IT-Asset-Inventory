import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
} from 'class-validator';

export class SaveVmSourceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsUrl({ protocols: ['https'], require_protocol: false })
  endpoint: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([1-9]\d{0,3}|1[0-3]\d{3}|1440)\s*(min|mins|minute|minutes)$/i, {
    message: 'syncInterval must be between 1 and 1440 minutes.',
  })
  syncInterval: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
