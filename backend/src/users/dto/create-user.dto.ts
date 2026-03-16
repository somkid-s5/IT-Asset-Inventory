import { Role } from '@prisma/client';
import { IsEnum, IsString, Matches, MinLength } from 'class-validator';
import { PASSWORD_POLICY_MESSAGE, PASSWORD_POLICY_REGEX } from '../../auth/password-policy';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  username: string;

  @IsString()
  @MinLength(2)
  displayName: string;

  @IsString()
  @Matches(PASSWORD_POLICY_REGEX, { message: PASSWORD_POLICY_MESSAGE })
  password: string;

  @IsEnum(Role)
  role: Role;
}
