import { IsString, MinLength } from 'class-validator';

export class InventoryExportDto {
  @IsString()
  @MinLength(8)
  passphrase: string;

  @IsString()
  @MinLength(1)
  currentPassword: string;
}
