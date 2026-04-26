import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateNoteDto {
    @IsString()
    @IsNotEmpty()
    content: string;

    @IsBoolean()
    @IsOptional()
    isPinned?: boolean;
}
