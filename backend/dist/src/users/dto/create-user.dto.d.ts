import { Role } from '@prisma/client';
export declare class CreateUserDto {
    username: string;
    displayName: string;
    password: string;
    role: Role;
}
