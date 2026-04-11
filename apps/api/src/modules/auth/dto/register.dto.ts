import { IsEmail, IsString, MinLength, IsIn } from 'class-validator';

export class RegisterDto {
  @IsString() @MinLength(2) name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  @IsIn(['USER', 'DEVELOPER']) role: 'USER' | 'DEVELOPER';
}
