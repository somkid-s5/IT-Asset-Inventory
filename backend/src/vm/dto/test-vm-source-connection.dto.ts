import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TestVmSourceConnectionDto {
  @IsString()
  @IsNotEmpty()
  endpoint: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;
}
