import { IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  avatarSeed?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  avatarImage?: string | null;
}
