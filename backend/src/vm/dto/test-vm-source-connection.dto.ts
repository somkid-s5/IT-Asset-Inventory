import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class TestVmSourceConnectionDto {
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
}
