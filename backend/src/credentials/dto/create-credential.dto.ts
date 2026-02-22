import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateCredentialDto {
    @IsUUID()
    @IsNotEmpty()
    assetId: string;

    @IsString()
    @IsNotEmpty()
    username: string;

    @IsString()
    @IsNotEmpty()
    password: string;
}
