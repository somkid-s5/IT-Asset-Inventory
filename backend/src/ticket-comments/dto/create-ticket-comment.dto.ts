import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateTicketCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsString()
  commentType?: string;
}
